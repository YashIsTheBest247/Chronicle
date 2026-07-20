"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, Moon, Search, Sun, X } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { LanguageSwitch } from "./LanguageSwitch";

const LINKS = [
  { href: "#how", key: "nav.how" },
  { href: "#modules", key: "nav.what" },
  { href: "#retrieval", key: "nav.retrieval" },
  { href: "/explore", key: "nav.explore" },
  { href: "/dashboard", key: "nav.dashboard" },
  // Points at Settings, where the connect steps live. Signed-out visitors get
  // bounced through /login and land back here, which is the right flow anyway
  // — linking a chat requires an account.
  { href: "/settings", key: "nav.telegram" },
] as const;

/**
 * Floating pill navigation. It rides over a dark hero, so it starts in a dark
 * tint and flips to the paper tint once the page has scrolled past that hero.
 */
export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const { t } = useT();

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));

    const hero = document.getElementById("hero");
    if (!hero) {
      setScrolled(true); // no dark hero on this page — use the paper tint
      return;
    }

    /**
     * Flip exactly at the hero's edge. The observer's root is inset from the
     * top by the bar's own height, so "hero stopped intersecting" means
     * precisely "the bar is no longer over the hero" — which scroll-offset
     * arithmetic kept getting subtly wrong across viewport sizes.
     */
    let observer: IntersectionObserver | null = null;

    const attach = () => {
      observer?.disconnect();
      const navBottom = 16 + (navRef.current?.offsetHeight ?? 64);
      observer = new IntersectionObserver(
        ([entry]) => setScrolled(!entry.isIntersecting),
        { rootMargin: `-${navBottom}px 0px 0px 0px`, threshold: 0 },
      );
      observer.observe(hero);
    };

    attach();
    window.addEventListener("resize", attach);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", attach);
    };
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("chronicle.theme", next ? "dark" : "light");
    } catch {
      // Private browsing — the toggle still works for this session.
    }
  }

  // Over the hero the bar must read as light-on-dark regardless of theme.
  const onDark = !scrolled;

  return (
    <div className="fixed inset-x-0 top-4 z-50 px-4">
      <div className="mx-auto max-w-6xl">
        <div
          ref={navRef}
          className={cn(
            "nav-shell",
            onDark ? "nav-shell-dark" : "nav-shell-light",
          )}
        >
          <Logo className={onDark ? "text-white" : undefined} />

          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "nav-link",
                  onDark
                    ? "text-white/75 hover:bg-white/10 hover:text-white"
                    : "text-muted hover:bg-mist hover:text-fg",
                )}
              >
                {t(l.key)}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              className={cn(
                "grid size-10 place-items-center rounded-full border transition-colors",
                onDark
                  ? "border-white/15 text-white/80 hover:bg-white/10"
                  : "border-line text-muted hover:bg-mist hover:text-fg",
              )}
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <LanguageSwitch onDark={onDark} compact />

            <Link
              href="/search"
              className={cn(
                "hidden items-center gap-2 rounded-full border px-4 py-2.5 text-[0.9375rem] font-medium transition-colors md:inline-flex",
                onDark
                  ? "border-white/15 text-white/80 hover:bg-white/10"
                  : "border-line text-muted hover:bg-mist hover:text-fg",
              )}
            >
              <Search size={15} />
              {t("nav.search")}
            </Link>

            <Link
              href="/dashboard"
              className={cn(
                "btn hidden !px-5 !py-2.5 sm:inline-flex",
                onDark ? "btn-invert" : "btn-primary",
              )}
            >
              {t("nav.open")}
              <ArrowUpRight size={15} />
            </Link>

            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Toggle menu"
              className={cn(
                "grid size-10 place-items-center rounded-full border transition-colors lg:hidden",
                onDark
                  ? "border-white/15 text-white/80"
                  : "border-line text-muted",
              )}
            >
              {open ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="card mt-2 space-y-1 p-3 lg:hidden">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-full px-4 py-2.5 text-[1rem] font-medium text-muted hover:bg-mist hover:text-fg"
              >
                {t(l.key)}
              </Link>
            ))}
            <Link
              href="/dashboard"
              className="btn btn-primary mt-1 w-full"
              onClick={() => setOpen(false)}
            >
              {t("nav.open")}
              <ArrowUpRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
