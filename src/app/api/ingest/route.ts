import { NextResponse } from "next/server";
import { ingestFile, ingestUrl } from "@/lib/ingest";
import { hasKey } from "@/lib/gemini";
import { hasDatabase } from "@/lib/db";
import { apiError } from "@/lib/api-error";
import { requireUser } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Vercel caps a function's request body at 4.5 MB on every plan, and exceeding
 * it fails at the platform edge with FUNCTION_PAYLOAD_TOO_LARGE before this
 * handler ever runs — so the app can only reject it politely by staying under.
 * Self-hosted deployments (Render, a container) have no such cap and can raise
 * this with NEXT_PUBLIC_MAX_UPLOAD_MB — the same variable the upload UI
 * reads, so the limit shown and the limit enforced can never drift apart.
 */
const MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 4);
const MAX_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

export async function POST(req: Request) {
  const session = await requireUser();
  if ("response" in session) return session.response;
  const { userId } = session;

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
    const contentType = req.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const { url } = (await req.json()) as { url?: string };
      if (!url || !/^https?:\/\//i.test(url)) {
        return NextResponse.json(
          { error: "Provide an http(s) URL." },
          { status: 400 },
        );
      }
      const result = await ingestUrl(userId, url);
      return NextResponse.json(result);
    }

    const form = await req.formData();
    const file = form.get("file");
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
    const result = await ingestFile(userId, {
      name: file.name,
      mime: file.type || "application/octet-stream",
      bytes,
    });
    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
