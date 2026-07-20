import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/api-error";
import { createLinkCode, getUserById, unlinkTelegram } from "@/lib/users";
import { getWebhookInfo, hasBot } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Current link state, so Settings can show "connected" vs "not connected". */
export async function GET() {
  const session = await requireUser();
  if ("response" in session) return session.response;
  try {
    const user = await getUserById(session.userId);

    // Ask Telegram directly rather than assuming: a bot with no webhook
    // registered looks identical to a working one from inside the app.
    let webhook: { url: string; pendingUpdates: number; lastError: string | null } | null =
      null;
    if (hasBot()) {
      webhook = await getWebhookInfo().catch(() => null);
    }

    return NextResponse.json({
      botConfigured: hasBot(),
      linked: Boolean(user?.telegramChatId),
      botUrl: process.env.NEXT_PUBLIC_TELEGRAM_URL ?? null,
      webhookReady: Boolean(webhook?.url),
      webhookUrl: webhook?.url ?? null,
      webhookError: webhook?.lastError ?? null,
      pendingUpdates: webhook?.pendingUpdates ?? 0,
    });
  } catch (err) {
    return apiError(err);
  }
}

/** Mints a fresh 15-minute code to paste into the bot. */
export async function POST() {
  const session = await requireUser();
  if ("response" in session) return session.response;
  try {
    return NextResponse.json({ code: await createLinkCode(session.userId) });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE() {
  const session = await requireUser();
  if ("response" in session) return session.response;
  try {
    await unlinkTelegram(session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
