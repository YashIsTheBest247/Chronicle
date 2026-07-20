import { NextResponse } from "next/server";

/**
 * Turns a thrown error into a response the UI can act on. Setup problems get
 * a 503 and a `setup` flag so pages can render instructions instead of a
 * generic failure — a misconfigured database is not the same as a bug.
 */
export function apiError(err: unknown) {
  const message =
    err instanceof Error ? err.message : "Something went wrong.";

  const isSetup =
    /DATABASE_URL|GEMINI_API_KEY|pgvector|extension "vector"/i.test(message);

  if (isSetup) {
    return NextResponse.json({ error: message, setup: true }, { status: 503 });
  }

  const isConnection =
    /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|connect_timeout|SASL|password auth/i.test(
      message,
    );

  if (isConnection) {
    return NextResponse.json(
      {
        error: `Could not reach the database. Check DATABASE_URL. (${message})`,
        setup: true,
      },
      { status: 503 },
    );
  }

  return NextResponse.json({ error: message }, { status: 500 });
}
