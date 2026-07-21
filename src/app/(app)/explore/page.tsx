"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Loader2, Search, Users } from "lucide-react";
import { useT } from "@/lib/i18n";

interface Entry {
  handle: string;
  name: string | null;
  image: string | null;
  headline: string | null;
  records: number;
  skills: string[];
}

/**
 * Public directory of opted-in profiles.
 *
 * It lives inside the (app) group so it shares the persistent AppNav — moving
 * to Explore from any app page keeps the same nav instance rather than
 * unmounting and remounting it, which is what made the bar flash. The page is
 * still public: `/explore` is deliberately absent from the middleware matcher,
 * and the group layout renders the nav for signed-out visitors too.
 */
export default function ExplorePage() {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [profiles, setProfiles] = useState<Entry[] | null>(null);
  const timer = useRef<number | null>(null);

  const load = useCallback(async (query: string) => {
    const res = await fetch(
      `/api/directory${query ? `?q=${encodeURIComponent(query)}` : ""}`,
    );
    if (res.ok) setProfiles((await res.json()).profiles);
  }, []);

  useEffect(() => {
    load("");
  }, [load]);

  // Debounce the search so each keystroke does not fire a request.
  function onSearch(value: string) {
    setQ(value);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => load(value), 250);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="max-w-2xl">
        <p className="eyebrow">{t("explore.eyebrow")}</p>
        <h1 className="t-page mt-2 text-balance">{t("explore.title")}</h1>
        <p className="mt-3 text-[1.0625rem] leading-relaxed text-muted text-pretty">
          {t("explore.sub")}
        </p>
      </div>

      <div className="card mt-8 flex items-center gap-3 px-5 py-3.5">
        <Search size={17} className="shrink-0 text-faint" />
        <input
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t("explore.search")}
          className="w-full bg-transparent text-[0.9375rem] outline-none placeholder:text-faint"
        />
      </div>

      {profiles === null ? (
        <div className="grid place-items-center py-24 text-faint">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : profiles.length === 0 ? (
        <div className="py-24 text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-mist text-faint">
            <Users size={20} />
          </div>
          <p className="mt-4 text-[1rem] text-muted">
            {q ? t("explore.noMatch") : t("explore.empty")}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((p) => (
            <Link
              key={p.handle}
              href={`/p/${p.handle}`}
              className="card group flex flex-col p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_28px_-14px_rgb(22_20_15_/_0.22)]"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border border-line text-muted">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" className="size-full object-cover" />
                  ) : (
                    <span className="text-[1rem] font-semibold">
                      {(p.name ?? p.handle).slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {p.name ?? `@${p.handle}`}
                  </p>
                  <p className="truncate text-[0.8125rem] text-faint">
                    @{p.handle}
                  </p>
                </div>
                <ArrowUpRight
                  size={15}
                  className="shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100"
                />
              </div>

              {p.headline && (
                <p className="mt-3 line-clamp-2 text-[0.875rem] leading-relaxed text-muted text-pretty">
                  {p.headline}
                </p>
              )}

              {p.skills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.skills.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-mist px-2 py-0.5 text-[0.6875rem] font-medium text-graphite"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <p className="mt-auto pt-3 text-[0.75rem] text-faint">
                {p.records} {t("explore.records")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
