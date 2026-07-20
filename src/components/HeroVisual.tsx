"use client";

import { ArrowDown, Check, FileText, Sparkles } from "lucide-react";
import { useT } from "@/lib/i18n";

/**
 * The hero's right-hand panel: one document travelling through Chronicle.
 * A raw filename goes in, an understood and connected record comes out —
 * the whole product argument in a single glance.
 *
 * Kept translucent on purpose so the photograph still reads behind it, and
 * deliberately compact so the hero fits one viewport without scrolling.
 */
export function HeroVisual() {
  const { t } = useT();
  return (
    <div className="relative mx-auto w-full max-w-[22rem]">
      <div className="space-y-2.5">
        {/* 1 — what the student actually has */}
        <div className="flex items-center gap-2.5 rounded-xl border border-white/12 bg-black/35 px-3.5 py-2.5 backdrop-blur-md">
          <FileText size={14} className="shrink-0 text-white/40" />
          <span className="truncate font-mono text-[0.8125rem] text-white/45 line-through decoration-1">
            certificate_final_v2.pdf
          </span>
        </div>

        {/* 2 — the model reading it */}
        <div className="flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/35 px-2.5 py-1 text-[0.75rem] font-medium text-white/65 backdrop-blur-md">
            <Sparkles size={10} className="text-[#2D6BFF]" />
            {t("panel.reads")}
          </span>
          <ArrowDown size={12} className="text-white/30" />
        </div>

        {/* 3 — the understood record */}
        <div className="rounded-2xl border border-white/12 bg-black/45 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B07A1E]/45 px-2 py-0.5 text-[0.75rem] font-medium text-white/80">
              <span className="size-1.5 rounded-full bg-[#B07A1E]" />
              Certifications
            </span>
            <span className="text-[0.75rem] text-white/40">Mar 2023</span>
          </div>

          <p className="mt-2.5 text-[1.0625rem] leading-snug font-semibold text-white">
            Python for Everybody
          </p>
          <p className="mt-0.5 text-[0.8125rem] text-white/45">
            University of Michigan · Coursera
          </p>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {["Python", "SQL", "Data Viz"].map((s) => (
              <span
                key={s}
                className="rounded-full bg-white/10 px-2 py-0.5 text-[0.75rem] font-medium text-white/75"
              >
                {s}
              </span>
            ))}
          </div>

          <div className="mt-2.5 flex items-center gap-2 border-t border-white/10 pt-2.5">
            <Check size={12} className="shrink-0 text-[#4CAF7D]" />
            <span className="text-[0.75rem] text-white/55">
              {t("panel.filed")}
            </span>
          </div>
        </div>

        {/* 4 — and what it connected to */}
        <div className="rounded-2xl border border-white/12 bg-black/35 p-3.5 backdrop-blur-md">
          <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-white/40 uppercase">
            {t("panel.found")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {[
              { c: "#2D6BFF", rel: t("panel.appliedIn"), to: "Placement Dashboard" },
              { c: "#8A6BC8", rel: t("panel.ledTo"), to: "ML Intern · Wooble" },
              { c: "#4CAF7D", rel: t("panel.proves"), to: "Python" },
            ].map((r) => (
              <li key={r.to} className="flex items-center gap-2">
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: r.c }}
                />
                <span className="shrink-0 text-[0.75rem] text-white/40">
                  {r.rel}
                </span>
                <span className="truncate text-[0.8125rem] text-white/75">
                  {r.to}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
