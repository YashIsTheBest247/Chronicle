import { NextResponse } from "next/server";
import { getMe, hasBot, setWebhook } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Registers this deployment's webhook with Telegram.
 *
 * Guarded by TELEGRAM_WEBHOOK_SECRET so a stranger cannot repoint your bot:
 *   GET /api/telegram/setup?secret=<TELEGRAM_WEBHOOK_SECRET>
 *
 * The webhook URL is derived from the incoming request, so it is correct on
 * localhost, a tunnel, and the deployed host without any extra config.
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

  // Behind a proxy the request URL is http/internal; trust the forwarded host.
  const host = req.headers.get("x-forwarded-host") ?? url.host;
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const webhookUrl = `${proto}://${host}/api/telegram/webhook`;

  try {
    const me = await getMe();
    await setWebhook(webhookUrl, secret);
    return NextResponse.json({
      ok: true,
      bot: `@${me.username}`,
      webhook: webhookUrl,
      next: "Message the bot on Telegram. It will reply with your chat ID; put that in TELEGRAM_ALLOWED_CHAT_IDS.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Setup failed." },
      { status: 500 },
    );
  }
}
