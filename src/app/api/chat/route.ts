import { NextResponse } from "next/server";
import { chatAnswer, type ChatLang } from "@/lib/chat";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/api-error";
import { hasDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(req: Request) {
  const session = await requireUser();
  if ("response" in session) return session.response;

  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured.", setup: true },
      { status: 503 },
    );
  }

  try {
    const { message, lang } = (await req.json()) as {
      message?: string;
      lang?: string;
    };
    if (!message?.trim()) {
      return NextResponse.json({ error: "Empty message." }, { status: 400 });
    }

    const reply = await chatAnswer(
      session.userId,
      message,
      lang === "hi" ? "hi" : ("en" as ChatLang),
    );
    return NextResponse.json(reply);
  } catch (err) {
    return apiError(err);
  }
}
