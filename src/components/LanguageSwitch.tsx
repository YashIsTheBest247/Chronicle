"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { LANGS, useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Language pill for the navigation bars. `onDark` because the site nav rides
 * over the dark hero before it flips to the paper tint.
 */
export function LanguageSwitch({
  onDark = false,
  compact = false,
}: {
  onDark?: boolean;
  compact?: boolean;
}) {
  const { lang, setLang } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click and on Escape — a dropdown that traps you is worse
  // than no dropdown.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Change language"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border transition-colors",
          compact ? "px-2.5 py-2" : "px-3.5 py-2.5",
          onDark
            ? "border-white/15 text-white/85 hover:bg-white/10"
            : "border-line text-muted hover:bg-mist hover:text-fg",
        )}
      >
        <Languages size={15} className="shrink-0" />
        {!compact && (
          <span className="text-[0.9375rem] font-medium">{current.label}</span>
        )}
        <ChevronDown
          size={13}
          className={cn("shrink-0 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="card panel-in absolute right-0 z-50 mt-2 w-40 p-1.5">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[0.9375rem] transition-colors",
                l.code === lang
                  ? "bg-mist font-medium text-fg"
                  : "text-muted hover:bg-mist/60 hover:text-fg",
              )}
            >
              {l.label}
              {l.code === lang && <Check size={14} className="ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
