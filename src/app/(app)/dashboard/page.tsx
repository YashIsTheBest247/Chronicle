"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Upload, Waypoints } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { CategoryPill } from "@/components/CategoryPill";
import { ItemCard } from "@/components/ItemCard";
import { SetupNotice } from "@/components/SetupNotice";
import { DashboardSkeleton } from "@/components/Skeleton";
import { CATEGORIES, type ClientItem } from "@/lib/types";
import { useCategoryLabel, useT } from "@/lib/i18n";
import { categoryColor, cn } from "@/lib/utils";

interface Payload {
  items: ClientItem[];
  counts: Record<string, number>;
  total: number;
  relations: number;
  skills: { name: string; count: number }[];
}

export default function Dashboard() {
  const { t } = useT();
  const catLabel = useCategoryLabel();
  const [data, setData] = useState<Payload | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/items");
    const body = await res.json();
    if (!res.ok) {
      setSetupError(body.error ?? "Could not load your Chronicle.");
      return;
    }
    setSetupError(null);
    setData(body);
  }

  useEffect(() => {
    refresh();
  }, []);

  if (setupError) return <SetupNotice message={setupError} />;

  if (!data) return <DashboardSkeleton />;

  if (data.total === 0) return <EmptyState />;

  const visible = filter
    ? data.items.filter((i) => i.category === filter)
    : data.items;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t("dash.eyebrow")}</p>
          <h1 className="t-page mt-2">
            {data.total} {t("dash.records")}, {data.relations} {t("dash.connections")}
          </h1>
        </div>
        <Link href="/upload" className="btn btn-ghost !py-2 !text-sm">
          <Upload size={14} />
          {t("dash.addRecords")}
        </Link>
      </header>

      <Stats data={data} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter(null)}
          className={cn(
            "pill transition-colors",
            filter === null
              ? "border-fg/25 bg-mist text-fg"
              : "text-muted hover:bg-mist/60",
          )}
        >
          {t("dash.all")}
          <span className="text-faint tabular-nums">{data.total}</span>
        </button>
        {CATEGORIES.filter((c) => (data.counts[c] ?? 0) > 0).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(filter === c ? null : c)}
            className={cn(
              "transition-opacity",
              filter && filter !== c && "opacity-45",
            )}
          >
            <CategoryPill category={c} count={data.counts[c]} />
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function Stats({ data }: { data: Payload }) {
  const { t } = useT();
  const catLabel = useCategoryLabel();
  const topSkills = data.skills.slice(0, 10);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <div className="card p-5">
        <p className="eyebrow">{t("dash.distribution")}</p>
        <div className="mt-4 space-y-2.5">
          {CATEGORIES.filter((c) => (data.counts[c] ?? 0) > 0).map((c) => {
            const n = data.counts[c];
            const pct = Math.round((n / data.total) * 100);
            return (
              <div key={c} className="flex items-center gap-3">
                <span className="w-20 shrink-0 truncate text-[0.8125rem] text-muted sm:w-28 sm:text-[0.875rem]">
                  {catLabel(c)}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-mist">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, background: categoryColor(c) }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-[0.8125rem] tabular-nums text-faint">
                  {n}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card flex flex-col p-5">
        <div className="flex items-center justify-between">
          <p className="eyebrow">{t("dash.skills")}</p>
          <Link
            href="/graph"
            className="inline-flex items-center gap-1 text-[0.8125rem] text-muted transition-colors hover:text-fg"
          >
            <Waypoints size={12} />
            {t("dash.viewGraph")}
          </Link>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {topSkills.map((s) => (
            <span
              key={s.name}
              className="pill text-graphite"
              // Frequency reads as weight — the skills you've proven most often
              // are literally heavier on the page.
              style={{ fontWeight: 400 + Math.min(s.count, 4) * 50 }}
            >
              {s.name}
              {s.count > 1 && (
                <span className="text-faint tabular-nums">{s.count}</span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  const { t } = useT();
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-full bg-mist text-graphite">
        <LogoMark size={26} spin />
      </div>
      <h1 className="t-page mt-6">{t("dash.emptyTitle")}</h1>
      <p className="mt-3 text-[1rem] leading-relaxed text-muted text-pretty">
        {t("dash.emptyBody")}
      </p>
      <div className="mt-8 flex justify-center">
        <Link href="/upload" className="btn btn-primary">
          <Upload size={15} />
          {t("dash.addFirst")}
        </Link>
      </div>
    </div>
  );
}
