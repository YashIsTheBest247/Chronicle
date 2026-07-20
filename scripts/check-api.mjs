/**
 * Live credential check: `npm run check:api`
 *
 * Format checks cannot prove a key works, so this actually calls Gemini and
 * confirms the models Chronicle depends on are reachable with your key.
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

const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("✗ GEMINI_API_KEY is not set");
  process.exit(1);
}

const chat = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const embed = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";

const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
);
const body = await res.json();

if (!res.ok) {
  console.error(`✗ Gemini rejected the key (HTTP ${res.status})`);
  console.error("  " + (body.error?.message ?? "").slice(0, 200));
  process.exit(1);
}

const names = (body.models ?? []).map((m) => m.name.replace("models/", ""));
console.log(`✓ key accepted — ${names.length} models visible`);

for (const [label, want] of [["chat", chat], ["embeddings", embed]]) {
  const ok = names.some((n) => n === want || n.startsWith(want));
  console.log(`${ok ? "✓" : "✗"} ${label.padEnd(11)} ${want}`);
  if (!ok) process.exitCode = 1;
}
