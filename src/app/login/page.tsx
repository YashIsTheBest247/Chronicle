import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { auth, signIn } from "@/auth";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Sign in · Chronicle" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const session = await auth();

  // Already signed in — skip the page entirely.
  if (session?.user?.id) redirect(next || "/dashboard");

  const configured =
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET;

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-16">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-[0.9375rem] text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft size={15} />
          Back
        </Link>

        <div className="card p-8">
          <Logo href={null} />

          <h1 className="t-page mt-6">Sign in to Chronicle</h1>
          <p className="mt-3 text-[1rem] leading-relaxed text-muted text-pretty">
            Your records are private to your account. Nobody else can see or
            download them.
          </p>

          {configured ? (
            <form
              action={async () => {
                "use server";
                await signIn("google", {
                  redirectTo: next || "/dashboard",
                });
              }}
              className="mt-7"
            >
              <button type="submit" className="btn btn-primary w-full !py-3.5">
                <GoogleMark />
                Continue with Google
              </button>
            </form>
          ) : (
            <div className="panel mt-7 p-4">
              <p className="flex items-center gap-2 text-[0.9375rem] font-medium">
                <Lock size={15} />
                Google sign-in is not configured
              </p>
              <p className="mt-2 text-[0.875rem] leading-relaxed text-muted text-pretty">
                Set <code className="font-mono">AUTH_GOOGLE_ID</code>,{" "}
                <code className="font-mono">AUTH_GOOGLE_SECRET</code> and{" "}
                <code className="font-mono">AUTH_SECRET</code> on the server,
                then reload.
              </p>
            </div>
          )}

          <p className="mt-6 border-t border-lineSoft pt-5 text-[0.875rem] leading-relaxed text-faint text-pretty">
            Chronicle stores the documents you upload so it can hand them back.
            Sign out any time; deleting a record deletes its original file too.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5h-1.9V20H24v8h11.3A12 12 0 1 1 24 12c3 0 5.8 1.1 8 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-8 20-20 0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 8 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C37 41 44 36 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
