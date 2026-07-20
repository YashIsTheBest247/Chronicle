import { NextResponse } from "next/server";
import { getPublicProfile } from "@/lib/profile";
import { apiError } from "@/lib/api-error";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The only unauthenticated data route in Chronicle.
 *
 * It can expose exactly one thing: a profile whose owner set
 * profile_public = true, and only the metadata getPublicProfile selects —
 * never file bytes, never source text, never another account's rows.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  try {
    const { handle } = await params;
    const profile = await getPublicProfile(handle);
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(profile);
  } catch (err) {
    return apiError(err);
  }
}
