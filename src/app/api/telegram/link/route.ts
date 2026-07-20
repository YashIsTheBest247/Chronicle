import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/api-error";
import { createLinkCode, getUserById, unlinkTelegram } from "@/lib/users";
import { hasBot } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Current link state, so Settings can show "connected" vs "not connected". */
export async function GET() {
  const session = await requireUser();
  if ("response" in session) return session.response;
  try {
    const user = await getUserById(session.userId);
    return NextResponse.json({
      botConfigured: hasBot(),
      linked: Boolean(user?.telegramChatId),
      botUrl: process.env.NEXT_PUBLIC_TELEGRAM_URL ?? null,
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
