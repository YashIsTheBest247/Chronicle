"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  FileText,
  Loader2,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Evidence {
  id: string;
  title: string;
  date: string | null;
  why: string;
}
interface Requirement {
  id: string;
  text: string;
  kind: string;
  importance: "must" | "nice";
  met: boolean;
  confidence: number;
  evidence: Evidence[];
  gap: string | null;
}
interface Fit {
  role: string | null;
  score: number;
  verdict: string;
  requirements: Requirement[];
  strengths: string[];
  gaps: string[];
  keyRecords: { id: string; title: string; uses: number }[];
  resume?: string;
}

export default function FitPage() {
  const { t } = useT();
  const [jd, setJd] = useState("");
  const [withResume, setWithResume] = useState(false);
  const [fit, setFit] = useState<Fit | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function run() {
    if (jd.trim().length < 40) return;
    setBusy(true);
    setError(null);
    setFit(null);
    try {
      const res = await fetch("/api/fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription: jd, withResume }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Could not assess this.");
      setFit(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const met = fit?.requirements.filter((r) => r.met).length ?? 0;
  const totalReqs = fit?.requirements.length ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="eyebrow">{t("fit.eyebrow")}</p>
        <h1 className="t-page mt-2 text-balance">{t("fit.title")}</h1>
        <p className="mt-3 text-[1rem] leading-relaxed text-muted text-pretty">
          {t("fit.sub")}
        </p>
      </header>

      <div className="card space-y-4 p-5">
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={8}
          placeholder={t("fit.placeholder")}
          className="w-full resize-y bg-transparent text-[0.9375rem] leading-relaxed outline-none placeholder:text-faint"
        />
        <div className="flex flex-wrap items-center gap-3 border-t border-lineSoft pt-4">
          <button
            onClick={run}
            disabled={busy || jd.trim().length < 40}
            className="btn btn-primary disabled:opacity-40"
          >
            {busy ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Target size={15} />
            )}
            {busy ? t("fit.working") : t("fit.cta")}
          </button>

          <label className="inline-flex cursor-pointer items-center gap-2 text-[0.9375rem] text-muted">
            <input
              type="checkbox"
              checked={withResume}
              onChange={(e) => setWithResume(e.target.checked)}
              className="size-4 accent-[#2D6BFF]"
            />
            {t("fit.alsoResume")}
          </label>
        </div>
      </div>

      {error && (
        <p className="rounded-[var(--radius-panel)] border border-[#C0453B]/30 bg-[#C0453B]/5 px-4 py-3 text-[0.9375rem] text-[#C0453B]">
          {error}
        </p>
      )}

      {fit && (
        <section className="space-y-6">
          {/* Score */}
          <div className="card flex flex-wrap items-center gap-6 p-6">
            <ScoreRing score={fit.score} />
            <div className="min-w-0 flex-1">
              {fit.role && (
                <p className="text-[0.875rem] tracking-wide text-faint uppercase">
                  {fit.role}
                </p>
              )}
              <p className="mt-1 text-[1.0625rem] leading-relaxed text-pretty">
                {fit.verdict}
              </p>
              <p className="mt-2 text-[0.9375rem] text-muted">
                {met}/{totalReqs} {t("fit.requirementsMet")}
              </p>
            </div>
          </div>

          {/* Requirements with citations */}
          <div className="space-y-2.5">
            {fit.requirements.map((r) => (
              <div key={r.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                      r.met
                        ? "bg-[#2E6F52]/12 text-[#2E6F52]"
                        : r.importance === "must"
                          ? "bg-[#C0453B]/12 text-[#C0453B]"
                          : "bg-mist text-faint",
                    )}
                  >
                    {r.met ? <Check size={13} /> : <X size={13} />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[0.9375rem] font-medium">
                        {r.text}
                      </span>
                      {r.importance === "must" && (
                        <span className="pill !py-0.5 !text-[0.6875rem] text-faint">
                          {t("fit.must")}
                        </span>
                      )}
                    </div>

                    {r.met ? (
                      <ul className="mt-2 space-y-1.5">
                        {r.evidence.map((e) => (
                          <li key={e.id}>
                            <Link
                              href={`/record/${e.id}`}
                              className="group inline-flex items-start gap-1.5 text-[0.875rem] text-muted hover:text-fg"
                            >
                              <FileText
                                size={12}
                                className="mt-1 shrink-0 text-faint"
                              />
                              <span>
                                <span className="font-medium underline decoration-line underline-offset-4 group-hover:decoration-fg">
                                  {e.title}
                                </span>
                                {e.why && <span className="text-faint"> — {e.why}</span>}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1.5 text-[0.875rem] text-muted text-pretty">
                        {r.gap}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* What to do next */}
          {fit.gaps.length > 0 && (
            <div className="card p-6">
              <p className="eyebrow">{t("fit.closeGaps")}</p>
              <ul className="mt-3 space-y-2">
                {fit.gaps.slice(0, 6).map((g) => (
                  <li
                    key={g}
                    className="text-[0.9375rem] leading-relaxed text-graphite text-pretty"
                  >
                    · {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tailored résumé */}
          {fit.resume && (
            <div className="card p-6">
              <div className="flex flex-wrap items-center gap-3">
                <p className="eyebrow flex-1">{t("fit.resumeTitle")}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(fit.resume ?? "");
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1800);
                  }}
                  className="btn btn-ghost !py-2 !text-sm"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? t("set.copied") : t("profile.copyLink").replace("link", "text")}
                </button>
              </div>
              <pre className="scrollbar-thin mt-4 max-h-[32rem] overflow-auto rounded-[var(--radius-panel)] bg-mist/60 p-4 text-[0.875rem] leading-relaxed whitespace-pre-wrap">
                {fit.resume}
              </pre>
              <p className="mt-3 text-[0.875rem] text-faint text-pretty">
                {t("fit.resumeNote")}
              </p>
            </div>
          )}

          <p className="flex items-start gap-2 text-[0.875rem] leading-relaxed text-faint text-pretty">
            <Sparkles size={13} className="mt-0.5 shrink-0" />
            {t("fit.grounded")}
          </p>
        </section>
      )}
    </div>
  );
}

/** Score dial. Colour is earned, not decorative — red means do not apply yet. */
function ScoreRing({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const tone =
    score >= 70 ? "#2E6F52" : score >= 45 ? "#B07A1E" : "#C0453B";

  return (
    <div className="relative grid size-24 shrink-0 place-items-center">
      <svg viewBox="0 0 80 80" className="absolute size-24 -rotate-90">
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          className="text-mist"
        />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * score) / 100}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <span className="font-display text-[1.5rem] font-semibold tabular-nums">
        {score}
        <span className="text-[0.875rem] text-faint">%</span>
      </span>
    </div>
  );
}
