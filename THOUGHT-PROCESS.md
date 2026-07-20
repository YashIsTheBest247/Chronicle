# Thought process

How Chronicle was reasoned about, what was rejected, what was got wrong, and
how each claim was checked.

---

## 1. Reading the problem

The brief asks for a system that *organises, categorises, connects and
retrieves* a student's scattered records. The trap is that all four are easy to
fake:

- **Organisation** looks solved by a folder tree with AI-sounding labels.
- **Categorisation** looks solved by keyword rules.
- **Connection** looks solved by drawing lines between anything sharing a tag.
- **Retrieval** looks solved by substring search over filenames.

Each would demo fine and be useless the day after. So the working definition
became: *would this still be useful in three years, on documents nobody
remembers uploading?* That question drove most of what follows.

The success metric — **"I never have to search through folders again"** — is a
retrieval claim. Retrieval got the most design attention.

---

## 2. Decisions, and what was rejected

### Storage: Postgres + pgvector, not a JSON index

The first version stored records in a JSON file with cosine similarity computed
in JavaScript. Adequate for a demo, wrong as an answer: it does not survive a
serverless filesystem, does not scale past a few hundred records, and does not
demonstrate the vector-database competence the brief explicitly looks for.

Moving to pgvector with an **HNSW cosine index** meant ranking happens in the
database, filters and vector search run in one statement, and Postgres narrows
before ranking rather than after.

**HNSW over IVFFlat** specifically: IVFFlat needs a training pass and behaves
badly on a nearly-empty table — which is exactly the state a new Chronicle is
in. HNSW is correct from the first row.

### Retrieval: hybrid, not pure RAG

Pure vector search is excellent at *"things about machine learning"* and bad at
*"my latest resume"*. The second is a **filter-and-sort question**, not a
similarity question — every résumé is semantically near every other résumé, so
similarity cannot pick the newest.

So the query is first parsed into structured intent (categories, organisation,
date range, a `wantsLatest` flag), those become SQL predicates, vectors rank
what survives, exact lexical hits get a **capped** boost, and `wantsLatest`
flips the primary sort to recency.

The cap matters: uncapped, a keyword-stuffed record would outrank genuine
semantic relevance.

### Relationships: two passes, because the epistemics differ

Two records sharing a skill or an issuer is a **fact**. Two records being
semantically adjacent is a **judgement**. Treating both the same way either
wastes model calls on arithmetic or dresses guesses up as facts.

Pass 1 is pure SQL — shared skills via a GIN index, shared organisation — and
produces edges with reasons a user can verify at a glance. No model call.
Pass 2 sends only the semantic neighbours above 0.62 to Gemini for labelling,
and drops anything under 0.45 confidence.

Candidates come from a union of skill overlap and vector neighbours **for that
user**. The whole table is never loaded.

### `date` is `text`, not `date`

A certificate may assert only "2023". Storing that as `2023-01-01` invents
precision the source never had, and the timeline would silently claim it
happened in January. Partial dates are kept as written, with a
`date_confidence` field recording how sure the extraction was.

### Files live in Postgres as `bytea`

Rejected: object storage. It would mean a second service, a second set of
credentials and a second failure mode, for a project where one `DATABASE_URL`
is the entire setup and originals must survive an ephemeral filesystem.

The tradeoff is honest: on a 500 MB free tier, storage is shared between records
and files. Vectors are ~3 KB each, so records are negligible; documents dominate.
Fine for hundreds of certificates, not for a video archive.

### Multi-tenancy enforced by the compiler

Every function in `store.ts` takes `userId` as its **first required argument**.
There is deliberately no unscoped read. When this was introduced, TypeScript
listed all 19 call sites that lacked an owner — so "forgot the auth check"
became a build error rather than a leak.

Ownership is checked in the `WHERE` clause, never in JavaScript after fetching:
a guessed id returns nothing, rather than returning data that then has to be
filtered correctly.

### Middleware is not the authorisation boundary

Middleware only spares signed-out visitors a flash of empty UI. Every API route
independently calls `requireUser()`. This felt like belt-and-braces until the
Next.js middleware-bypass CVE (`x-middleware-subrequest`) turned out to affect
the version in use — and because middleware was never the boundary, no data was
ever exposed. Verified by running the exploit against both versions.

### Opportunity Fit: retrieval-first, with verified citations

The feature that turns an archive into something worth opening twice: paste a
job posting, get a score with **your own records cited as evidence**.

Two decisions carry it.

**Each requirement is embedded and searched separately** rather than embedding
the whole posting. Matching is far more accurate, and token cost scales with
the number of requirements instead of the size of the Chronicle.

**Citations are verified in code.** Any record id the model returns that was not
in that requirement's shortlist is discarded, and `met` requires at least one
surviving citation. The entire value of the feature is that the evidence is
real, so that is enforced rather than requested in a prompt.

Scoring weights must-haves 3× nice-to-haves. A score that treats a missing
must-have like a missing bonus would flatter someone into wasting an afternoon
on the wrong application.

### Job descriptions are never stored

A posting is someone else's document and has no business in a personal archive.
The fit route imports `extractPlainText` — a function separate from the ingest
pipeline — so there is no reachable code path from it to `saveFile` or
`addItem`. Structural, not a promise.

### Degrade in layers

