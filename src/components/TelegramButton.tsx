"use client";

import { useState } from "react";
import { Send } from "lucide-react";

/**
 * The Telegram bot does not exist yet. Rather than render a link to "#" —
 * which yanks the page to the top when clicked — this stays inert and says
 * so. Set NEXT_PUBLIC_TELEGRAM_URL and it becomes a real link with no other
 * change.
 */
export function TelegramButton({ className }: { className?: string }) {
  const url = process.env.NEXT_PUBLIC_TELEGRAM_URL;
  const [nudged, setNudged] = useState(false);

  if (url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className={className}>
        <Send size={16} />
        Chat on Telegram
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setNudged(true);
        window.setTimeout(() => setNudged(false), 2200);
      }}
      aria-live="polite"
      className={className}
    >
      <Send size={16} />
      {nudged ? "Bot coming soon" : "Chat on Telegram"}
    </button>
  );
}
