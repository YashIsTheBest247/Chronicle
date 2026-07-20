import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

// Built from the edge-safe config only — importing @/auth here would drag
// the Postgres client into the Edge runtime and fail the build.
const { auth } = NextAuth(authConfig);

/**
 * Gate on the app shell. Every API route re-checks the session itself —
 * middleware is not the authorisation boundary, it just spares signed-out
 * visitors a flash of empty UI before the redirect.
 */
export default auth((req) => {
  if (req.auth) return NextResponse.next();

  const url = new URL("/login", req.nextUrl.origin);
  // Return them to whatever they were reaching for after signing in.
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/timeline/:path*",
    "/graph/:path*",
    "/search/:path*",
    "/upload/:path*",
    "/record/:path*",
    "/settings/:path*",
  ],
};
