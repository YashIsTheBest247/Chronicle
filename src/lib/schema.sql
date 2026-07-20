-- Chronicle schema. Idempotent: safe to run on every cold start.

create extension if not exists vector;

-- One row per signed-in Google account. Everything else hangs off this.
create table if not exists users (
  id               text primary key,
  email            text        not null unique,
  name             text,
  image            text,
  -- Set when a Telegram chat is linked; nullable and unique so one chat can
  -- only ever belong to one account.
  telegram_chat_id bigint      unique,
  created_at       timestamptz not null default now()
);

-- Short-lived codes that bind a Telegram chat to an account.
create table if not exists telegram_link_codes (
  code       text primary key,
  user_id    text        not null references users(id) on delete cascade,
  expires_at timestamptz not null
);

-- Originals live in the database as bytes so a deploy with an ephemeral
-- filesystem still hands back the exact file that was uploaded.
create table if not exists files (
  id          text primary key,
  user_id     text        not null references users(id) on delete cascade,
  name        text        not null,
  mime        text        not null,
  size        integer     not null,
  bytes       bytea       not null,
  uploaded_at timestamptz not null default now()
);

create table if not exists items (
  id              text primary key,
  user_id         text        not null references users(id) on delete cascade,
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
  user_id text not null references users(id) on delete cascade,
  from_id text not null references items(id) on delete cascade,
  to_id   text not null references items(id) on delete cascade,
  kind    text not null,
  weight  real not null default 0.5,
  reason  text not null default '',
  -- One edge per ordered pair; re-running the engine updates in place.
  constraint relations_pair_unique unique (from_id, to_id)
);

-- Shareable public profile. A handle is claimed, not derived from the email,
-- so nobody's address leaks into a public URL.
alter table users add column if not exists handle text unique;
alter table users add column if not exists profile_public boolean not null default false;
alter table users add column if not exists headline text;

-- Lets a record stay in the account but out of the public profile.
alter table items add column if not exists hidden boolean not null default false;

create index if not exists users_handle_idx on users (handle) where handle is not null;

-- ---------------------------------------------------------------------------
-- Backfill for databases created before accounts existed. This must run BEFORE
-- the indexes below, which reference user_id — otherwise index creation fails
-- on any pre-auth database. Existing rows are left unowned rather than guessed
-- at: a wrong owner is worse than no owner.
-- ---------------------------------------------------------------------------
alter table files     add column if not exists user_id text references users(id) on delete cascade;
alter table items     add column if not exists user_id text references users(id) on delete cascade;
alter table relations add column if not exists user_id text references users(id) on delete cascade;

-- HNSW over cosine distance. Chosen over IVFFlat because it needs no
-- training pass and stays correct while the table is nearly empty, which is
-- exactly the state a new Chronicle is in.
create index if not exists items_embedding_idx
  on items using hnsw (embedding vector_cosine_ops);

-- Every read is scoped to one owner, so user_id leads the composite indexes.
create index if not exists items_user_idx      on items (user_id);
create index if not exists items_user_date_idx on items (user_id, date desc nulls last);
create index if not exists items_user_cat_idx  on items (user_id, category);
create index if not exists items_skills_idx    on items using gin (skills);
create index if not exists files_user_idx      on files (user_id);
create index if not exists relations_user_idx  on relations (user_id);
create index if not exists relations_from_idx  on relations (from_id);
create index if not exists relations_to_idx    on relations (to_id);

