"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, Upload, Waypoints } from "lucide-react";
import { CategoryPill } from "@/components/CategoryPill";
import { ItemCard } from "@/components/ItemCard";
import { SetupNotice } from "@/components/SetupNotice";
import { DashboardSkeleton } from "@/components/Skeleton";
import { CATEGORIES, type ClientItem } from "@/lib/types";
import { categoryColor, cn } from "@/lib/utils";

interface Payload {
  items: ClientItem[];
  counts: Record<string, number>;
  total: number;
  relations: number;
  skills: { name: string; count: number }[];
}

export default function Dashboard() {
  const [data, setData] = useState<Payload | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

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

  async function loadDemo() {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Seeding failed");
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Seeding failed");
    } finally {
      setSeeding(false);
    }
  }

  if (setupError) return <SetupNotice message={setupError} />;

  if (!data) return <DashboardSkeleton />;

  if (data.total === 0) {
    return <EmptyState onSeed={loadDemo} seeding={seeding} />;
  }

  const visible = filter
    ? data.items.filter((i) => i.category === filter)
    : data.items;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Overview</p>
          <h1 className="t-page mt-2">
            {data.total} records, {data.relations} connections
          </h1>
        </div>
        <Link href="/upload" className="btn btn-ghost !py-2 !text-sm">
          <Upload size={14} />
          Add records
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
          All
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
  const topSkills = data.skills.slice(0, 10);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <div className="card p-5">
        <p className="eyebrow">Distribution</p>
        <div className="mt-4 space-y-2.5">
          {CATEGORIES.filter((c) => (data.counts[c] ?? 0) > 0).map((c) => {
            const n = data.counts[c];
            const pct = Math.round((n / data.total) * 100);
            return (
              <div key={c} className="flex items-center gap-3">
                <span className="w-20 shrink-0 truncate text-[0.8125rem] text-muted sm:w-28 sm:text-[0.875rem]">
                  {c}
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
          <p className="eyebrow">Skills detected</p>
          <Link
            href="/graph"
            className="inline-flex items-center gap-1 text-[0.8125rem] text-muted transition-colors hover:text-fg"
          >
            <Waypoints size={12} />
            View graph
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

function EmptyState({
  onSeed,
  seeding,
}: {
  onSeed: () => void;
  seeding: boolean;
}) {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-mist text-faint">
        <Sparkles size={20} />
      </div>
      <h1 className="t-page mt-6">
        Your Chronicle is empty.
      </h1>
      <p className="mt-3 text-[1rem] leading-relaxed text-muted text-pretty">
        Add a certificate, a project report, or an internship letter and it will
        organise, categorise, and connect itself. Or load a demo journey to see
        what that looks like with four years already in it.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/upload" className="btn btn-primary">
          <Upload size={15} />
          Add your first record
        </Link>
        <button
          onClick={onSeed}
          disabled={seeding}
          className="btn btn-ghost disabled:opacity-50"
        >
          {seeding ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Building demo…
            </>
          ) : (
            "Load demo journey"
          )}
        </button>
      </div>
    </div>
  );
}
