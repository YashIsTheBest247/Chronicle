/**
 * Environment preflight: `npm run check:env`
 *
 * Confirms every variable Chronicle needs is present and shaped correctly
 * before a deploy — including the invisible mistakes (wrapping quotes,
 * trailing whitespace, unreplaced placeholders) that produce confusing
 * runtime errors rather than obvious ones.
 *
 * Prints only lengths and prefixes; never a secret.
 */
import fs from "node:fs";
import path from "node:path";

const file = path.join(process.cwd(), ".env.local");
if (!fs.existsSync(file)) {
  console.error("✗ .env.local not found at the project root");
  process.exit(1);
}

// Read raw so quoting and whitespace problems stay visible.
const raw = new Map();
for (const line of fs.readFileSync(file, "utf8").split("\n")) {
  if (/^\s*#/.test(line) || !line.includes("=")) continue;
  const i = line.indexOf("=");
  raw.set(line.slice(0, i).trim(), line.slice(i + 1).replace(/\r$/, ""));
}

let bad = 0;
const problems = [];

function check(key, { required, test, hint, secret = true }) {
  const value = raw.get(key);

  if (value === undefined || value === "") {
    if (required) {
      problems.push(`✗ ${key} is missing or empty`);
      bad++;
    } else {
      console.log(`· ${key.padEnd(26)} not set (optional)`);
    }
    return;
  }

  // Shape problems first — these survive into the running process silently.
  if (/^["'].*["']$/.test(value)) {
    problems.push(`✗ ${key} is wrapped in quotes — remove them`);
    bad++;
    return;
  }
  if (value !== value.trim()) {
    problems.push(`✗ ${key} has leading/trailing whitespace`);
    bad++;
    return;
  }
  if (/^\.\.\.|\.\.\.$|YOUR-|<.*>|\[.*\]/.test(value)) {
    problems.push(`✗ ${key} still contains a placeholder`);
    bad++;
    return;
  }
  if (value.startsWith(key)) {
    problems.push(
      `✗ ${key} value begins with "${key}" — the line looks like ` +
        `${key}=${key}=... Delete the duplicated key name.`,
    );
    bad++;
    return;
  }

  if (test && !test(value)) {
    problems.push(`✗ ${key} looks wrong — ${hint}`);
    bad++;
    return;
  }

  const shown = secret
    ? `${value.slice(0, 6)}… (${value.length} chars)`
    : value;
  console.log(`✓ ${key.padEnd(26)} ${shown}`);
}

console.log("Required\n--------");

check("DATABASE_URL", {
  required: true,
  test: (v) => {
    try {
      const u = new URL(v);
      return Boolean(u.hostname && u.password);
    } catch {
      return false;
    }
  },
  hint: "must be a full postgresql:// URL including the password (percent-encode @ as %40)",
});

check("GEMINI_API_KEY", {
  required: true,
  // Google issues both "AIza…" (older) and "AQ.…" (newer AI Studio) keys, so
  // this only checks it is a plausible opaque token. Format alone cannot
  // prove a key works — `npm run check:api` calls the real API for that.
  test: (v) => v.length > 20 && !/\s/.test(v),
  hint: "should be a single opaque token from aistudio.google.com/apikey",
});

check("AUTH_GOOGLE_ID", {
  required: true,
  test: (v) => v.endsWith(".apps.googleusercontent.com"),
  hint: "must end with .apps.googleusercontent.com",
});

check("AUTH_GOOGLE_SECRET", {
  required: true,
  test: (v) => v.startsWith("GOCSPX-"),
  hint: "Google client secrets start with GOCSPX-",
});

check("AUTH_SECRET", {
  required: true,
  test: (v) => v.length >= 32,
  hint: "use at least 32 characters (openssl rand -base64 32)",
});

console.log("\nOptional\n--------");
check("TELEGRAM_BOT_TOKEN", {
  required: false,
  test: (v) => /^\d+:[\w-]+$/.test(v),
  hint: "format is 123456789:AAxxxxx from @BotFather",
});
check("TELEGRAM_WEBHOOK_SECRET", { required: false });
check("NEXT_PUBLIC_TELEGRAM_URL", {
  required: false,
  secret: false,
  test: (v) => v.startsWith("https://t.me/"),
  hint: "should look like https://t.me/your_bot",
});

// A DATABASE_URL that connects but is the wrong Supabase endpoint still
// deploys badly, so surface that here too.
const db = raw.get("DATABASE_URL") ?? "";
if (db.includes("supabase")) {
  console.log("\nSupabase\n--------");
  if (db.includes("db.") && db.includes(".supabase.co")) {
    console.log("! direct connection (IPv6-only) — prefer the Session pooler");
  } else if (db.includes(":6543")) {
    console.log("! transaction pooler — prefer the Session pooler on :5432");
  } else if (db.includes("pooler") && db.includes(":5432")) {
    console.log("✓ session pooler (correct for a long-running server)");
  }
}

if (problems.length) {
  console.log("\nProblems\n--------");
  problems.forEach((p) => console.log(p));
  console.log(`\n${bad} problem(s). Fix these before deploying.`);
  process.exitCode = 1;
} else {
  console.log("\nAll required variables look good.");
  console.log("Next: npm run dev, then sign in at http://localhost:3000");
}
