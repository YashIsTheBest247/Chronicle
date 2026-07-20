import { NextResponse } from "next/server";
import { assessFit, tailoredResume } from "@/lib/fit";
import { extractPlainText } from "@/lib/extract";
import { requireUser } from "@/lib/session";
import { apiError } from "@/lib/api-error";
import { hasKey } from "@/lib/gemini";
import { hasDatabase } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 4);
const MAX_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/**
 * Assesses a job posting against the signed-in user's records.
 *
 * The posting is never persisted. It is read into memory, used for the length
 * of this request, and discarded — this route deliberately imports
 * `extractPlainText` rather than the ingest pipeline, so there is no reachable
 * path from here to `saveFile` or `addItem`. Someone else's job description
 * has no business in your Chronicle.
 */
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
    let jobDescription = "";
    let withResume = false;
    let sourceName: string | null = null;

    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      withResume = form.get("withResume") === "true";

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file provided." }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: `${file.name} is larger than the ${MAX_UPLOAD_MB} MB limit.` },
          { status: 413 },
        );
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      sourceName = file.name;
      jobDescription = await extractPlainText({
        name: file.name,
        mime: file.type || "application/octet-stream",
        bytes,
      });
      // `bytes` falls out of scope here — nothing reached disk or Postgres.

      if (jobDescription.trim().length < 40) {
        return NextResponse.json(
          { error: `Could not read enough text from ${file.name}.` },
          { status: 400 },
        );
      }
    } else {
      const body = (await req.json()) as {
        jobDescription?: string;
        withResume?: boolean;
      };
      jobDescription = body.jobDescription ?? "";
      withResume = Boolean(body.withResume);

      if (jobDescription.trim().length < 40) {
        return NextResponse.json(
          { error: "Paste the full job description — that was too short to read." },
          { status: 400 },
        );
      }
    }

    const fit = await assessFit(session.userId, jobDescription);

    // The résumé is a second model call, so it is opt-in: most of the value
    // is in the fit report and not everyone wants to wait for both.
    const resume = withResume
      ? await tailoredResume(session.userId, jobDescription, fit).catch(() => "")
      : undefined;

    return NextResponse.json({ ...fit, resume, sourceName });
  } catch (err) {
    return apiError(err);
  }
}
