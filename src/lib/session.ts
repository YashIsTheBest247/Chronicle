import "server-only";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Resolves the signed-in Chronicle user for an API route.
 *
 * Returns either a user id or a ready-made 401. Routes are written as:
 *
 *   const session = await requireUser();
 *   if ("response" in session) return session.response;
 *   // session.userId is now a definite string
 *
 * which makes it impossible to reach the query layer without an id — the
 * type system rules out the "forgot the auth check" bug.
 */
export async function requireUser(): Promise<
  { userId: string } | { response: NextResponse }
> {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return {
      response: NextResponse.json(
        { error: "Sign in to use Chronicle.", unauthenticated: true },
        { status: 401 },
      ),
    };
  }

  return { userId };
}
