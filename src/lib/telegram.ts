import "server-only";

/**
 * Minimal Telegram Bot API client — only the four methods Chronicle needs.
 *
 * Documents are uploaded as multipart from the bytes already held in
 * Postgres, so the bot works even when the app itself is not publicly
 * reachable for file serving.
 */

// Overridable so the webhook can be exercised against a stub in tests.
const API = process.env.TELEGRAM_API_BASE || "https://api.telegram.org";

export function hasBot(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

function token(): string {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  return t;
}

async function call<T = unknown>(
  method: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${API}/bot${token()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) {
    throw new Error(`Telegram ${method} failed: ${json.description ?? res.status}`);
  }
  return json.result;
}

/** Telegram renders a small subset of HTML; everything else must be escaped. */
export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface InlineButton {
  text: string;
  callback_data: string;
}

export async function sendMessage(
  chatId: number | string,
  text: string,
  buttons?: InlineButton[][],
) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    // Link previews would push the actual answer off screen on mobile.
    link_preview_options: { is_disabled: true },
    ...(buttons ? { reply_markup: { inline_keyboard: buttons } } : {}),
  });
}

export async function sendChatAction(chatId: number | string, action: string) {
  // Fire-and-forget: a failed typing indicator must never fail the reply.
  return call("sendChatAction", { chat_id: chatId, action }).catch(() => null);
}

/** Uploads raw bytes as a document. Telegram caps bot uploads at 50 MB. */
export async function sendDocument(args: {
  chatId: number | string;
  bytes: Buffer;
  filename: string;
  mime: string;
  caption?: string;
}) {
  const form = new FormData();
  form.append("chat_id", String(args.chatId));
  form.append(
    "document",
    new Blob([new Uint8Array(args.bytes)], { type: args.mime }),
    args.filename,
  );
  if (args.caption) {
    form.append("caption", args.caption);
    form.append("parse_mode", "HTML");
  }

  const res = await fetch(`${API}/bot${token()}/sendDocument`, {
    method: "POST",
    body: form,
  });
  const json = (await res.json()) as { ok: boolean; description?: string };
  if (!json.ok) {
    throw new Error(`Telegram sendDocument failed: ${json.description}`);
  }
}

export async function answerCallbackQuery(id: string, text?: string) {
  return call("answerCallbackQuery", {
    callback_query_id: id,
    ...(text ? { text } : {}),
  }).catch(() => null);
}

/** Registers the webhook. Called by the setup route. */
export async function setWebhook(url: string, secret: string) {
  return call("setWebhook", {
    url,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
  });
}

export async function getMe() {
  return call<{ username: string; first_name: string }>("getMe", {});
}

/**
 * Who is allowed to query this Chronicle.
 *
 * Chronicle has no accounts — one deployment holds one person's records — so
 * an open bot would hand a stranger's certificates to anyone who found it.
 * An unset allowlist therefore denies everyone rather than allowing everyone.
 */
export function isAllowed(chatId: number): boolean {
  const raw = process.env.TELEGRAM_ALLOWED_CHAT_IDS?.trim();
  if (!raw) return false;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(String(chatId));
}

export function allowlistConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_ALLOWED_CHAT_IDS?.trim());
}
