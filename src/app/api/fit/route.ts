import { NextResponse } from "next/server";
import { assessFit, tailoredResume } from "@/lib/fit";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/api-error";
import { hasKey } from "@/lib/gemini";
import { hasDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await requireUser();
  if ("response" in session) return session.response;

  if (!hasDatabase() || !hasKey()) {
    return NextResponse.json(
      {
        error: `${!hasDatabase() ? "DATABASE_URL" : "GEMINI_API_KEY"} is not configured.`,
        setup: true,
      },
      { status: 503 },
    );
  }

  try {
    const { jobDescription, withResume } = (await req.json()) as {
      jobDescription?: string;
      withResume?: boolean;
    };
    if (!jobDescription?.trim() || jobDescription.trim().length < 40) {
      return NextResponse.json(
        { error: "Paste the full job description — that was too short to read." },
        { status: 400 },
      );
    }

    const fit = await assessFit(session.userId, jobDescription);

    // The résumé is a second model call, so it is opt-in: most of the value
    // is in the fit report and not everyone wants to wait for both.
    const resume = withResume
      ? await tailoredResume(session.userId, jobDescription, fit).catch(() => "")
      : undefined;

    return NextResponse.json({ ...fit, resume });
  } catch (err) {
    return apiError(err);
  }
}
