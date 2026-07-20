"use client";

import { useState } from "react";
import { Loader2, Search as SearchIcon, Sparkles } from "lucide-react";
import { ItemCard } from "@/components/ItemCard";
import type { ClientItem, SearchResponse } from "@/lib/types";
import { useT } from "@/lib/i18n";

type Result = Omit<SearchResponse, "hits"> & {
  hits: { item: ClientItem; score: number; matchedOn: string[] }[];
};



export default function SearchPage() {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setQuery(trimmed);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Search failed");
      setResult(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const filters = result
    ? [
        ...result.intent.categories,
        ...result.intent.skills,
        ...result.intent.organizations,
        result.intent.wantsLatest ? "most recent" : null,
        result.intent.dateFrom || result.intent.dateTo
          ? `${result.intent.dateFrom ?? "…"} – ${result.intent.dateTo ?? "…"}`
          : null,
      ].filter(Boolean)
    : [];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header className="text-center">
        <p className="eyebrow">{t("search.eyebrow")}</p>
        <h1 className="t-page mt-2 text-balance">
          {t("search.title")}
        </h1>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(query);
        }}
        className="card flex items-center gap-3 px-4 py-3.5 sm:px-5 sm:py-4"
      >
        <SearchIcon size={17} className="shrink-0 text-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          autoFocus
          className="w-full bg-transparent text-[1rem] outline-none placeholder:text-faint"
        />
        {loading && (
          <Loader2 size={16} className="shrink-0 animate-spin text-faint" />
        )}
      </form>

      {!result && !loading && (
        <div className="flex flex-wrap justify-center gap-2">
          {([ "search.ex1","search.ex2","search.ex3","search.ex4","search.ex5","search.ex6" ] as const).map((k) => t(k)).map((ex) => (
            <button
              key={ex}
              onClick={() => void run(ex)}
              className="pill pressable !py-2 text-muted hover:-translate-y-0.5 hover:bg-mist hover:text-fg"
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-[var(--radius-panel)] border border-[#C0453B]/30 bg-[#C0453B]/5 px-4 py-3 text-[0.9375rem] text-[#C0453B]">
          {error}
        </p>
      )}

      {result && (
        <section className="space-y-5">
          <div className="card p-5">
            <div className="flex items-start gap-3">
              <Sparkles size={15} className="mt-0.5 shrink-0 text-[#2D6BFF]" />
              <p className="text-[1rem] leading-relaxed text-pretty">
                {result.answer}
              </p>
            </div>

            {filters.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-lineSoft pt-3">
                <span className="text-[0.75rem] tracking-wide text-faint uppercase">
                  {t("search.understood")}
                </span>
                {filters.map((f) => (
                  <span key={String(f)} className="pill text-muted">
                    {String(f)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {result.hits.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {result.hits.map((hit) => (
                <ItemCard
                  key={hit.item.id}
                  item={hit.item}
                  matchedOn={hit.matchedOn}
                />
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-[1rem] text-faint">
              {t("search.none")}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
