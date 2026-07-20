import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The mark is three linked nodes — the smallest possible drawing of the thing
 * Chronicle actually does.
 */
export function Logo({
  className,
  href = "/",
}: {
  className?: string;
  href?: string | null;
}) {
  const mark = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <path
          d="M6.5 8.5 L12 5 L17.5 8.5 M6.5 8.5 L6.5 15.5 L12 19 L17.5 15.5 L17.5 8.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.35"
        />
        <circle cx="12" cy="5" r="2.4" fill="#2D6BFF" />
        <circle cx="6.5" cy="15.5" r="2.4" fill="currentColor" />
        <circle cx="17.5" cy="15.5" r="2.4" fill="currentColor" />
      </svg>
      <span className="font-display text-[1.125rem] font-semibold tracking-tight">
        Chronicle
      </span>
    </span>
  );

  if (!href) return mark;
  return (
    <Link href={href} className="transition-opacity hover:opacity-70">
      {mark}
    </Link>
  );
}
