import { NextResponse } from "next/server";
import {
  categoryCounts,
  countItems,
  countRelations,
  listItems,
  skillFrequency,
} from "@/lib/store";
import { toClientItems } from "@/lib/view";
import { CATEGORIES, type Category } from "@/lib/types";
import { apiError } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("category");
    const category = CATEGORIES.includes(raw as Category)
      ? (raw as Category)
      : undefined;

    const [rows, counts, total, relations, skills] = await Promise.all([
      listItems(category),
      categoryCounts(),
      countItems(),
      countRelations(),
      skillFrequency(),
    ]);

    return NextResponse.json({
      items: toClientItems(rows),
      // Fill the zeroes so the client never has to guard on a missing key.
      counts: Object.fromEntries(
        CATEGORIES.map((c) => [c, counts[c] ?? 0]),
      ),
      total,
      relations,
      skills,
    });
  } catch (err) {
    return apiError(err);
  }
}
