import type { DefaultSession } from "next-auth";

/** Carries Chronicle's own user id onto the session, alongside Google's profile. */
declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    chronicleId?: string;
  }
}
