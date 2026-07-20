import { NextResponse } from "next/server";
import { deleteItem, getConnections, getItem } from "@/lib/store";
import { toClientItem } from "@/lib/view";
import { relationLabel } from "@/lib/utils";
import { apiError } from "@/lib/api-error";
import { requireUser } from "@/lib/session";
import { setRecordHidden } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireUser();
  if ("response" in session) return session.response;

  try {
    const { id } = await params;
    const item = await getItem(session.userId, id);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const connections = (await getConnections(session.userId, id)).map((c) => ({
      ...c,
      label: relationLabel(c.relation.kind),
      item: toClientItem(c.item),
    }));

    return NextResponse.json({
      // The detail page shows more source text than a card does.
      item: toClientItem(item, 4000),
      connections,
    });
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireUser();
  if ("response" in session) return session.response;

  try {
    const { id } = await params;
    const { hidden } = (await req.json()) as { hidden?: boolean };
    if (typeof hidden !== "boolean") {
      return NextResponse.json({ error: "Expected { hidden }." }, { status: 400 });
    }
    // Scoped by owner inside the query, so this cannot flip another
    // account's record even with a guessed id.
    await setRecordHidden(session.userId, id, hidden);
    return NextResponse.json({ ok: true, hidden });
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireUser();
  if ("response" in session) return session.response;

  try {
    const { id } = await params;
    await deleteItem(session.userId, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
