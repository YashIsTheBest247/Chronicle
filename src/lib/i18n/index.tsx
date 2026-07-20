"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { dictionaries, type DictKey } from "./dictionary";

export type Lang = "en" | "hi";
export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिंदी" },
];

const STORAGE_KEY = "chronicle.lang";

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey) => string;
}

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Always start at "en" so the server and first client render agree;
  // the stored preference is applied in an effect to avoid a hydration
  // mismatch, which React treats as an error and which flashes the wrong
  // language for a frame.
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "hi" || saved === "en") setLangState(saved);
    } catch {
      // Private browsing — English is a fine default.
    }
  }, []);

  // Keep the document in sync so screen readers and the browser's own
  // hyphenation/翻訳 heuristics use the right language.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  /**
   * Swapping every string in one frame reads as a flicker, so the page dips
   * to 28% first, changes language while it is dimmed, then lifts back. The
   * timings match the CSS transitions in globals.css.
   */
  const setLang = useCallback(
    (l: Lang) => {
      if (l === lang) return;

      try {
        localStorage.setItem(STORAGE_KEY, l);
      } catch {
        // Preference simply won't persist.
      }

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches;
      if (reduced) {
        setLangState(l);
        return;
      }

      const root = document.documentElement;
      root.classList.add("lang-switching");
      window.setTimeout(() => {
        setLangState(l);
        // Next frame, so the new strings are painted before the fade back in.
        requestAnimationFrame(() => root.classList.remove("lang-switching"));
      }, 140);
    },
    [lang],
  );

  const t = useCallback(
    (key: DictKey) => dictionaries[lang][key] ?? dictionaries.en[key] ?? key,
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

/**
 * Reads the active language. Falls back to English rather than throwing when
 * used outside the provider, so a stray component can never blank the page.
 */
export function useT(): Ctx {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;
  return {
    lang: "en",
    setLang: () => {},
    t: (key: DictKey) => dictionaries.en[key] ?? key,
  };
}

/** Translates a category name, falling back to the raw value. */
export function useCategoryLabel() {
  const { t } = useT();
  return useCallback(
    (category: string) => {
      const key = `cat.${category}` as DictKey;
      return dictionaries.en[key] ? t(key) : category;
    },
    [t],
  );
}
