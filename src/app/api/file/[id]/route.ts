import { readFileBytes } from "@/lib/store";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves the original upload back byte-for-byte. Nothing in Chronicle rewrites
 * a source file, so what comes out here is exactly what went in.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Files are the most sensitive thing Chronicle holds, so ownership is
  // checked in the query itself: a wrong owner gets 404, not the bytes.
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return new Response("Sign in to download files.", { status: 401 });

  let stored: Awaited<ReturnType<typeof readFileBytes>>;
  try {
    stored = await readFileBytes(userId, id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Storage unavailable";
    return new Response(message, { status: 503 });
  }

  if (!stored) return new Response("Not found", { status: 404 });

  const { file, bytes } = stored;
  const disposition = new URL(req.url).searchParams.has("download")
    ? "attachment"
    : "inline";

  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.mime || "application/octet-stream",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `${disposition}; filename="${encodeURIComponent(file.name)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
