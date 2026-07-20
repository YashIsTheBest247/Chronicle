"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Compass,
  Copy,
  ExternalLink,
  Globe,
  Loader2,
  Lock,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Settings {
  handle: string | null;
  isPublic: boolean;
  listed: boolean;
  headline: string | null;
}

/**
 * Claim a handle, write a headline, and publish. Publishing is deliberately
 * gated on having a handle — there is nothing to share without a URL.
 */
export function ProfileCard() {
  const { t } = useT();
  const [state, setState] = useState<Settings | null>(null);
  const [handle, setHandle] = useState("");
  const [headline, setHeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/profile");
    if (!res.ok) return;
    const body: Settings = await res.json();
    setState(body);
    setHandle(body.handle ?? "");
    setHeadline(body.headline ?? "");
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(patch: Partial<Settings>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Could not save.");
        return;
      }
      setState(body);
      setHandle(body.handle ?? "");
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return (
      <div className="card p-6">
        <div className="skeleton h-5 w-44" />
      </div>
    );
  }

  const url =
    state.handle && typeof window !== "undefined"
      ? `${window.location.origin}/p/${state.handle}`
      : null;

  return (
    <div className="card space-y-5 p-6">
      <div className="flex flex-wrap items-start gap-4">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full",
            state.isPublic
              ? "bg-[#2E6F52]/12 text-[#2E6F52]"
              : "bg-mist text-muted",
          )}
        >
          {state.isPublic ? <Globe size={18} /> : <Lock size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[1rem] font-semibold">{t("profile.title")}</p>
          <p className="mt-0.5 text-[0.9375rem] leading-relaxed text-muted text-pretty">
            {t("profile.sub")}
          </p>
        </div>
      </div>

      {/* Handle */}
      <div>
        <label className="text-[0.875rem] font-medium" htmlFor="handle">
          {t("profile.handle")}
        </label>
        <div className="panel mt-2 flex items-center gap-1 px-3 py-2.5">
          <span className="shrink-0 text-[0.9375rem] text-faint">/p/</span>
          <input
            id="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="yash-munshi"
            spellCheck={false}
            className="w-full bg-transparent text-[0.9375rem] outline-none placeholder:text-faint"
          />
          <button
            onClick={() => save({ handle })}
            disabled={busy || !handle.trim() || handle === state.handle}
            className="btn btn-ghost shrink-0 !px-3 !py-1.5 !text-sm disabled:opacity-40"
          >
            {t("profile.save")}
          </button>
        </div>
      </div>

      {/* Headline */}
      <div>
        <label className="text-[0.875rem] font-medium" htmlFor="headline">
          {t("profile.headline")}
        </label>
        <div className="panel mt-2 flex items-center gap-2 px-3 py-2.5">
          <input
            id="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            onBlur={() => headline !== (state.headline ?? "") && save({ headline })}
            maxLength={120}
            placeholder={t("profile.headlinePlaceholder")}
            className="w-full bg-transparent text-[0.9375rem] outline-none placeholder:text-faint"
          />
        </div>
      </div>

      {error && (
        <p className="text-[0.875rem] text-[#C0453B]">{error}</p>
      )}

      {/* Publish */}
      <div className="flex flex-wrap items-center gap-3 border-t border-lineSoft pt-5">
        <button
          onClick={() => save({ isPublic: !state.isPublic })}
          disabled={busy || !state.handle}
          className={cn(
            "btn !py-2.5 disabled:opacity-40",
            state.isPublic ? "btn-ghost" : "btn-primary",
          )}
        >
          {busy ? (
            <Loader2 size={15} className="animate-spin" />
          ) : state.isPublic ? (
            <Lock size={15} />
          ) : (
            <Globe size={15} />
          )}
          {state.isPublic ? t("profile.makePrivate") : t("profile.publish")}
        </button>

        {!state.handle && (
          <span className="text-[0.875rem] text-faint">
            {t("profile.needHandle")}
          </span>
        )}

        {state.isPublic && url && (
          <>
            <button
              onClick={() => {
                navigator.clipboard.writeText(url);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1800);
              }}
              className="btn btn-ghost !py-2.5"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? t("set.copied") : t("profile.copyLink")}
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost !py-2.5"
            >
              <ExternalLink size={14} />
              {t("profile.view")}
            </a>
          </>
        )}
      </div>

      {state.isPublic && (
        <label className="flex cursor-pointer items-start gap-3 border-t border-lineSoft pt-5">
          <input
            type="checkbox"
            checked={state.listed}
            onChange={(e) => save({ listed: e.target.checked })}
            disabled={busy}
            className="mt-0.5 size-4 shrink-0 accent-[#2D6BFF]"
          />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-[0.9375rem] font-medium">
              <Compass size={14} />
              {t("profile.listTitle")}
            </span>
            <span className="mt-0.5 block text-[0.875rem] leading-relaxed text-muted text-pretty">
              {t("profile.listSub")}
            </span>
          </span>
        </label>
      )}

      <p className="text-[0.875rem] leading-relaxed text-faint text-pretty">
        {t("profile.privacy")}
      </p>
    </div>
  );
}
