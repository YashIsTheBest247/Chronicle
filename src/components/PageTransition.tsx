"use client";

import { usePathname } from "next/navigation";

/**
 * Re-runs the enter animation on every route change by keying the wrapper on
 * the pathname — React tears down the old subtree and mounts a new one, which
 * restarts the CSS animation. A plain class would only ever fire once.
 *
 * Deliberately CSS rather than a motion library: this is a fade-and-lift on
 * navigation, and it does not justify shipping an animation runtime.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-in">
      {children}
    </div>
  );
}
