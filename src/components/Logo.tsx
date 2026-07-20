"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * The mark: a continuous ring with three moments set on it, one accented.
 *
 * The ring is time; the nodes are records placed along it, sized by weight.
 * It reads as an orbit rather than a chart, which keeps it calm at 20px — the
 * size it is actually used at — where anything more literal turns to mush.
 */
export function LogoMark({
  size = 24,
  spin = false,
}: {
  size?: number;
  spin?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0 overflow-visible", spin && "logo-spin")}
    >
      {/* Outer orbit, opened at the top-left so it reads as a path with a
          beginning rather than a closed circle. */}
      <path
        d="M8.6 6.4a12 12 0 1 1-2.2 2.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.38"
      />
      {/* Inner arc — a second, earlier pass around the same track. */}
      <path
        d="M16 9.5a6.5 6.5 0 0 1 6.2 8.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.22"
      />

      {/* Three moments on the ring, weighted. The accented one is the latest. */}
      <circle cx="16" cy="4" r="2.75" fill="#2D6BFF" />
      <circle cx="5.6" cy="22" r="2.15" fill="currentColor" />
      <circle cx="26.4" cy="22" r="1.7" fill="currentColor" opacity="0.75" />
    </svg>
  );
}

export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string | null;
}) {
  const pathname = usePathname();

  const mark = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={22} />
      <span className="font-display text-[1.125rem] font-semibold tracking-[-0.02em]">
        Chronicle
      </span>
    </span>
  );

  if (!href) return mark;

  return (
    <Link
      href={href}
      aria-label="Chronicle — back to top"
      onClick={(e) => {
        if (pathname !== href) return; // let the router handle a real navigation
        e.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
        });
      }}
      className="rounded-full transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2D6BFF]"
    >
      {mark}
    </Link>
  );
}
