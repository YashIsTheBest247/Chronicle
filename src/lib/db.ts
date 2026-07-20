import "server-only";
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

/**
 * A single pooled connection for the process, with the schema applied lazily
 * on first use. Every query in the app goes through `db()`, so there is no
 * path that can touch an unmigrated database.
 */

/**
 * Bump this whenever schema.sql changes. It is compared against the value
 * stored in `chronicle_meta`, and the DDL only runs when the database is
 * behind — so a migration that is not accompanied by a bump will not apply.
 */
const SCHEMA_VERSION = 3;

let client: postgres.Sql | null = null;
let migration: Promise<void> | null = null;

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function connect(): postgres.Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and point it at a Postgres database with the pgvector extension available.",
    );
  }

  client ??= postgres(url, {
    // Supabase's transaction pooler does not support prepared statements.
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    // Hosted Postgres terminates TLS with certificates this client has no
    // chain for; the connection is still encrypted.
    ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
  });
  return client;
}

/** Applies schema.sql once per process. Concurrent callers share the promise. */
export async function db(): Promise<postgres.Sql> {
  const sql = connect();
  migration ??= (async () => {
    // A serverless deployment cold-starts constantly, so re-running the whole
    // DDL batch every time is both wasteful and risky: multi-statement DDL is
    // the one thing a transaction pooler handles badly. So skip it when the
    // database is already current.
    //
    // "Current" is a version number, not the presence of some column. An
    // earlier version of this probed for `items.user_id`, which meant every
    // schema change after that column shipped was silently skipped on any
    // database that already had it. Bumping SCHEMA_VERSION is now the single
    // thing that makes a migration apply.
    try {
      const [row] = await sql<{ value: string }[]>`
        select value from chronicle_meta where key = 'schema_version'
      `;
      if (row && Number(row.value) >= SCHEMA_VERSION) return;
    } catch {
      // No chronicle_meta yet — a fresh or pre-versioning database. Fall
      // through and run the DDL, which creates it.
    }

    const file = path.join(process.cwd(), "src", "lib", "schema.sql");
    const ddl = fs.readFileSync(file, "utf8");
    try {
      await sql.unsafe(ddl);
    } catch (err) {
      migration = null; // let the next request retry rather than staying broken
      const message = err instanceof Error ? err.message : String(err);
      if (/extension "vector"|type "vector"/i.test(message)) {
        throw new Error(
          `pgvector is not available on this database. Enable it (Supabase: Database → Extensions → vector) and retry. Original error: ${message}`,
        );
      }
      throw err;
    }
  })();
  await migration;
  return sql;
}

/** Formats a JS array as the literal pgvector expects. */
export function toVector(v: number[]): string {
  return `[${v.join(",")}]`;
}
