"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  GitBranch,
  LayoutGrid,
  LogOut,
  Menu,
  Moon,
  Search,
  Send,
  Settings,
  Sun,
  Target,
  Upload,
  Waypoints,
  X,
} from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";
import { LanguageSwitch } from "./LanguageSwitch";

const TABS = [
  { href: "/dashboard", key: "nav.overview", icon: LayoutGrid },
  { href: "/timeline", key: "nav.timeline", icon: GitBranch },
  { href: "/graph", key: "nav.graph", icon: Waypoints },
  { href: "/search", key: "nav.search", icon: Search },
  { href: "/fit", key: "nav.fit", icon: Target },
  { href: "/settings", key: "nav.telegram", icon: Send },
] as const;

/**
 * The floating pill, carrying the app's tabs.
 *
 * Six tabs cannot fit a phone, so below `lg` they collapse into a sheet behind
 * a hamburger. The previous horizontally-scrolling row technically fitted but
 * hid half the destinations behind a gesture nobody knows to make.
 */
export function AppNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [dark, setDark] = useState(false);
  const [account, setAccount] = useState(false);
  const [menu, setMenu] = useState(false);
  const { t } = useT();

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  // Close the sheet on navigation, or it stays open over the new page.
  useEffect(() => {
    setMenu(false);
    setAccount(false);
  }, [pathname]);

  // A fixed, scrollable sheet over a scrollable page scrolls the wrong thing.
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);

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
    <div className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-4">
      <div className="mx-auto max-w-6xl">
        <div className="nav-shell nav-shell-light !pl-4 sm:!pl-6">
          <Logo href="/" />

          <nav className="ml-3 hidden items-center gap-0.5 lg:flex">
            {TABS.map(({ href, key, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "nav-link inline-flex items-center gap-1.5 !px-3",
                    active
                      ? "bg-mist text-fg"
                      : "text-muted hover:bg-mist/70 hover:text-fg",
                  )}
                >
                  <Icon size={14} />
                  {t(key)}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={toggleTheme}
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              className="hidden size-10 place-items-center rounded-full border border-line text-muted transition-colors hover:bg-mist hover:text-fg sm:grid"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <span className="hidden sm:block">
              <LanguageSwitch compact />
            </span>

            <Link
              href="/upload"
              className="btn btn-primary !px-4 !py-2.5 sm:!px-5"
            >
              <Upload size={14} />
              <span className="hidden sm:inline">{t("nav.add")}</span>
            </Link>

            {/* Account — the only place to sign out. */}
            <div className="relative hidden lg:block">
              <button
                onClick={() => setAccount((v) => !v)}
                aria-label="Account"
                className="grid size-10 place-items-center overflow-hidden rounded-full border border-line text-muted transition-colors hover:bg-mist"
              >
                <Avatar session={session} />
              </button>

              {account && (
                <>
                  <button
                    aria-hidden="true"
                    tabIndex={-1}
                    onClick={() => setAccount(false)}
                    className="fixed inset-0 z-10 cursor-default"
                  />
                  <div className="card absolute right-0 z-20 mt-2 w-60 p-2">
                    <AccountBlock session={session} t={t} />
                    <Link
                      href="/settings"
                      className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-[0.9375rem] text-muted hover:bg-mist hover:text-fg"
                    >
                      <Settings size={15} />
                      {t("nav.settings")}
                    </Link>
                    <button
                      onClick={() => signOut({ redirectTo: "/" })}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[0.9375rem] text-muted hover:bg-mist hover:text-fg"
                    >
                      <LogOut size={15} />
                      {t("nav.signOut")}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Hamburger — every destination lives here below lg. */}
            <button
              onClick={() => setMenu((v) => !v)}
              aria-label={menu ? "Close menu" : "Open menu"}
              aria-expanded={menu}
              className="grid size-10 place-items-center rounded-full border border-line text-muted transition-colors hover:bg-mist hover:text-fg lg:hidden"
            >
              <span className="icon-swap" data-open={menu}>
                <Menu size={18} className={menu ? "is-hidden" : "is-shown"} />
                <X size={18} className={menu ? "is-shown" : "is-hidden"} />
              </span>
            </button>
          </div>
        </div>

        {menu && (
          <div className="card panel-in mt-2 max-h-[calc(100dvh-6.5rem)] overflow-y-auto p-2 lg:hidden">
            <div className="border-b border-lineSoft px-3 pt-1 pb-3">
              <AccountBlock session={session} t={t} />
            </div>

            <nav className="mt-2 grid gap-0.5">
              {TABS.map(({ href, key, icon: Icon }) => {
                const active = pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-2xl px-3 py-3 text-[1rem] font-medium transition-colors",
                      active
                        ? "bg-mist text-fg"
                        : "text-muted hover:bg-mist/60 hover:text-fg",
                    )}
                  >
                    <Icon size={17} />
                    {t(key)}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-2 flex items-center gap-2 border-t border-lineSoft px-1 pt-3">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 rounded-full border border-line px-3.5 py-2.5 text-[0.9375rem] text-muted"
              >
                {dark ? <Sun size={15} /> : <Moon size={15} />}
                {dark ? "Light" : "Dark"}
              </button>
              <LanguageSwitch />
            </div>

            <button
              onClick={() => signOut({ redirectTo: "/" })}
              className="mt-2 flex w-full items-center gap-2.5 rounded-2xl px-3 py-3 text-left text-[1rem] text-muted hover:bg-mist hover:text-fg"
            >
              <LogOut size={17} />
              {t("nav.signOut")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type Session = ReturnType<typeof useSession>["data"];

function Avatar({ session }: { session: Session }) {
  if (session?.user?.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={session.user.image} alt="" className="size-full object-cover" />;
  }
  return (
    <span className="text-[0.875rem] font-semibold">
      {(session?.user?.name ?? "?").slice(0, 1).toUpperCase()}
    </span>
  );
}

function AccountBlock({
  session,
  t,
}: {
  session: Session;
  t: (k: "nav.signedIn") => string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-line text-muted">
        <Avatar session={session} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[0.9375rem] font-medium">
          {session?.user?.name ?? t("nav.signedIn")}
        </p>
        <p className="truncate text-[0.8125rem] text-faint">
          {session?.user?.email}
        </p>
      </div>
    </div>
  );
}
