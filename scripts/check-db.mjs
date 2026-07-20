/**
 * Connection preflight: `npm run check:db`
 *
 * Verifies DATABASE_URL reaches a Postgres that Chronicle can actually use —
 * pgvector available, schema applies, vector index usable — and prints a
 * specific fix for each way it commonly fails.
 *
 * Never prints the connection string or password.
 */
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

// Minimal .env.local reader so this runs without extra dependencies.
for (const file of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const value = m[2].replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = value;
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ DATABASE_URL is not set (checked .env.local and .env)");
  process.exit(1);
}

// Describe the target without leaking credentials.
let host = "unknown";
let port = "";
try {
  const u = new URL(url);
  host = u.hostname;
  port = u.port || "5432";
} catch {
  console.error("✗ DATABASE_URL is not a valid URL. If your password contains");
  console.error("  @ : / ? # or &, percent-encode it (@ becomes %40).");
  process.exit(1);
}

console.log(`→ ${host}:${port}`);

// Supabase-specific guidance, since the wrong string is the usual failure.
if (host.includes("supabase")) {
  if (host.startsWith("db.")) {
    console.log(
      "! This is the DIRECT connection (IPv6-only without the paid add-on).",
    );
    console.log("  Prefer the Session pooler: *.pooler.supabase.com:5432");
  } else if (port === "6543") {
    console.log("! This is the TRANSACTION pooler, meant for serverless.");
    console.log("  Prefer the Session pooler on port 5432 for a Render service.");
  } else if (host.includes("pooler")) {
    console.log("✓ Session pooler (correct for a long-running server)");
  }
}

const sql = postgres(url, {
  prepare: false,
  max: 1,
  connect_timeout: 15,
  ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require",
  // "already exists, skipping" on a re-run is the schema being idempotent,
  // not a problem worth printing twenty times.
  onnotice: () => {},
});

try {
  const [v] = await sql`select version()`;
  console.log("✓ connected —", v.version.split(",")[0]);

  await sql`create extension if not exists vector`;
  const [ext] = await sql`
    select extversion from pg_extension where extname = 'vector'
  `;
  console.log(`✓ pgvector ${ext?.extversion ?? "enabled"}`);

  const ddl = fs.readFileSync(
    path.join(process.cwd(), "src", "lib", "schema.sql"),
    "utf8",
  );
  await sql.unsafe(ddl);
  console.log("✓ schema applied");

  const tables = await sql`
    select table_name from information_schema.tables
    where table_schema = 'public' order by 1
  `;
  console.log("✓ tables:", tables.map((t) => t.table_name).join(", "));

  // Prove the vector type and cosine operator work end to end. The probe must
  // be non-zero: cosine distance against a zero-magnitude vector is undefined
  // and returns NaN, which would look like a pass while testing nothing.
  const a = Array.from({ length: 768 }, (_, i) => Math.sin(i + 1).toFixed(6));
  const b = Array.from({ length: 768 }, (_, i) => Math.cos(i + 1).toFixed(6));
  const [probe] = await sql`
    select
      1 - (${`[${a}]`}::vector <=> ${`[${a}]`}::vector) as self_sim,
      1 - (${`[${a}]`}::vector <=> ${`[${b}]`}::vector) as cross_sim
  `;
  const selfSim = Number(probe.self_sim);
  if (!Number.isFinite(selfSim) || Math.abs(selfSim - 1) > 1e-6) {
    throw new Error(`vector cosine operator misbehaving (self=${probe.self_sim})`);
  }
  console.log(
    `✓ vector search works (identical=${selfSim.toFixed(4)}, different=${Number(probe.cross_sim).toFixed(4)})`,
  );

  console.log("\nReady. Use this same value for DATABASE_URL on Render.");
} catch (err) {
  const m = String(err?.message ?? err);
  console.error("\n✗ " + m);

  if (/ENOTFOUND|EAI_AGAIN/.test(m)) {
    console.error("  Hostname did not resolve — check for a typo in the host.");
  } else if (/ETIMEDOUT|ECONNREFUSED|ENETUNREACH/.test(m)) {
    console.error("  Could not reach the host. If this is Supabase's direct");
    console.error("  connection (db.*.supabase.co) it is IPv6-only — switch to");
    console.error("  the Session pooler string.");
  } else if (/password|SASL|authentication/i.test(m)) {
    console.error("  Password rejected. Replace [YOUR-PASSWORD] with the real");
    console.error("  one, and percent-encode specials (@ → %40, # → %23).");
  } else if (/permission denied|must be owner/i.test(m)) {
    console.error("  Enable pgvector via Database → Extensions, then retry.");
  }
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
