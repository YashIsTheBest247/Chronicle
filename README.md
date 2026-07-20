<div align="center">

# Chronicle

**An AI digital identity system for students.**

Certificates, projects, letters and transcripts scatter across folders for years.
Chronicle reads all of it, categorises it, connects it into one graph, and hands
any piece back the moment you ask — in English or Hindi, from the web, or from
Telegram.

[Live](https://chronicleai.vercel.app) · [Architecture](./ARCHITECTURE.md) · [Thought process](./THOUGHT-PROCESS.md)

</div>

---

## What it does

| Module | What happens |
|---|---|
| **1 · Ingestion** | PDFs, photos of certificates, DOCX, transcripts, portfolio links. Scans are read natively by Gemini — no OCR step to configure. |
| **2 · Categorisation** | Every upload is classified into Projects, Skills, Certifications, Internships, Achievements or Academics. You never file anything by hand. |
| **3 · Relationship engine** | A certification *proves* a skill; a skill is *applied in* a project; a project *led to* an internship. The graph assembles itself. |
| **4 · Timeline** | A year-by-year journey built from the dates found *inside* your documents, not file timestamps. |
| **5 · Retrieval** | Ask in plain English. Intent is parsed into filters, ranked by an HNSW vector index, boosted by exact matches, answered in a sentence — originals one click away. |

### Beyond the brief

- **Opportunity Fit** — paste or upload a job posting; Chronicle scores your fit and **cites your own records** as proof of each requirement, then names what's genuinely missing. Optionally drafts a résumé from the records that matched.
- **Telegram bot** — ask from your phone, get the original PDF back as a download.
- **Public profile** — `/p/<handle>`, a shareable read-only view of your journey that never exposes your files.
- **Bilingual** — full English/Hindi UI, and Hindi questions match English documents.
- **Voice** — speak your question, hear the answer.

---

## Stack

| | |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript |
| AI | Gemini 2.5 Flash (understanding) · `gemini-embedding-001` @ 768d (retrieval) |
| Database | Postgres + **pgvector**, HNSW cosine index |
| Auth | Auth.js v5, Google OAuth, JWT sessions |
| Styling | Tailwind v4 |
| Hosting | Vercel (or Render) + Supabase/Neon |

There is **no separate backend**. API routes live in the same Next.js app.

---

## Run it locally

**Prerequisites:** Node 20+, a Postgres with pgvector, a Gemini API key.

```bash
git clone https://github.com/YashIsTheBest247/Chronicle.git
cd Chronicle
npm install
cp .env.example .env.local     # then fill it in — see below
npm run check:env              # validates format, quotes, placeholders
npm run check:db               # connects, enables pgvector, applies schema
npm run check:api              # calls Gemini for real
npm run dev
```

No Postgres to hand? One is provided:

```bash
docker compose up -d
# DATABASE_URL=postgresql://postgres:chronicle@127.0.0.1:55432/chronicle
```

The schema — tables, the HNSW index, every migration — is applied automatically
on the first request that touches the database. There is no migration command.

### Environment

| Key | Required | Where from |
|---|---|---|
| `DATABASE_URL` | ✅ | Supabase **session pooler** (`:5432`) for a long-running server, **transaction pooler** (`:6543`) for serverless |
| `GEMINI_API_KEY` | ✅ | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | ✅ | Google Cloud Console → Credentials → OAuth client (Web) |
| `AUTH_SECRET` | ✅ | `openssl rand -base64 32` |
| `TELEGRAM_BOT_TOKEN` | – | @BotFather |
| `TELEGRAM_WEBHOOK_SECRET` | – | any random string |
| `NEXT_PUBLIC_TELEGRAM_URL` | – | `https://t.me/your_bot` |
| `NEXT_PUBLIC_MAX_UPLOAD_MB` | – | defaults to `4` (Vercel caps bodies at 4.5 MB) |

OAuth redirect URI must match exactly:
`https://<your-host>/api/auth/callback/google`

---

## Deploy

**Vercel** — import the repo, add the five required variables, deploy. Use the
Supabase **transaction pooler** (`:6543`); serverless opens many short-lived
connections. [`vercel.json`](./vercel.json) pins the region and function durations.

**Render** — [`render.yaml`](./render.yaml) is a one-click blueprint. Use the
**session pooler** (`:5432`) instead, since the server is long-running.

Do **not** use Render's free Postgres — it is deleted 30 days after creation.

### Telegram

1. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET`, redeploy
2. **Settings → Activate bot** (registers the webhook)
3. Generate a 6-character code and send it to the bot to link your chat

---

## How retrieval actually works

Pure vector search is good at *"things about machine learning"* and bad at
*"my latest resume"* — the second is a filter-and-sort question, not a
similarity question. So retrieval is hybrid:

```
question
  → Gemini parses intent into filters (category, org, date range, "latest")
  → filters + HNSW cosine search run in ONE SQL statement
  → exact lexical hits boosted, capped so keyword-stuffing can't win
  → "latest" flips the primary sort to recency
  → Gemini writes one sentence over the top hits
```

Retrieval is language-agnostic: `gemini-embedding-001` is multilingual, so a
Hindi question already matches English documents. Only the phrasing of the
answer is localised.

Each layer degrades independently. No Gemini key → lexical ranking still works.
Embedding fails → the query falls back to the full table. The bot keeps
answering when the AI does not.

---

## Scripts

```bash
npm run dev         # local development
npm run build       # production build
npm run check:env   # env vars: format, quotes, whitespace, placeholders
npm run check:db    # connectivity, pgvector, schema, vector operators
npm run check:api   # live Gemini call, confirms both models reachable
```

---

## Project layout

```
src/
  app/
    (app)/          dashboard · timeline · graph · search · upload · fit · settings · record
    api/            ingest · search · chat · fit · items · graph · timeline
                    file · profile · public · telegram · auth · seed
    p/[handle]/     public profile (the only unauthenticated page)
    login/
  lib/
    gemini.ts       model client, embeddings, retry
    extract.ts      document → structured record (and transient text for JDs)
    relate.ts       two-pass relationship engine
    search.ts       hybrid retrieval
    fit.ts          job-posting assessment with cited evidence
    store.ts        every query, all scoped by userId
    profile.ts      public profile projection
    db.ts           pooled connection + lazy migration
    i18n/           English + Hindi
```

---

## Privacy model

- Every store function takes `userId` **as a required first argument**. There is no unscoped read — the compiler rejects a query that forgets the owner.
- Ownership is checked in the `WHERE` clause, not in JavaScript after fetching.
- Public profiles select an explicit column list — never `content`, never `file_id`. There is no code path from a public URL to a stored file.
- Job descriptions uploaded for a fit check are read into memory and discarded. That route imports `extractPlainText`, never the ingest pipeline.
- A Telegram chat reaches exactly one account, enforced by a unique constraint.

---

## Licence

MIT
