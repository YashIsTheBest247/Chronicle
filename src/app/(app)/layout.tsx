import { SessionProvider } from "next-auth/react";
import { AppNav } from "@/components/AppNav";
import { PageTransition } from "@/components/PageTransition";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // SessionProvider is what lets the nav read the account client-side.
    // Middleware has already guaranteed a session by the time this renders.
    <SessionProvider>
      <div className="min-h-dvh">
        <AppNav />
        {/* Clears the floating bar; the mobile menu is an overlay, not a row. */}
        <main className="mx-auto max-w-6xl px-4 pt-24 pb-16 sm:px-5 sm:pt-28">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </SessionProvider>
  );
}
