import { NextResponse } from "next/server";
import { getMe, hasBot, setWebhook } from "@/lib/telegram";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Derives the public origin, trusting the proxy headers Vercel/Render set. */
function origin(req: Request): string {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? url.host;
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Registers this deployment's webhook with Telegram.
 *
 * POST is the one people should use: any signed-in user can press the button
 * in Settings, and no secret has to be pasted into a URL bar. Requiring a
 * hand-built secret URL was the step that got skipped and left the bot inert.
 */
export async function POST(req: Request) {
  const session = await requireUser();
  if ("response" in session) return session.response;

  if (!hasBot()) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN is not set on the server." },
      { status: 503 },
    );
  }
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "TELEGRAM_WEBHOOK_SECRET is not set on the server." },
      { status: 503 },
    );
  }

  const webhookUrl = `${origin(req)}/api/telegram/webhook`;
  try {
    const me = await getMe();
    await setWebhook(webhookUrl, secret);
    return NextResponse.json({
      ok: true,
      bot: `@${me.username}`,
      webhook: webhookUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Setup failed." },
      { status: 500 },
    );
  }
}

/**
 * Secret-guarded GET, kept for setting the webhook from a terminal or before
 * anyone has signed in:
 *   GET /api/telegram/setup?secret=<TELEGRAM_WEBHOOK_SECRET>
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!hasBot()) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN is not set." },
      { status: 503 },
    );
  }
  if (!secret) {
    return NextResponse.json(
      { error: "TELEGRAM_WEBHOOK_SECRET is not set — refusing to register." },
      { status: 503 },
    );
  }
  if (url.searchParams.get("secret") !== secret) {
    return NextResponse.json({ error: "Bad secret." }, { status: 401 });
  }

  const webhookUrl = `${origin(req)}/api/telegram/webhook`;
  try {
    const me = await getMe();
    await setWebhook(webhookUrl, secret);
    return NextResponse.json({
      ok: true,
      bot: `@${me.username}`,
      webhook: webhookUrl,
      next: "Open Settings in Chronicle, generate a code, and send it to the bot.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Setup failed." },
      { status: 500 },
    );
  }
}
