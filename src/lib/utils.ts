import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { CATEGORY_COLOR, type Category } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function categoryColor(c: string): string {
  return CATEGORY_COLOR[c as Category] ?? CATEGORY_COLOR.Other;
}

/** Renders a partial date the way a person would write it. */
const MONTHS: Record<"en" | "hi", string[]> = {
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  hi: ["जन", "फ़र", "मार्च", "अप्रैल", "मई", "जून", "जुल", "अग", "सित", "अक्टू", "नव", "दिस"],
};
const UNDATED: Record<"en" | "hi", string> = { en: "Undated", hi: "बिना तारीख़" };

/**
 * `lang` defaults to English so server callers (Telegram, the fit prompt) stay
 * unchanged — those produce text for a model or a bot where English is correct.
 * Client render sites pass the active language.
 */
export function formatDate(date: string | null, lang: "en" | "hi" = "en"): string {
  if (!date) return UNDATED[lang];
  const parts = date.split("-");
  if (parts.length === 1) return parts[0];
  const month = MONTHS[lang][Number(parts[1]) - 1] ?? "";
  if (parts.length === 2) return `${month} ${parts[0]}`;
  return `${month} ${Number(parts[2])}, ${parts[0]}`;
}

/** The numeric year, or a localised "Undated" bucket label. */
export function yearOf(date: string | null, lang: "en" | "hi" = "en"): string {
  return date?.slice(0, 4) || UNDATED[lang];
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function relationLabel(kind: string): string {
  const labels: Record<string, string> = {
    proves: "proves",
    applies: "applied in",
    "led-to": "led to",
    "part-of": "part of",
    "issued-by": "issued by",
    "same-org": "same organisation",
    "same-skill": "shared skill",
    continues: "continues",
    related: "related to",
  };
  return labels[kind] ?? kind;
}
