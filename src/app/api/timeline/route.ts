import { NextResponse } from "next/server";
import { listItems } from "@/lib/store";
import { toClientItems } from "@/lib/view";
import { yearOf } from "@/lib/utils";
import { apiError } from "@/lib/api-error";
import type { ClientItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Records grouped into years, newest year first, oldest record first within. */
export async function GET() {
  try {
    const items = toClientItems(await listItems());

    const byYear = new Map<string, ClientItem[]>();
    for (const item of items) {
      const year = yearOf(item.date);
      const bucket = byYear.get(year) ?? [];
      bucket.push(item);
      byYear.set(year, bucket);
    }

    const years = [...byYear.entries()]
      .map(([year, entries]) => ({
        year,
        items: entries.sort((a, b) =>
          (a.date ?? "").localeCompare(b.date ?? ""),
        ),
      }))
      // "Undated" sorts last regardless of the numeric years around it.
      .sort((a, b) => {
        if (a.year === "Undated") return 1;
        if (b.year === "Undated") return -1;
        return b.year.localeCompare(a.year);
      });

    return NextResponse.json({ years, total: items.length });
  } catch (err) {
    return apiError(err);
  }
}
