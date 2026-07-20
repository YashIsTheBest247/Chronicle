-- Chronicle schema. Idempotent: safe to run on every cold start.

create extension if not exists vector;

-- Originals live in the database as bytes so a deploy with an ephemeral
-- filesystem still hands back the exact file that was uploaded.
create table if not exists files (
  id          text primary key,
  name        text        not null,
  mime        text        not null,
  size        integer     not null,
  bytes       bytea       not null,
  uploaded_at timestamptz not null default now()
);

create table if not exists items (
  id              text primary key,
  file_id         text references files(id) on delete set null,
  url             text,
  title           text        not null,
  summary         text        not null default '',
  category        text        not null,
  -- Deliberately text, not date: a certificate may only assert "2023", and
  -- coercing that to 2023-01-01 would invent precision the source never had.
  date            text,
  date_confidence text        not null default 'unknown',
  organization    text,
  skills          text[]      not null default '{}',
  tags            text[]      not null default '{}',
  people          text[]      not null default '{}',
  links           text[]      not null default '{}',
  highlights      text[]      not null default '{}',
  content         text        not null default '',
  embedding       vector(768),
  created_at      timestamptz not null default now()
);

create table if not exists relations (
  id      text primary key,
  from_id text not null references items(id) on delete cascade,
  to_id   text not null references items(id) on delete cascade,
  kind    text not null,
  weight  real not null default 0.5,
  reason  text not null default '',
  -- One edge per ordered pair; re-running the engine updates in place.
  constraint relations_pair_unique unique (from_id, to_id)
);

-- HNSW over cosine distance. Chosen over IVFFlat because it needs no
-- training pass and stays correct while the table is nearly empty, which is
-- exactly the state a new Chronicle is in.
create index if not exists items_embedding_idx
  on items using hnsw (embedding vector_cosine_ops);

-- Skill overlap is the relationship engine's hottest lookup.
create index if not exists items_skills_idx on items using gin (skills);

create index if not exists items_category_idx on items (category);
create index if not exists items_date_idx     on items (date desc nulls last);
create index if not exists relations_from_idx on relations (from_id);
create index if not exists relations_to_idx   on relations (to_id);
