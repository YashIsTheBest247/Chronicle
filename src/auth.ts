import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { upsertUser } from "@/lib/users";

/**
 * Full auth setup — the edge-safe config plus the callbacks that touch
 * Postgres. Only ever imported from Node contexts (route handlers, server
 * components); middleware uses auth.config.ts directly instead.
 *
 * No database adapter: Chronicle owns its `users` table and every record is
 * keyed by that id, so the account is upserted on first sign-in and the
 * Chronicle user id rides along in the token. One source of truth for
 * ownership rather than a set of adapter tables beside it.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async jwt({ token, user }) {
      // `user` is only present on the sign-in pass; afterwards the id is
      // already on the token, so steady-state requests cost no query.
      if (user?.email) {
        const record = await upsertUser({
          email: user.email,
          name: user.name,
          image: user.image,
        });
        token.chronicleId = record.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.chronicleId) {
        session.user.id = token.chronicleId as string;
      }
      return session;
    },
  },
});