Every AI dependency has a floor:

| Failure | Behaviour |
|---|---|
| No Gemini key | Lexical ranking still returns records |
| Embedding fails | Falls back to the full table |
| Answer generation fails | Deterministic summary line |
| Relationship labelling fails | Edges persist unlabelled |

This was not theoretical: the Telegram bot originally refused to work without a
Gemini key, even though search already degraded gracefully. That guard was
removed once it was clear a rate-limited key mid-demo would otherwise take the
bot down entirely.

### Bilingual by retrieval, not by translation

`gemini-embedding-001` is multilingual, so a Hindi question already matches
English documents. Only the *phrasing* of answers is localised. No parallel
Hindi corpus, no translation step, and it works on documents the user never
translated.

---

## 3. What was got wrong

Every one of these was caught by testing, not by reading the code. They are
listed because the verification is the point.

**pgvector type mapped to the wrong OID.** The custom postgres.js type was bound
to OID 1184 — `timestamptz`. Vectors would have arrived as strings and
`cosine()` would have iterated over string *characters*, silently producing
garbage relationships. Removed in favour of explicit `embedding::text` casts.

**Schema ordering.** `user_id` indexes were created *before* the `ALTER TABLE`
that adds `user_id` to pre-auth tables, so migration failed on any existing
database. Now verified on both a fresh database and an idempotent re-run.

**`trustHost` missing.** Auth.js only auto-trusts the host on Vercel. On any
other host every sign-in would have failed with an opaque `UntrustedHost`. Found
because middleware silently swallowed the exception and served pages to
signed-out users.

**Tailwind tree-shook the category colours.** `@theme inline` removes variables
it cannot see used, and inline `style={{}}` is invisible to the scanner — so the
dashboard's distribution bars rendered colourless.

**A test that proved nothing.** The database preflight probed the cosine
operator with an all-zero vector. Cosine distance on zero magnitude is undefined,
so it returned `NaN` and printed a tick. It now uses real vectors and asserts
self-similarity is exactly 1.

**Measuring the wrong element.** The footer watermark was reported at "100%
width" by measuring the container, which is full-width by definition, not the
glyphs inside it. Rewritten as SVG with `textLength`, verified against the text
bounding box.

**A 20 MB upload limit on a 4.5 MB platform.** Vercel rejects larger bodies at
the edge, before any handler runs, so uploads would have failed with no useful
message. Both limits now read one variable so they cannot drift.

---

## 4. How it was verified

Nothing here is asserted from reading code.

- **Real Postgres.** A `pgvector/pgvector:pg16` container, with the schema applied and every query exercised through the actual application, not a mock.
- **Tenant isolation, 12 checks.** Two users with their own records and files. The strongest case queries user A's Chronicle with user B's *exact* embedding — cosine distance zero, a guaranteed top hit — and confirms only A's record returns.
- **Public profile privacy, 15 checks.** Asserts the payload and the rendered HTML contain no file bytes, no filenames, no source text, no hidden records, no edges to hidden records, and nothing from another account.
- **Telegram, 7 checks.** A stub standing in for `api.telegram.org`, driven with synthetic updates, inspecting the multipart body to confirm the real file bytes and filename were sent.
- **Responsive, 5 widths.** Headless Chromium at 360/390/768/1280/1920, detecting horizontal overflow, naming the offending element, and checking tap-target heights. Found four real tap targets under 32px.
- **Links, 14 checks.** Every anchor and route clicked, asserting the page actually scrolled and that sections land clear of the floating nav.

One incident worth recording: several verification runs were compromised because
stray `next dev` processes were rewriting `.next` underneath production builds,
serving pages with almost no stylesheet. Once found, everything was re-run
against a build known to be clean.

---

## 5. Known limitations

- **Free-tier storage.** Files in `bytea` share a 500 MB budget with records. Hundreds of certificates, not thousands.
- **Serverless upload cap.** 4 MB on Vercel, a platform limit rather than a design choice. Self-hosting raises it with one variable.
- **Speech recognition is Chromium-only.** The mic hides itself elsewhere; typing always works.
- **Hindi voice depends on the device.** With no Hindi voice installed, Hindi replies fall back to an English voice reading Devanagari.
- **Relationship labelling is an LLM judgement.** Pass 1 is provable; pass 2 is not, and is presented with a reason so a user can disagree.
- **No OCR fallback.** Scans rely on Gemini reading images. A genuinely illegible photo fails rather than degrading.

---

## 6. What comes next

In the order it would actually be built:

1. **Record-level confidence surfaced in the UI.** Extraction already tracks `dateConfidence`; the same idea should extend to skills and organisations, so a user can correct what the model was unsure about.
2. **Corrections that teach.** Editing an extracted field should persist as a preference, so re-uploads of similar documents inherit it.
3. **Graph clustering.** Community detection over `relations` would surface themes ("everything that led to the ML internship") without the user naming them.
4. **Timeline gaps.** The graph already knows when records stop. Surfacing "nothing recorded for eight months" is a small query and a genuinely useful nudge.
5. **Object storage behind the same interface.** `store.ts` isolates persistence to six functions; moving files out of Postgres is a contained change once storage matters.
6. **Evaluation set for retrieval.** A fixed set of questions with expected records, run on every change, so ranking tweaks stop being vibes.
