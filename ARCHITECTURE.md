# Architecture

Chronicle is a single Next.js application. The UI and every API route ship in
one deployable; the only external services are Postgres and the Gemini API.

---

## System

```mermaid
flowchart TB
    subgraph Clients
        WEB["Web app<br/>Next.js App Router"]
        TG["Telegram<br/>@ChronicleSupportBot"]
        PUB["Public profile<br/>/p/handle"]
    end

    subgraph App["Next.js server (one deployable)"]
        MW["middleware<br/>session gate"]
        API["API routes<br/>ingest · search · chat · fit · profile · telegram"]
        LIB["lib<br/>extract · relate · search · fit · store"]
    end

    subgraph External
        GEM["Gemini 2.5 Flash<br/>+ gemini-embedding-001"]
        PG[("Postgres + pgvector<br/>HNSW cosine index")]
    end

    WEB --> MW --> API
    TG -- webhook --> API
    PUB --> API
    API --> LIB
    LIB --> GEM
    LIB --> PG
```

---

## Ingestion pipeline

One upload becomes an understood, embedded, connected record.

```mermaid
flowchart LR
    F["PDF · image · DOCX · URL"] --> E{native format?}
    E -- "PDF / image" --> G1["Gemini reads bytes directly<br/>no OCR step"]
    E -- "DOCX / text" --> T["decode locally"] --> G1
    G1 --> S["Structured extraction<br/>title · category · date · org<br/>skills · highlights"]
    S --> EM["Embed 768-d<br/>RETRIEVAL_DOCUMENT"]
    EM --> DUP{"nearest neighbour<br/>≥ 0.93?"}
    DUP -- yes --> FLAG["flag as duplicate<br/>still saved"]
    DUP -- no --> INS
    FLAG --> INS["INSERT item + file bytes"]
    INS --> REL["Relationship engine"]
```

The duplicate check runs **before** the insert — afterwards the new row would be
its own nearest neighbour.

---

## Relationship engine

Two passes, because the two kinds of connection have different epistemics.

```mermaid
flowchart TB
    NEW["new record"] --> P1["Pass 1 — provable<br/>shared skill (GIN index)<br/>or shared organisation"]
    NEW --> P2["Pass 2 — semantic<br/>HNSW neighbours ≥ 0.62<br/>excluding pass-1 pairs"]
    P1 --> EDGE1["edge with a reason<br/>no model call"]
    P2 --> JUDGE["Gemini labels the relationship<br/>proves · applies · led-to · continues"]
    JUDGE --> FILTER["drop confidence &lt; 0.45"]
    FILTER --> EDGE2["labelled edge"]
    EDGE1 --> STORE[("relations")]
    EDGE2 --> STORE
```

Pass 1 costs nothing and cannot be wrong. Pass 2 is where the interesting links
live — a project that grew out of a course, an internship that followed a
certification — and it is the only part that needs a model.

Candidates come from `relationCandidates()`, which unions skill/org overlap with
vector neighbours **for that user only**. The whole table is never loaded.

---

## Retrieval

```mermaid
flowchart TB
    Q["'my latest resume'"] --> I["Gemini → intent<br/>categories · org · dates · wantsLatest<br/>+ semanticQuery"]
    I --> V["embed semanticQuery<br/>RETRIEVAL_QUERY"]
    V --> SQL["ONE SQL statement:<br/>user_id filter + intent filters<br/>ORDER BY embedding &lt;=&gt; query"]
    SQL --> OVER["over-fetch 3×"]
    OVER --> RANK["+ lexical boost (capped)<br/>+ category / skill boost"]
    RANK --> SORT{"wantsLatest?"}
    SORT -- yes --> DATE["sort by date, relevance as tiebreak"]
    SORT -- no --> SCORE["sort by score"]
    DATE --> ANS["Gemini writes one sentence"]
    SCORE --> ANS
```

Structured filters and vector ranking run in the **same statement**, so Postgres
narrows before ranking rather than after.

---

## Opportunity Fit

The most involved pipeline, and the one that justifies the graph existing.

