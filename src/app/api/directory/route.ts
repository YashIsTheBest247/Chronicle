import { NextResponse } from "next/server";
import { listDirectory } from "@/lib/profile";
import { apiError } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public directory. Unauthenticated by design — it is the discovery surface —
 * but listDirectory only returns profiles that are BOTH published and opted
 * into listing, and only their presentational fields.
 */
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams.get("q") ?? undefined;
    return NextResponse.json({ profiles: await listDirectory(q) });
  } catch (err) {
    return apiError(err);
  }
}
