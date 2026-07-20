import { NextResponse } from "next/server";
import { hasKey } from "@/lib/gemini";
import { hasDatabase } from "@/lib/db";
import { search } from "@/lib/search";
import { toClientItem } from "@/lib/view";
import { apiError } from "@/lib/api-error";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(req: Request) {
  const session = await requireUser();
  if ("response" in session) return session.response;

  if (!hasDatabase() || !hasKey()) {
    return NextResponse.json(
      {
        error: `${!hasDatabase() ? "DATABASE_URL" : "GEMINI_API_KEY"} is not configured on the server.`,
        setup: true,
      },
      { status: 503 },
    );
  }

  try {
    const { query, limit } = (await req.json()) as {
      query?: string;
      limit?: number;
    };
    if (!query?.trim()) {
      return NextResponse.json({ error: "Empty query." }, { status: 400 });
    }

    const result = await search(session.userId, query, Math.min(limit ?? 12, 50));
    return NextResponse.json({
      ...result,
      hits: result.hits.map((h) => ({ ...h, item: toClientItem(h.item) })),
    });
  } catch (err) {
    return apiError(err);
  }
}
