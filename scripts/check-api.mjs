/**
 * Live credential check: `npm run check:api`
 *
 * Format checks cannot prove a key works, so this calls Gemini with **every**
 * key in the pool. One dead key in a rotating pool is worse than none — the
 * app keeps handing it work and one request in three fails for no visible
 * reason.
 */
import fs from "node:fs";

for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
    }
  }
}

// Same resolution order as src/lib/keyring.ts.
const found = [];
if (process.env.GEMINI_API_KEYS) {
  found.push(...process.env.GEMINI_API_KEYS.split(",").map((k) => k.trim()));
}
if (process.env.GEMINI_API_KEY) found.push(process.env.GEMINI_API_KEY.trim());
for (let i = 1; i <= 20; i++) {
  const k = process.env[`GEMINI_API_KEY_${i}`];
  if (k?.trim()) found.push(k.trim());
}
const pool = [...new Set(found.filter(Boolean))];

if (pool.length === 0) {
  console.error("✗ No Gemini key found (GEMINI_API_KEY or GEMINI_API_KEYS)");
  process.exit(1);
}

const chat = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const embed = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";

console.log(
  `Pool: ${pool.length} key${pool.length === 1 ? "" : "s"}${pool.length > 1 ? " (rotating)" : ""}\n`,
);

let bad = 0;

for (const [i, key] of pool.entries()) {
  const label = `key ${i + 1} …${key.slice(-4)}`;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    );
    const body = await res.json();

    if (!res.ok) {
      console.error(
        `✗ ${label}  HTTP ${res.status} — ${(body.error?.message ?? "").slice(0, 90)}`,
      );
      bad++;
      continue;
    }

    const names = (body.models ?? []).map((m) => m.name.replace("models/", ""));
    const hasChat = names.some((n) => n === chat || n.startsWith(chat));
    const hasEmbed = names.some((n) => n === embed || n.startsWith(embed));

    if (hasChat && hasEmbed) {
      console.log(`✓ ${label}  ${names.length} models, both required present`);
    } else {
      console.error(
        `✗ ${label}  missing ${!hasChat ? chat : ""} ${!hasEmbed ? embed : ""}`.trim(),
      );
      bad++;
    }
  } catch (err) {
    console.error(`✗ ${label}  ${String(err?.message ?? err).slice(0, 90)}`);
    bad++;
  }
}

if (bad) {
  console.error(`\n${bad} of ${pool.length} key(s) unusable. Fix or remove them.`);
  process.exitCode = 1;
} else if (pool.length === 1) {
  console.log(
    "\nOne key works. Add GEMINI_API_KEYS with several to survive rate limits during a demo.",
  );
} else {
  console.log(`\nAll ${pool.length} keys work — quota is roughly ${pool.length}× a single key.`);
}
