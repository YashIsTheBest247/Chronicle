"use client";

import Link from "next/link";
import { ArrowUpRight, Calendar, FileText, Link2 } from "lucide-react";
import { CategoryPill } from "./CategoryPill";
import { cn, formatDate } from "@/lib/utils";
import type { ClientItem } from "@/lib/types";
import { useT } from "@/lib/i18n";

export function ItemCard({
  item,
  matchedOn,
  className,
}: {
  item: ClientItem;
  matchedOn?: string[];
  className?: string;
}) {
  const { t, lang } = useT();

  return (
    <Link
      href={`/record/${item.id}`}
      className={cn(
        "card pressable group flex flex-col gap-3 p-5",
        "hover:-translate-y-1 hover:shadow-[0_14px_38px_-18px_rgb(22_20_15_/_0.28)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <CategoryPill category={item.category} />
        <ArrowUpRight
          size={15}
          className="mt-1 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-[1rem] leading-snug font-semibold text-balance">
          {item.title}
        </h3>
        <p className="line-clamp-2 text-[0.875rem] leading-relaxed text-muted text-pretty">
          {item.summary}
        </p>
      </div>

      {item.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.skills.slice(0, 4).map((s) => (
            <span
              key={s}
              className="rounded-full bg-mist px-2 py-0.5 text-[0.75rem] font-medium text-graphite"
            >
              {s}
            </span>
          ))}
          {item.skills.length > 4 && (
            <span className="px-1 py-0.5 text-[0.75rem] text-faint">
              +{item.skills.length - 4}
            </span>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center gap-3 pt-1 text-[0.75rem] text-faint">
        <span className="inline-flex items-center gap-1">
          <Calendar size={11} />
          {formatDate(item.date, lang)}
        </span>
        {item.organization && (
          <span className="truncate">{item.organization}</span>
        )}
        <span className="ml-auto inline-flex items-center gap-1">
          {item.file ? (
            <>
              <FileText size={11} />
              {t("card.original")}
            </>
          ) : item.url ? (
            <>
              <Link2 size={11} />
              {t("card.link")}
            </>
          ) : null}
        </span>
      </div>

      {matchedOn && matchedOn.length > 0 && (
        <div className="-mx-5 -mb-5 mt-1 rounded-b-[var(--radius-card)] border-t border-lineSoft bg-linen/60 px-5 py-2 text-[0.75rem] text-faint dark:bg-mist/40">
          {t("card.matchedOn")} {matchedOn.join(" · ")}
        </div>
      )}
    </Link>
  );
}
