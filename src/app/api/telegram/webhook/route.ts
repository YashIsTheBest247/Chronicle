import { NextResponse } from "next/server";
import { hasKey } from "@/lib/gemini";
import { hasDatabase } from "@/lib/db";
import { search } from "@/lib/search";
import { getItem, readFileBytes } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import {
  answerCallbackQuery,
  esc,
  hasBot,
  sendChatAction,
  sendDocument,
  sendMessage,
  type InlineButton,
} from "@/lib/telegram";
import { getUserByTelegramChat, redeemLinkCode } from "@/lib/users";

export const runtime = "nodejs";
export const maxDuration = 60;

/** How many results to describe, and how many files to push automatically. */
const MAX_RESULTS = 5;
const AUTO_SEND_FILES = 1;

interface TgMessage {
  message_id: number;
  chat: { id: number };
  from?: { id: number; first_name?: string };
  text?: string;
}

interface TgUpdate {
  message?: TgMessage;
  callback_query?: {
    id: string;
    data?: string;
    message?: TgMessage;
    from: { id: number };
  };
}

export async function POST(req: Request) {
  // Telegram echoes this header back on every call; anyone without it is not
  // Telegram, and the endpoint is otherwise a public URL.
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (
    secret &&
    req.headers.get("x-telegram-bot-api-secret-token") !== secret
  ) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!hasBot()) {
    return NextResponse.json({ ok: true, skipped: "no bot token" });
  }

  let update: TgUpdate;
  try {
    update = (await req.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Always answer 200. A non-2xx makes Telegram retry the same update, which
  // would replay the whole search — errors are reported in-chat instead.
  try {
    if (update.callback_query) await handleCallback(update.callback_query);
    else if (update.message) await handleMessage(update.message);
  } catch (err) {
    console.error("[telegram]", err);
    const chatId =
      update.message?.chat.id ?? update.callback_query?.message?.chat.id;
    if (chatId) {
      await sendMessage(
        chatId,
        "Something went wrong handling that. Try again in a moment.",
      ).catch(() => null);
    }
  }

  return NextResponse.json({ ok: true });
}

async function handleMessage(msg: TgMessage) {
  const chatId = msg.chat.id;
  const text = (msg.text ?? "").trim();
  if (!text) return;

  // A bare 6-character code links this chat to whoever generated it.
  const code = text.toUpperCase().replace(/^\/LINK\s+/, "").trim();
  if (/^[A-Z0-9]{6}$/.test(code)) {
    const linked = await redeemLinkCode(code, chatId);
    await sendMessage(
      chatId,
      linked
        ? `Linked to <b>${esc(linked.email)}</b>.\n\nAsk me anything about your records — I will send the original files back.`
        : "That code is wrong or has expired. Generate a new one in Chronicle under Settings.",
    );
    return;
  }

  // Identity is the account this chat is linked to. Without a link there is
  // no access, and the reply never reveals whether any records exist.
  const user = await getUserByTelegramChat(chatId);
  if (!user) {
    await sendMessage(
      chatId,
      [
        "This chat is not linked to a Chronicle account yet.",
        "",
        "1. Sign in to Chronicle with Google",
        "2. Open <b>Settings</b> and copy your 6-character code",
        "3. Send that code here",
      ].join("\n"),
    );
    return;
  }

  if (text.startsWith("/start") || text.startsWith("/help")) {
    await sendMessage(
      chatId,
      [
        "<b>Chronicle</b> — your records, on demand.",
        "",
        "Ask in plain English and I will find the record and send the original file back:",
        "",
        "• <i>show all my certificates</i>",
        "• <i>my latest resume</i>",
        "• <i>what proves I know Python?</i>",
        "• <i>internship documents</i>",
        "",
        "I send the best match's file automatically; tap a button for any of the others.",
      ].join("\n"),
    );
    return;
  }

  if (!hasDatabase()) {
    await sendMessage(
      chatId,
      "The server has no database configured — DATABASE_URL is not set.",
    );
    return;
  }

  // A missing or rate-limited key is not fatal: search() falls back to
  // lexical ranking over the same records, so the bot still finds files.
  // Say so once rather than silently returning worse answers.
  if (!hasKey()) {
    await sendMessage(
      chatId,
      "<i>Note: AI search is unavailable, so I am matching on keywords only.</i>",
    );
  }

  await sendChatAction(chatId, "typing");

  const result = await search(user.id, text, MAX_RESULTS);

  if (result.hits.length === 0) {
    await sendMessage(chatId, `No records matched “${esc(text)}”.`);
    return;
  }

  // 1 — the answer plus a numbered digest of what matched.
  const lines = [
    esc(result.answer),
    "",
    ...result.hits.map((h, i) => {
      const bits = [h.item.category, h.item.organization, formatDate(h.item.date)]
        .filter(Boolean)
        .join(" · ");
      return `${i + 1}. <b>${esc(h.item.title)}</b>\n    <i>${esc(bits)}</i>`;
    }),
  ];

  // 2 — a button per record that actually has a stored original.
  const withFiles = result.hits.filter((h) => h.item.file);
  const buttons: InlineButton[][] = withFiles
    .slice(AUTO_SEND_FILES)
    .map((h) => [
      {
        text: `📎 ${h.item.title.slice(0, 40)}`,
        // Callback data is capped at 64 bytes — an id fits, a title would not.
        callback_data: `f:${h.item.id}`,
      },
    ]);

  if (withFiles.length === 0) {
    lines.push("", "<i>No original files are attached to these records.</i>");
  }

  await sendMessage(chatId, lines.join("\n"), buttons.length ? buttons : undefined);

  // 3 — push the top match's file straight away, so the common case is
  //     "ask, receive" with no extra tap.
  for (const hit of withFiles.slice(0, AUTO_SEND_FILES)) {
    await deliver(user.id, chatId, hit.item.id);
  }
}

async function handleCallback(cb: NonNullable<TgUpdate["callback_query"]>) {
  const chatId = cb.message?.chat.id;
  if (!chatId) return;

  const user = await getUserByTelegramChat(chatId);
  if (!user) {
    await answerCallbackQuery(cb.id, "This chat is not linked to an account.");
    return;
  }

  const data = cb.data ?? "";
  if (!data.startsWith("f:")) {
    await answerCallbackQuery(cb.id);
    return;
  }

  await answerCallbackQuery(cb.id, "Sending…");
  await deliver(user.id, chatId, data.slice(2));
}

/** Sends one record's original file, preserving its filename and type. */
async function deliver(userId: string, chatId: number, itemId: string) {
  // Scoped by owner: a guessed id from another account resolves to nothing.
  const item = await getItem(userId, itemId);
  if (!item) {
    await sendMessage(chatId, "That record no longer exists.");
    return;
  }

  if (!item.file) {
    const where = item.url ? `\n${esc(item.url)}` : "";
    await sendMessage(
      chatId,
      `<b>${esc(item.title)}</b> has no stored file.${where}`,
    );
    return;
  }

  await sendChatAction(chatId, "upload_document");

  const stored = await readFileBytes(userId, item.file.id);
  if (!stored) {
    await sendMessage(chatId, "That file is missing from storage.");
    return;
  }

  await sendDocument({
    chatId,
    bytes: stored.bytes,
    filename: stored.file.name,
    mime: stored.file.mime,
    caption: `<b>${esc(item.title)}</b>\n<i>${esc(
      [item.category, item.organization, formatDate(item.date)]
        .filter(Boolean)
        .join(" · "),
    )}</i>`,
  });
}
