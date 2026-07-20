"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  MessageCircle,
  Mic,
  Send,
  Square,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  canListen,
  canSpeak,
  listen,
  speak,
  stopSpeaking,
  warmVoices,
  type Lang,
} from "@/lib/speech";
import { cn } from "@/lib/utils";
import type { ClientItem } from "@/lib/types";

interface Msg {
  role: "bot" | "user";
  text: string;
  sources?: ClientItem[];
}

const COPY = {
  en: {
    title: "Chronicle Assistant",
    status: "Finds your records",
    greeting:
      "Hello. Ask me for anything in your Chronicle and I'll find it — and hand you the original file.",
    placeholder: "Ask about your records…",
    listening: "Listening…",
    speak: "Speak",
    signIn: "Sign in to search your records.",
    offline: "Something went wrong. Try again.",
    suggestions: [
      "Show all my certificates",
      "What proves I know Python?",
      "My latest resume",
    ],
    lang: "हिंदी",
  },
  hi: {
    title: "Chronicle सहायक",
    status: "आपके रिकॉर्ड ढूँढता है",
    greeting:
      "नमस्ते! अपने Chronicle में कुछ भी पूछिए — मैं उसे ढूँढकर मूल फ़ाइल आपको दूँगा।",
    placeholder: "अपने रिकॉर्ड के बारे में पूछें…",
    listening: "सुन रहा हूँ…",
    speak: "बोलें",
    signIn: "अपने रिकॉर्ड खोजने के लिए साइन इन करें।",
    offline: "कुछ गड़बड़ हो गई। फिर से कोशिश करें।",
    suggestions: [
      "मेरे सारे प्रमाणपत्र दिखाओ",
      "मेरा नवीनतम रिज्यूमे",
      "मेरे AI प्रोजेक्ट दिखाओ",
    ],
    lang: "English",
  },
} as const;

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);

  const stopListenRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = COPY[lang];

  useEffect(() => {
    if (open) warmVoices();
  }, [open]);

  // Reset the transcript when the language changes — a half-Hindi,
  // half-English thread reads as a bug.
  useEffect(() => {
    setMessages([]);
  }, [lang]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;

    stopSpeaking();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: message }]);
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, lang }),
      });

      if (res.status === 401) {
        setNeedsAuth(true);
        setMessages((m) => [...m, { role: "bot", text: t.signIn }]);
        return;
      }

      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "failed");

      setMessages((m) => [
        ...m,
        { role: "bot", text: body.answer, sources: body.sources },
      ]);
      if (voiceOn) speak(body.answer, lang);
    } catch {
      setMessages((m) => [...m, { role: "bot", text: t.offline }]);
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    if (listening) {
      stopListenRef.current?.();
      setListening(false);
      return;
    }
    stopSpeaking();
    const stop = listen({
      lang,
      onPartial: setInput,
      onFinal: (text) => {
        setInput("");
        void send(text);
      },
      onEnd: () => setListening(false),
      onError: () => setListening(false),
    });
    if (stop) {
      stopListenRef.current = stop;
      setListening(true);
    }
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className={cn(
          "fixed right-4 bottom-4 z-50 grid size-14 place-items-center rounded-full",
          "bg-fg text-canvas shadow-[0_14px_38px_-12px_rgb(22_20_15_/_0.55)]",
          "transition-transform hover:scale-105 active:scale-95 sm:right-6 sm:bottom-6",
        )}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {open && (
        <div
          className={cn(
            "card fixed right-4 bottom-22 z-50 flex w-[calc(100vw-2rem)] max-w-[24rem] flex-col overflow-hidden p-0",
            "h-[min(34rem,calc(100dvh-8rem))] shadow-[0_28px_70px_-28px_rgb(22_20_15_/_0.5)]",
            "sm:right-6 sm:bottom-24",
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 bg-[#16140F] px-4 py-3.5 text-[#EDEBE7]">
            <div className="min-w-0 flex-1">
              <p className="text-[0.9375rem] font-semibold">{t.title}</p>
              <p className="flex items-center gap-1.5 text-[0.75rem] text-white/55">
                <span className="size-1.5 rounded-full bg-[#4CAF7D]" />
                {t.status}
              </p>
            </div>

            <button
              onClick={() => setLang(lang === "en" ? "hi" : "en")}
              className="rounded-full border border-white/20 px-2.5 py-1 text-[0.75rem] font-medium text-white/80 transition-colors hover:bg-white/10"
            >
              {t.lang}
            </button>

            {canSpeak() && (
              <button
                onClick={() => {
                  setVoiceOn((v) => !v);
                  stopSpeaking();
                }}
                aria-label={voiceOn ? "Mute replies" : "Unmute replies"}
                className="grid size-8 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10"
              >
                {voiceOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
            )}
          </div>

          {/* Transcript */}
          <div
            ref={scrollRef}
            className="scrollbar-thin flex-1 space-y-3 overflow-y-auto bg-linen/50 px-4 py-4 dark:bg-mist/20"
          >
            <Bubble role="bot">{t.greeting}</Bubble>

            {messages.map((m, i) => (
              <div key={i} className="space-y-2">
                <Bubble role={m.role}>{m.text}</Bubble>
                {m.sources && m.sources.length > 0 && (
                  <div className="space-y-1.5 pl-1">
                    {m.sources.slice(0, 3).map((s) => (
                      <Link
                        key={s.id}
                        href={`/record/${s.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2 text-[0.8125rem] transition-colors hover:bg-mist"
                      >
                        <span className="truncate font-medium">{s.title}</span>
                        {s.file && (
                          <span className="ml-auto shrink-0 text-[0.6875rem] text-faint">
                            PDF
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {needsAuth && (
              <Link
                href="/login"
                className="btn btn-primary w-full !py-2.5 !text-sm"
              >
                Sign in
              </Link>
            )}

            {busy && (
              <Bubble role="bot">
                <Loader2 size={14} className="animate-spin" />
              </Bubble>
            )}

            {messages.length === 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {t.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => void send(s)}
                    className="rounded-full border border-line bg-paper px-3 py-1.5 text-[0.8125rem] text-muted transition-colors hover:bg-mist hover:text-fg"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t border-lineSoft bg-paper px-3 py-3"
          >
            {canListen() && (
              <button
                type="button"
                onClick={toggleMic}
                aria-label={listening ? "Stop listening" : t.speak}
                className={cn(
                  "grid size-10 shrink-0 place-items-center rounded-full transition-colors",
                  listening
                    ? "bg-[#C0453B] text-white"
                    : "border border-line text-muted hover:bg-mist hover:text-fg",
                )}
              >
                {listening ? <Square size={14} /> : <Mic size={16} />}
              </button>
            )}

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={listening ? t.listening : t.placeholder}
              className="min-w-0 flex-1 bg-transparent text-[0.9375rem] outline-none placeholder:text-faint"
            />

            <button
              type="submit"
              disabled={!input.trim() || busy}
              aria-label="Send"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-fg text-canvas transition-opacity disabled:opacity-30"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Bubble({
  role,
  children,
}: {
  role: "bot" | "user";
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex", role === "user" && "justify-end")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[0.9375rem] leading-relaxed text-pretty",
          role === "bot"
            ? "border border-line bg-paper text-fg"
            : "bg-fg text-canvas",
        )}
      >
        {children}
      </div>
    </div>
  );
}
