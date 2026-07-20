import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/api-error";
import { getProfileSettings, saveProfileSettings } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireUser();
  if ("response" in session) return session.response;
  try {
    return NextResponse.json(await getProfileSettings(session.userId));
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: Request) {
  const session = await requireUser();
  if ("response" in session) return session.response;
  try {
    const body = (await req.json()) as {
      handle?: string;
      isPublic?: boolean;
      headline?: string;
    };
    const result = await saveProfileSettings(session.userId, body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(await getProfileSettings(session.userId));
  } catch (err) {
    return apiError(err);
  }
}
