import { NextResponse } from "next/server";
import { hasKey } from "@/lib/gemini";
import { hasDatabase } from "@/lib/db";
import { seed } from "@/lib/seed";
import { reset } from "@/lib/store";
import { apiError } from "@/lib/api-error";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Loads the demo journey. Destructive: clears whatever is there first. */
export async function POST() {
  const session = await requireUser();
  if ("response" in session) return session.response;

  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured on the server.", setup: true },
      { status: 503 },
    );
  }
  if (!hasKey()) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server.", setup: true },
      { status: 503 },
    );
  }
  try {
    return NextResponse.json({ ok: true, count: await seed(session.userId) });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE() {
  const session = await requireUser();
  if ("response" in session) return session.response;

  try {
    await reset(session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
