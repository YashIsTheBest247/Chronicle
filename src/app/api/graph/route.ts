import { NextResponse } from "next/server";
import { listItems, listRelations } from "@/lib/store";
import { categoryColor, relationLabel } from "@/lib/utils";
import { apiError } from "@/lib/api-error";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Graph payload for the knowledge map. Node radius encodes degree, so the
 * records that anchor the most of a person's journey read as the largest.
 */
export async function GET() {
  const session = await requireUser();
  if ("response" in session) return session.response;

  try {
    const [items, relations] = await Promise.all([
      listItems(session.userId),
      listRelations(session.userId),
    ]);

    const degree = new Map<string, number>();
    for (const r of relations) {
      degree.set(r.from, (degree.get(r.from) ?? 0) + 1);
      degree.set(r.to, (degree.get(r.to) ?? 0) + 1);
    }

    const nodes = items.map((i) => ({
      id: i.id,
      label: i.title,
      category: i.category,
      color: categoryColor(i.category),
      date: i.date,
      organization: i.organization,
      skills: i.skills.slice(0, 6),
      degree: degree.get(i.id) ?? 0,
    }));

    const ids = new Set(nodes.map((n) => n.id));
    const links = relations
      .filter((r) => ids.has(r.from) && ids.has(r.to))
      .map((r) => ({
        id: r.id,
        source: r.from,
        target: r.to,
        kind: r.kind,
        label: relationLabel(r.kind),
        weight: r.weight,
        reason: r.reason,
      }));

    return NextResponse.json({ nodes, links });
  } catch (err) {
    return apiError(err);
  }
}
