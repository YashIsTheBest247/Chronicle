"use client";

/**
 * Thin wrappers over the browser's Web Speech APIs.
 *
 * Both are optional capabilities, not guarantees: recognition is
 * Chromium-only, and which synthesis voices exist depends entirely on the
 * user's OS. Every function here degrades to "not available" rather than
 * throwing, so the chat still works by typing.
 */

export type Lang = "en" | "hi";

/** BCP-47 tags. en-IN over en-US so Indian names and places are transcribed better. */
export const LOCALE: Record<Lang, string> = { en: "en-IN", hi: "hi-IN" };

// ------------------------------------------------------------- recognition --

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

function RecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null;
}

export function canListen(): boolean {
  return RecognitionCtor() !== null;
}

/**
 * Starts dictation. `onPartial` fires as the user speaks, `onFinal` once at
 * the end. Returns a stop function, or null when unsupported.
 */
export function listen(args: {
  lang: Lang;
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  onEnd?: () => void;
  onError?: (code: string) => void;
}): (() => void) | null {
  const Ctor = RecognitionCtor();
  if (!Ctor) return null;

  const rec = new Ctor();
  rec.lang = LOCALE[args.lang];
  rec.continuous = false;
  rec.interimResults = true;

  let finalText = "";

  rec.onresult = (e) => {
    let interim = "";
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      const text = r[0]?.transcript ?? "";
      if (r.isFinal) finalText += text;
      else interim += text;
    }
    if (interim && args.onPartial) args.onPartial(finalText + interim);
  };

  rec.onerror = (e) => args.onError?.(e.error ?? "unknown");
  rec.onend = () => {
    if (finalText.trim()) args.onFinal(finalText.trim());
    args.onEnd?.();
  };

  try {
    rec.start();
  } catch {
    return null;
  }
  return () => rec.stop();
}

// -------------------------------------------------------------- synthesis --

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Picks the warmest available female voice for the language.
 *
 * Voice inventories differ per OS, so this scores candidates rather than
 * naming one: correct language first, then voices known to be female, then
 * higher-quality cloud voices over the clipped local ones.
 */
function pickVoice(lang: Lang): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const target = lang === "hi" ? "hi" : "en";
  const FEMALE =
    /female|swara|kalpana|heera|samantha|zira|aria|jenny|neerja|priya|ananya|google हिन्दी|google uk english female|karen|moira|tessa|libby|sonia/i;
  const MALE = /male|ravi|madhur|david|mark|guy|rishi|daniel|alex|prabhat/i;

  const scored = voices
    .map((v) => {
      let score = 0;
      const l = v.lang.toLowerCase();

      if (l.startsWith(target)) score += 100;
      else if (target === "hi" && l.startsWith("en")) score += 10; // fallback
      else return { v, score: -1 };

      if (target === "en" && l.includes("in")) score += 20; // en-IN warmth
      if (FEMALE.test(v.name)) score += 50;
      if (MALE.test(v.name)) score -= 40;
      if (/google|natural|neural|premium|enhanced/i.test(v.name)) score += 15;
      if (!v.localService) score += 5; // cloud voices are usually smoother

      return { v, score };
    })
    .filter((s) => s.score >= 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.v ?? null;
}

let warmed = false;

/** Voice lists load asynchronously; touch them early so the first reply speaks. */
export function warmVoices() {
  if (warmed || !canSpeak()) return;
  warmed = true;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
}

export function speak(text: string, lang: Lang, onEnd?: () => void) {
  if (!canSpeak() || !text.trim()) return;
  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice(lang);
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? LOCALE[lang];
  // Slightly slower and a touch higher reads as warm rather than clipped.
  u.rate = 0.97;
  u.pitch = 1.08;
  u.volume = 1;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();

  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}
