import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Edge-safe half of the auth setup.
 *
 * Middleware runs on the Edge runtime, which cannot load `node:fs` — and the
 * database layer transitively does. So the provider list and page config live
 * here with no database imports, and the callbacks that touch Postgres live in
 * auth.ts, which only ever runs in Node.
 *
 * Middleware needs nothing more than "is there a valid JWT", which this half
 * can answer on its own.
 */
export default {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // Auth.js only infers a trusted host on Vercel. Everywhere else — Render,
  // a container, localhost on a non-default port — it throws UntrustedHost
  // and every sign-in fails. Render terminates TLS at its proxy and sets
  // X-Forwarded-*, which is exactly what this tells Auth.js to believe.
  trustHost: true,
} satisfies NextAuthConfig;
