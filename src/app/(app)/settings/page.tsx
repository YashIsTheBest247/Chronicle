"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, Send, Unlink } from "lucide-react";

interface LinkState {
  botConfigured: boolean;
  linked: boolean;
  botUrl: string | null;
}

export default function SettingsPage() {
  const [state, setState] = useState<LinkState | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/telegram/link");
    if (res.ok) setState(await res.json());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function generate() {
    setBusy(true);
    try {
      const res = await fetch("/api/telegram/link", { method: "POST" });
      const body = await res.json();
      if (res.ok) setCode(body.code);
    } finally {
      setBusy(false);
    }
  }

  async function unlink() {
    setBusy(true);
    try {
      await fetch("/api/telegram/link", { method: "DELETE" });
      setCode(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="eyebrow">Settings</p>
        <h1 className="t-page mt-2">Connect Telegram</h1>
        <p className="mt-3 text-[1rem] leading-relaxed text-muted text-pretty">
          Ask for any record from your phone and get the original file back as a
          download — without opening Chronicle.
        </p>
      </header>

      {!state ? (
        <div className="card p-6">
          <div className="skeleton h-5 w-48" />
        </div>
      ) : !state.botConfigured ? (
        <div className="card p-6">
          <p className="text-[0.9375rem] font-medium">
            No bot is configured on this server.
          </p>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted text-pretty">
            Set <code className="font-mono">TELEGRAM_BOT_TOKEN</code> and{" "}
            <code className="font-mono">TELEGRAM_WEBHOOK_SECRET</code>, then
            register the webhook once at{" "}
            <code className="font-mono">/api/telegram/setup</code>.
          </p>
        </div>
      ) : state.linked ? (
        <div className="card flex flex-wrap items-center gap-4 p-6">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#2E6F52]/12 text-[#2E6F52]">
            <Check size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[1rem] font-semibold">Telegram connected</p>
            <p className="mt-0.5 text-[0.9375rem] text-muted">
              Message the bot and ask for anything in your Chronicle.
            </p>
          </div>
          <button
            onClick={unlink}
            disabled={busy}
            className="btn btn-ghost !py-2.5 disabled:opacity-50"
          >
            <Unlink size={14} />
            Disconnect
          </button>
        </div>
      ) : (
        <div className="card space-y-5 p-6">
          <ol className="space-y-4">
            <Step n={1}>
              Open{" "}
              {state.botUrl ? (
                <a
                  href={state.botUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline underline-offset-4"
                >
                  the Chronicle bot
                </a>
              ) : (
                "the Chronicle bot"
              )}{" "}
              in Telegram and press <b>Start</b>.
            </Step>

            <Step n={2}>
              Generate a code and send it to the bot as a message. It expires in
              15 minutes and works once.
            </Step>
          </ol>

          {code ? (
            <div className="panel flex flex-wrap items-center gap-4 p-4">
              <code className="font-mono text-[1.75rem] font-semibold tracking-[0.3em]">
                {code}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1800);
                }}
                className="btn btn-ghost ml-auto !py-2.5"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={refresh}
                className="btn btn-primary !py-2.5"
              >
                I&apos;ve sent it
              </button>
            </div>
          ) : (
            <button
              onClick={generate}
              disabled={busy}
              className="btn btn-primary disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              Generate linking code
            </button>
          )}
        </div>
      )}

      <p className="text-[0.9375rem] leading-relaxed text-faint text-pretty">
        A linked chat can read and download everything in your Chronicle, so
        only link a chat you control. Disconnecting revokes access immediately.
      </p>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-mist text-[0.8125rem] font-semibold text-graphite">
        {n}
      </span>
      <span className="text-[0.9375rem] leading-relaxed text-graphite text-pretty">
        {children}
      </span>
    </li>
  );
}
