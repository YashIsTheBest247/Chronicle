"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Building2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { CategoryPill } from "@/components/CategoryPill";
import { categoryColor, formatBytes, formatDate } from "@/lib/utils";
import type { ClientItem, Relation } from "@/lib/types";
import { useT } from "@/lib/i18n";

interface Connection {
  relation: Relation;
  label: string;
  direction: "outgoing" | "incoming";
  item: ClientItem;
}

export default function RecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { t, lang } = useT();
  const router = useRouter();
  const [data, setData] = useState<{
    item: ClientItem;
    connections: Connection[];
  } | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch(`/api/items/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setMissing(true));
  }, [id]);

  async function toggleHidden() {
    if (!data) return;
    const next = !data.item.hidden;
    // Optimistic: the toggle is cheap and reversible, so waiting on the
    // round-trip would make it feel broken.
    setData({ ...data, item: { ...data.item, hidden: next } });
    await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: next }),
    }).catch(() => setData({ ...data, item: { ...data.item, hidden: !next } }));
  }

  async function remove() {
    if (!confirm(t("rec.deleteConfirm"))) {
      return;
    }
    await fetch(`/api/items/${id}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  if (missing) {
    return (
      <p className="py-32 text-center text-[1rem] text-faint">
        {t("rec.gone")}{" "}
        <Link href="/dashboard" className="text-fg underline underline-offset-4">
          {t("rec.backOverview")}
        </Link>
      </p>
    );
  }

  if (!data) {
    return (
      <div className="grid place-items-center py-32 text-faint">
        <Loader2 className="animate-spin" size={20} />
      </div>
    );
  }

  const { item, connections } = data;
  const color = categoryColor(item.category);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-[0.875rem] text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft size={14} />
        {t("nav.overview")}
      </Link>

      <header className="space-y-4">
        <CategoryPill category={item.category} />
        <h1 className="t-page text-balance">
          {item.title}
        </h1>
        <p className="text-[1.0625rem] leading-relaxed text-muted text-pretty">
          {item.summary}
        </p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.875rem] text-faint">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={13} />
            {formatDate(item.date, lang)}
            {item.dateConfidence === "approximate" && ` ${t("rec.approx")}`}
          </span>
          {item.organization && (
            <span className="inline-flex items-center gap-1.5">
              <Building2 size={13} />
              {item.organization}
            </span>
          )}
        </div>
      </header>

      {/* The retrieval payoff: the untouched original, one click away. */}
      {(item.file || item.url) && (
        <section
          className="card flex flex-wrap items-center gap-4 p-5"
          style={{ borderColor: `${color}33` }}
        >
          <span
            className="grid size-10 shrink-0 place-items-center rounded-full"
            style={{ background: `${color}1A`, color }}
          >
            <FileText size={17} />
          </span>

          <div className="min-w-0 flex-1">
            <p className="eyebrow">{t("rec.original")}</p>
            <p className="mt-1 truncate text-[0.9375rem] font-medium">
              {item.file?.name ?? item.url}
            </p>
            {item.file && (
              <p className="text-[0.8125rem] text-faint">
                {item.file.mime} · {formatBytes(item.file.size)}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {item.file ? (
              <>
                <a
                  href={`/api/file/${item.file.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-ghost !py-2 !text-sm"
                >
                  <ExternalLink size={14} />
                  {t("rec.open")}
                </a>
                <a
                  href={`/api/file/${item.file.id}?download`}
                  className="btn btn-primary !py-2 !text-sm"
                >
                  <Download size={14} />
                  {t("rec.download")}
                </a>
              </>
            ) : (
              <a
                href={item.url!}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost !py-2 !text-sm"
              >
                <ExternalLink size={14} />
                {t("rec.visit")}
              </a>
            )}
          </div>
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {item.skills.length > 0 && (
          <Panel title={t("rec.skills")}>
            <div className="flex flex-wrap gap-1.5">
              {item.skills.map((s) => (
                <span key={s} className="pill text-graphite">
                  {s}
                </span>
              ))}
            </div>
          </Panel>
        )}

        {item.highlights.length > 0 && (
          <Panel title={t("rec.highlights")}>
            <ul className="space-y-1.5">
              {item.highlights.map((h) => (
                <li
                  key={h}
                  className="text-[0.875rem] leading-relaxed text-graphite"
                >
                  · {h}
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      {connections.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-3">
            <p className="eyebrow">
              {t("rec.connectedTo")} {connections.length}{" "}
              {connections.length === 1
                ? t("rec.otherRecord")
                : t("rec.otherRecords")}
            </p>
            <div className="rule-fade flex-1" />
          </div>

          <div className="space-y-2">
            {connections.map(({ relation, label, direction, item: other }) => (
              <Link
                key={relation.id}
                href={`/record/${other.id}`}
                className="card pressable flex flex-col gap-2 p-4 hover:-translate-y-0.5 hover:bg-mist/40 sm:flex-row sm:items-center sm:gap-4"
              >
                <span
                  className="shrink-0 text-[0.6875rem] tracking-wide text-faint uppercase sm:w-24 sm:text-right sm:text-[0.75rem]"
                  title={
                    direction === "outgoing"
                      ? `This record ${label} that one`
                      : `That record ${label} this one`
                  }
                >
                  {direction === "incoming" && "← "}
                  {label}
                  {direction === "outgoing" && " →"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] font-medium">
                    {other.title}
                  </p>
                  <p className="truncate text-[0.8125rem] text-faint">
                    {relation.reason}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {item.excerpt && (
        <details className="card group p-5">
          <summary className="cursor-pointer list-none text-[0.875rem] font-medium text-muted transition-colors hover:text-fg">
            {t("rec.source")}
          </summary>
          <pre className="scrollbar-thin mt-4 max-h-80 overflow-auto text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-faint">
            {item.excerpt}
          </pre>
        </details>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-lineSoft pt-5">
        <button
          onClick={toggleHidden}
          className="inline-flex items-center gap-1.5 text-[0.875rem] text-muted transition-colors hover:text-fg"
        >
          {item.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
          {item.hidden ? t("profile.show") : t("profile.hide")}
        </button>
        <div className="ml-auto" />
        <button
          onClick={remove}
          className="inline-flex items-center gap-1.5 text-[0.875rem] text-faint transition-colors hover:text-[#C0453B]"
        >
          <Trash2 size={13} />
          {t("rec.delete")}
        </button>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <p className="eyebrow">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}
