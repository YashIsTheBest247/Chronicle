"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CategoryPill } from "@/components/CategoryPill";
import { ListSkeleton } from "@/components/Skeleton";
import { categoryColor, formatDate } from "@/lib/utils";
import type { ClientItem } from "@/lib/types";

interface Payload {
  years: { year: string; items: ClientItem[] }[];
  total: number;
}

export default function TimelinePage() {
  const [data, setData] = useState<Payload | null>(null);

  useEffect(() => {
    fetch("/api/timeline")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="skeleton h-8 w-64 max-w-full" />
        <ListSkeleton count={5} />
      </div>
    );
  }

  if (data.total === 0) {
    return (
      <p className="py-32 text-center text-[1rem] text-faint">
        Nothing on the timeline yet.{" "}
        <Link href="/upload" className="inline-block py-1.5 text-fg underline underline-offset-4">
          Add a record
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="eyebrow">Digital journey</p>
        <h1 className="t-page mt-2 text-balance">
          How you got here, year by year.
        </h1>
        <p className="mt-2 text-[1rem] text-muted">
          Assembled from the dates inside your own documents.
        </p>
      </header>

      <div className="space-y-10">
        {data.years.map(({ year, items }) => (
          <section key={year}>
            <div className="sticky top-28 z-10 -mx-1 mb-4 flex items-center gap-3 bg-canvas/90 px-1 py-1.5 backdrop-blur">
              <h2 className="font-display text-[1.375rem] font-semibold tabular-nums">
                {year}
              </h2>
              <div className="rule-fade flex-1" />
              <span className="text-[0.8125rem] text-faint tabular-nums">
                {items.length}
              </span>
            </div>

            <ol className="relative space-y-3 pl-6">
              {/* The spine runs the height of the year, not the whole page */}
              <span
                className="absolute top-2 bottom-2 left-[5px] w-px bg-line"
                aria-hidden="true"
              />
              {items.map((item) => (
                <li key={item.id} className="relative">
                  <span
                    className="absolute top-[1.35rem] -left-[1.4rem] size-[11px] rounded-full border-[2.5px] border-canvas"
                    style={{ background: categoryColor(item.category) }}
                    aria-hidden="true"
                  />
                  <Link
                    href={`/record/${item.id}`}
                    className="card pressable block p-4 hover:-translate-y-0.5 hover:bg-mist/40"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.8125rem] text-faint tabular-nums">
                        {formatDate(item.date)}
                      </span>
                      <CategoryPill category={item.category} />
                    </div>
                    <h3 className="mt-2 text-[1rem] leading-snug font-semibold text-balance">
                      {item.title}
                    </h3>
                    {item.organization && (
                      <p className="mt-0.5 text-[0.875rem] text-muted">
                        {item.organization}
                      </p>
                    )}
                    {item.highlights.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                        {item.highlights.slice(0, 3).map((h) => (
                          <li key={h} className="text-[0.8125rem] text-faint">
                            · {h}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
