import { NextResponse } from "next/server";
import { ingestFile, ingestUrl } from "@/lib/ingest";
import { hasKey } from "@/lib/gemini";
import { hasDatabase } from "@/lib/db";
import { apiError } from "@/lib/api-error";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req: Request) {
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
      const result = await ingestUrl(url);
      return NextResponse.json(result);
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `${file.name} is larger than the 20 MB limit.` },
        { status: 413 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await ingestFile({
      name: file.name,
      mime: file.type || "application/octet-stream",
      bytes,
    });
    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
