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
export function formatDate(date: string | null): string {
  if (!date) return "Undated";
  const parts = date.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  if (parts.length === 1) return parts[0];
  const month = months[Number(parts[1]) - 1] ?? "";
  if (parts.length === 2) return `${month} ${parts[0]}`;
  return `${month} ${Number(parts[2])}, ${parts[0]}`;
}

export function yearOf(date: string | null): string {
  return date?.slice(0, 4) || "Undated";
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
