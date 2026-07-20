import "server-only";
import { GoogleGenAI } from "@google/genai";

/**
 * A rotating pool of Gemini API keys.
 *
 * Free-tier keys have low per-minute quotas, and a rate limit hit mid-demo
 * looks identical to the app being broken. Several keys multiply the ceiling,
 * but only if the pool does two distinct things:
 *
 *  - **spread** load, so no single key absorbs every request, and
 *  - **fail over**, so a key that returns 429 is benched rather than retried
 *    into the same wall.
 *
 * Keys are read from any of these, deduplicated:
 *   GEMINI_API_KEYS   comma-separated
 *   GEMINI_API_KEY    single (kept for backwards compatibility)
 *   GEMINI_API_KEY_1  numbered, any count
 */

interface KeyState {
  key: string;
  client: GoogleGenAI;
  /** Epoch ms until which this key is benched after a rate limit. */
  cooldownUntil: number;
  /** Consecutive rate limits — drives how long the next bench lasts. */
  strikes: number;
}

let pool: KeyState[] | null = null;
let cursor = 0;

function readKeys(): string[] {
  const found: string[] = [];

  const csv = process.env.GEMINI_API_KEYS;
  if (csv) found.push(...csv.split(",").map((k) => k.trim()));

  if (process.env.GEMINI_API_KEY) found.push(process.env.GEMINI_API_KEY.trim());

  // Numbered keys, unbounded: stop at the first gap after index 1.
  for (let i = 1; i <= 20; i++) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
    if (k?.trim()) found.push(k.trim());
  }

  return [...new Set(found.filter(Boolean))];
}

function getPool(): KeyState[] {
  if (pool) return pool;

  const keys = readKeys();
  if (keys.length === 0) {
    throw new Error(
      "No Gemini API key configured. Set GEMINI_API_KEY (or GEMINI_API_KEYS for a rotating pool) — get one at https://aistudio.google.com/apikey",
    );
  }

  pool = keys.map((key) => ({
    key,
    client: new GoogleGenAI({ apiKey: key }),
    cooldownUntil: 0,
    strikes: 0,
  }));

  // Serverless instances start with fresh module state, so a fixed starting
  // index would send every cold start to key #1 and defeat the spreading.
  // A random offset makes instances self-distribute without coordination.
  cursor = Math.floor(Math.random() * pool.length);

  return pool;
}

export function keyCount(): number {
  try {
    return getPool().length;
  } catch {
    return 0;
  }
}

export function hasAnyKey(): boolean {
  return readKeys().length > 0;
}

/** Rate limit and quota exhaustion — the errors another key can fix. */
function isRateLimited(err: unknown): boolean {
  return /429|RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(String(err));
}

/** Transient transport errors — worth retrying, but not the key's fault. */
function isTransient(err: unknown): boolean {
  return /50\d|UNAVAILABLE|ECONNRESET|ETIMEDOUT|fetch failed|socket/i.test(
    String(err),
  );
}

/**
 * Runs `fn` against a healthy key, rotating on rate limits.
 *
 * A rate-limited key is benched with exponential backoff (10s, 20s, 40s, capped
 * at 2 min) so the pool stops sending it work rather than hammering it. If every
 * key is benched, this waits for the soonest to recover rather than failing —
 * a short wait beats a broken page.
 */
export async function withKey<T>(fn: (client: GoogleGenAI) => Promise<T>): Promise<T> {
  const keys = getPool();
  const maxAttempts = Math.max(keys.length * 2, 4);
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const now = Date.now();

    // Prefer a key that is not benched, starting from the rotating cursor.
    let chosen: KeyState | null = null;
    for (let i = 0; i < keys.length; i++) {
      const candidate = keys[(cursor + i) % keys.length];
      if (candidate.cooldownUntil <= now) {
        chosen = candidate;
        cursor = (cursor + i + 1) % keys.length;
        break;
      }
    }

    if (!chosen) {
      // Everything is benched. Wait for the soonest, bounded so a
      // misconfigured pool cannot hang a request indefinitely.
      const soonest = Math.min(...keys.map((k) => k.cooldownUntil));
      const wait = Math.min(Math.max(soonest - now, 0), 8_000);
      if (attempt === maxAttempts - 1) break;
      await sleep(wait || 500);
      continue;
    }

    try {
      const result = await fn(chosen.client);
      chosen.strikes = 0; // a success clears the key's history
      return result;
    } catch (err) {
      lastError = err;

      if (isRateLimited(err)) {
        chosen.strikes += 1;
        const bench = Math.min(10_000 * 2 ** (chosen.strikes - 1), 120_000);
        chosen.cooldownUntil = Date.now() + bench;
        continue; // straight to the next key, no delay
      }

      if (isTransient(err)) {
        await sleep(400 * 2 ** attempt);
        continue;
      }

      // A bad request, a schema violation, an invalid key — another key will
      // not help and retrying only wastes quota.
      throw err;
    }
  }

  throw lastError ?? new Error("Gemini request failed after exhausting all keys");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Diagnostics for the health endpoint; never exposes key material. */
export function poolStatus() {
  try {
    const now = Date.now();
    const keys = getPool();
    return {
      total: keys.length,
      available: keys.filter((k) => k.cooldownUntil <= now).length,
      benched: keys
        .filter((k) => k.cooldownUntil > now)
        .map((k) => ({
          // Last four characters only — enough to tell keys apart in a log.
          tail: k.key.slice(-4),
          secondsRemaining: Math.ceil((k.cooldownUntil - now) / 1000),
        })),
    };
  } catch {
    return { total: 0, available: 0, benched: [] };
  }
}
