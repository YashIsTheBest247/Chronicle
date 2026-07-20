import { AppNav } from "@/components/AppNav";
import { PageTransition } from "@/components/PageTransition";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <AppNav />
      {/* Extra top padding on small screens clears the wrapped tab row. */}
      <main className="mx-auto max-w-6xl px-4 pt-36 pb-16 sm:px-5 md:pt-28">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