```mermaid
flowchart TB
    JD["job posting<br/>pasted or uploaded"] --> X{"uploaded?"}
    X -- yes --> TXT["extractPlainText<br/>in memory · never stored"]
    X -- no --> REQ
    TXT --> REQ["Gemini → ≤12 atomic requirements<br/>tagged must / nice"]
    REQ --> EMB["embed EACH requirement<br/>one batched call"]
    EMB --> SEARCH["vector search per requirement<br/>top 4, similarity ≥ 0.35"]
    SEARCH --> JUDGE["Gemini judges each requirement<br/>against ONLY its shortlist"]
    JUDGE --> VERIFY["drop citations outside the shortlist<br/>met requires ≥1 surviving citation"]
    VERIFY --> SCORE["weighted score<br/>must-have = 3× nice-to-have"]
    SCORE --> OUT["report: evidence · gaps · optional résumé"]
```

Two decisions carry this feature:

**Retrieval-first.** Each requirement is embedded and matched separately, so the
model only ever sees records that are already plausibly relevant. Token cost
scales with the number of requirements, not the size of the Chronicle.

**Citation verification.** Any record id the model returns that was not in that
requirement's shortlist is discarded, and `met` requires at least one surviving
citation. The value of the feature is that the evidence is real, so it is
enforced in code rather than requested in a prompt.

---

## Data model

```mermaid
erDiagram
    users ||--o{ items : owns
    users ||--o{ files : owns
    users ||--o{ relations : owns
    users ||--o{ telegram_link_codes : issues
    items }o--|| files : "original (optional)"
    items ||--o{ relations : "from / to"

    users {
        text id PK
        text email UK
        text handle UK "public profile"
        bool profile_public
        bigint telegram_chat_id UK
    }
    items {
        text id PK
        text user_id FK
        text category
        text date "text: '2023' keeps its imprecision"
        text[] skills "GIN indexed"
        vector embedding "768d, HNSW cosine"
        bool hidden "excluded from public profile"
    }
    files {
        text id PK
        text user_id FK
        bytea bytes "original, byte-for-byte"
    }
    relations {
        text id PK
        text user_id FK
        text kind "proves · applies · led-to"
        real weight
        text reason
    }
```

**`date` is `text`, not `date`.** A certificate may assert only "2023"; coercing
that to `2023-01-01` would invent precision the source never had.

**Files live in Postgres as `bytea`** so one `DATABASE_URL` is the entire setup
and originals survive an ephemeral filesystem.

---

## Multi-tenancy

Every function in `store.ts` takes `userId` as its **first required argument**,
and every statement filters on it. There is deliberately no unscoped read — a
caller cannot fetch another account's records because no such function exists,
and adding a query that forgets the owner is a compile error.

Ownership is checked in the `WHERE` clause rather than in JavaScript after
fetching, so a guessed id returns nothing instead of returning data that then
has to be filtered.

Verified with a suite that asserts, against real Postgres, that user A cannot
read, search, delete or vector-match user B's records — including querying A's
Chronicle with B's *exact* embedding.

---

## Request boundaries

| Surface | Auth | Notes |
|---|---|---|
| `/`, `/login` | none | marketing + sign-in |
| `/p/<handle>` | none | metadata only; explicit column list, no files |
| `/api/public/<handle>` | none | 404 unless `profile_public` |
| everything else | session required | middleware redirects, routes re-check |
| `/api/telegram/webhook` | secret header | chat resolves to exactly one account |

Middleware is **not** the authorisation boundary — every API route calls
`requireUser()` independently. Middleware only spares signed-out visitors a
flash of empty UI. That separation is what kept data safe during the Next.js
middleware-bypass CVE (patched in 15.5.20).

---

## Failure behaviour

Each layer degrades on its own rather than taking the app down.

| Failure | Result |
|---|---|
| No Gemini key | Lexical ranking still returns records; the bot says so once |
| Embedding call fails | Query falls back to the full table |
| Answer generation fails | A deterministic summary line is used |
| Relationship labelling fails | Edges persist unlabelled rather than being lost |
| Telegram send fails | Reported in chat; webhook still returns 200 so Telegram does not retry the whole search |
