"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  GitBranch,
  LogOut,
  Settings,
  LayoutGrid,
  Moon,
  Search,
  Sun,
  Upload,
  Waypoints,
} from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/timeline", label: "Timeline", icon: GitBranch },
  { href: "/graph", label: "Graph", icon: Waypoints },
  { href: "/search", label: "Search", icon: Search },
];

/** Same floating pill as the marketing site, carrying the app's own tabs. */
export function AppNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
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

  return (
    <div className="fixed inset-x-0 top-4 z-50 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="nav-shell nav-shell-light">
          <Logo href="/" />

          <nav className="ml-3 hidden items-center gap-0.5 md:flex">
            {TABS.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "nav-link inline-flex items-center gap-1.5",
                    active
                      ? "bg-mist text-fg"
                      : "text-muted hover:bg-mist/70 hover:text-fg",
                  )}
                >
                  <Icon size={14} />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              className="grid size-10 place-items-center rounded-full border border-line text-muted transition-colors hover:bg-mist hover:text-fg"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <Link href="/upload" className="btn btn-primary !px-5 !py-2.5">
              <Upload size={14} />
              Add
            </Link>

            {/* Account menu — also the only place to sign out. */}
            <div className="relative">
              <button
                onClick={() => setMenu((v) => !v)}
                aria-label="Account"
                className="grid size-10 place-items-center overflow-hidden rounded-full border border-line text-muted transition-colors hover:bg-mist"
              >
                {session?.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="text-[0.875rem] font-semibold">
                    {(session?.user?.name ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </button>

              {menu && (
                <>
                  <button
                    aria-hidden="true"
                    tabIndex={-1}
                    onClick={() => setMenu(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div className="card absolute right-0 z-20 mt-2 w-60 p-2">
                    <div className="border-b border-lineSoft px-3 py-2">
                      <p className="truncate text-[0.875rem] font-medium">
                        {session?.user?.name ?? "Signed in"}
                      </p>
                      <p className="truncate text-[0.8125rem] text-faint">
                        {session?.user?.email}
                      </p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setMenu(false)}
                      className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-[0.9375rem] text-muted hover:bg-mist hover:text-fg"
                    >
                      <Settings size={15} />
                      Settings
                    </Link>
                    <button
                      onClick={() => signOut({ redirectTo: "/" })}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[0.9375rem] text-muted hover:bg-mist hover:text-fg"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs wrap below the bar on narrow screens rather than collapsing */}
        <div className="nav-shell nav-shell-light relative mt-2 !px-2 !py-1.5 md:hidden">
          <nav className="scrollbar-thin flex w-full items-center gap-1 overflow-x-auto">
            {TABS.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "nav-link inline-flex shrink-0 items-center gap-1.5 !text-[0.875rem]",
                    active ? "bg-mist text-fg" : "text-muted",
                  )}
                >
                  <Icon size={13} />
                  {label}
                </Link>
              );
            })}
          </nav>
          {/* Right-edge fade: the only cue that this row scrolls. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-full bg-gradient-to-l from-paper to-transparent"
          />
        </div>
      </div>
    </div>
  );
}
