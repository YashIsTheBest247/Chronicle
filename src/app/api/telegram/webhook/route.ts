import { NextResponse } from "next/server";
import { hasKey } from "@/lib/gemini";
import { hasDatabase } from "@/lib/db";
import { search } from "@/lib/search";
import { isLinkQuery, linksFor, type RecordLink } from "@/lib/links";
import { getItem, listItems, readFileBytes } from "@/lib/store";
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
import type { ItemWithFile } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * How many results to describe. Nothing is sent automatically: an unrequested
 * file download in a chat is intrusive, and the user may have been asking
 * "which resumes do I have?" rather than "send me one". The answer names what
 * matched; a button fetches whichever they actually want.
 */
const MAX_RESULTS = 5;

/**
 * Telegram rejects a message over 4096 characters outright, which would lose
 * the whole answer rather than the tail of it. Blocks are added while they fit
 * and the remainder is reported as a count, so a long list is never silently
 * truncated.
 */
const MESSAGE_BUDGET = 3800;

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

  // Identity is the account this chat is linked to. Without a link there is
  // no access, and the reply never reveals whether any records exist.
  const user = await getUserByTelegramChat(chatId);

  // A 6-character code binds this chat to whoever generated it. Tried only
  // when the chat is not linked yet, or when the user said /link explicitly:
  // plenty of real questions are exactly six characters — "resume", "python",
  // "hindi" — and an already-linked chat asking one of those wants an answer,
  // not "that code has expired".
  const explicit = /^\/link\b/i.test(text);
  const code = text.replace(/^\/link\s*/i, "").trim().toUpperCase();
  const isCode = /^[A-Z0-9]{6}$/.test(code);

  if (explicit && !isCode) {
    await sendMessage(
      chatId,
      "Send <code>/link</code> followed by the 6-character code from Chronicle → Settings.",
    );
    return;
  }

  if (isCode && (!user || explicit)) {
    const linked = await redeemLinkCode(code, chatId);
    await sendMessage(
      chatId,
      linked
        ? `Linked to <b>${esc(linked.email)}</b>.\n\nAsk me anything about your records — I will show what matched, hand back the originals, and give you any link you stored. Send /help to see what to try.`
        : "That code is wrong or has expired. Generate a new one in Chronicle under Settings.",
    );
    return;
  }

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
        "Ask in plain English and I will find it:",
        "",
        "• <i>show all my certificates</i>",
        "• <i>my latest resume</i>",
        "• <i>what proves I know Python?</i>",
        "• <i>internship documents</i>",
        "",
        "I reply with what matched, then you tap to download whichever file you want.",
        "",
        "<b>Links</b> — ask for a URL and you get the URL, labelled:",
        "",
        "• <i>what is the link to my portfolio?</i>",
        "• <i>github repo for my final year project</i>",
        "• <i>certificate verification links</i>",
        "",
        "/links — every link in your Chronicle, grouped by record",
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

  // Listing links needs no model call, so it works even with no Gemini key.
  if (text.toLowerCase().startsWith("/links")) {
    await sendAllLinks(user.id, chatId);
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

  // Retrieval falls back to the whole table when filters or embeddings return
  // nothing, so an empty result means an empty Chronicle — say which it is
  // rather than leaving the user to wonder whether the search broke.
  if (result.hits.length === 0) {
    await sendMessage(
      chatId,
      result.answer.includes("Nothing has been added")
        ? "Your Chronicle is empty. Upload a certificate, or paste a link — a portfolio, a GitHub repo, a Google Drive file — in the app, then ask me again."
        : `No records matched “${esc(text)}”.`,
    );
    return;
  }

  const items = result.hits.map((h) => h.item);
  const asked = isLinkQuery(text);
  const anyLinks = items.some((item) => linksFor(item).length > 0);

  // "What's the link to my portfolio?" wants the URL itself, not a file
  // button. Answer it with the links inline, each one labelled — a record can
  // hold a repository, a demo and a video, and three bare URLs would leave
  // the user to open all of them to find out which is which.
  //
  // Only when there is actually a link to give. "Send me my portfolio" reads
  // as a link question but is often a request for the file, so a record with
  // no links falls through to the normal digest rather than a dead end.
  if (asked && anyLinks) {
    await sendLinkAnswer(chatId, result.answer, items);
    return;
  }

  // 1 — the answer plus a numbered digest of what matched.
  const lines = [
    ...(asked
      ? ["<i>None of these has a link stored — here is what matched.</i>", ""]
      : []),
    esc(result.answer),
    "",
    ...items.map((item, i) => `${i + 1}. <b>${esc(item.title)}</b>\n    <i>${esc(meta(item))}</i>`),
  ];

  // 2 — buttons per record, numbered to match the list above so the two read
  //     together: the original file, and its links where it has any.
  const buttons: InlineButton[][] = [];
  let withFiles = 0;
  let withLinks = 0;
  items.forEach((item, i) => {
    const row: InlineButton[] = [];
    if (item.file) {
      withFiles++;
      // Callback data is capped at 64 bytes — an id fits, a title would not.
      row.push({
        text: `⬇ ${i + 1}. ${item.title.slice(0, 30)}`,
        callback_data: `f:${item.id}`,
      });
    }
    if (linksFor(item).length > 0) {
      withLinks++;
      row.push({
        text: row.length ? "🔗" : `🔗 ${i + 1}. ${item.title.slice(0, 30)}`,
        callback_data: `l:${item.id}`,
      });
    }
    if (row.length) buttons.push(row);
  });

  lines.push(
    "",
    `<i>${
      withFiles && withLinks
        ? "Tap ⬇ for the original file, 🔗 for that record's links."
        : withFiles
          ? "Tap one below to download the original."
          : withLinks
            ? "Tap 🔗 to see a record's links."
            : "None of these have an original file or a link attached."
    }</i>`,
  );

  // Nothing is sent unprompted — the user chooses which file they wanted.
  await sendMessage(
    chatId,
    lines.join("\n"),
    buttons.length ? buttons : undefined,
  );
}

/** Category · organisation · date — the one-line identity of a record. */
function meta(item: ItemWithFile): string {
  return [item.category, item.organization, formatDate(item.date)]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Renders one record's links as labelled pairs. The label goes above the URL
 * rather than beside it because a long URL wraps on a phone, and a wrapped
 * line that starts with the label reads as two links instead of one.
 */
function linkLines(links: RecordLink[]): string[] {
  return links.flatMap((l) => [
    `    ${l.icon} <i>${esc(l.label)}</i>`,
    `    ${esc(l.url)}`,
  ]);
}

/**
 * Joins blocks into one message without exceeding Telegram's limit, reporting
 * anything left out instead of dropping it silently.
 */
function fit(
  header: string[],
  blocks: string[][],
  omitted: (n: number) => string,
): string {
  const out = [...header];
  let used = out.join("\n").length;
  let dropped = 0;

  for (const block of blocks) {
    const chunk = block.join("\n");
    if (used + chunk.length + 1 > MESSAGE_BUDGET) {
      dropped++;
      continue;
    }
    out.push(chunk);
    used += chunk.length + 1;
  }

  if (dropped) out.push(`<i>${esc(omitted(dropped))}</i>`);
  return out.join("\n");
}

/**
 * Answers a question about links with the URLs themselves, labelled. Called
 * only when at least one matched record has a link.
 */
async function sendLinkAnswer(
  chatId: number,
  answer: string,
  items: ItemWithFile[],
) {
  const found = items
    .map((item) => ({ item, links: linksFor(item) }))
    .filter((r) => r.links.length > 0);

  const total = found.reduce((n, r) => n + r.links.length, 0);
  const header = [
    esc(answer),
    "",
    `🔗 <b>${total} link${total === 1 ? "" : "s"}</b> across ${found.length} record${
      found.length === 1 ? "" : "s"
    }:`,
    "",
  ];
  const blocks = found.map(({ item, links }) => [
    `<b>${esc(item.title)}</b> — <i>${esc(meta(item))}</i>`,
    ...linkLines(links),
    "",
  ]);

  await sendMessage(
    chatId,
    fit(header, blocks, (n) => `${n} more record${n === 1 ? "" : "s"} — ask again more specifically, or use /links.`),
  );
}

/** Every link in the account, grouped by the record it belongs to. */
async function sendAllLinks(userId: string, chatId: number) {
  const found = (await listItems(userId))
    .map((item) => ({ item, links: linksFor(item) }))
    .filter((r) => r.links.length > 0);

  if (found.length === 0) {
    await sendMessage(
      chatId,
      [
        "No record in your Chronicle has a link yet.",
        "",
        "Paste a URL — portfolio, GitHub repo, credential page — into the Upload page and it becomes a record like any file.",
      ].join("\n"),
    );
    return;
  }

  const total = found.reduce((n, r) => n + r.links.length, 0);
  const header = [
    `🔗 <b>${total} link${total === 1 ? "" : "s"}</b> across ${found.length} record${
      found.length === 1 ? "" : "s"
    }`,
    "",
  ];
  const blocks = found.map(({ item, links }) => [
    `<b>${esc(item.title)}</b> — <i>${esc(meta(item))}</i>`,
    ...linkLines(links),
    "",
  ]);

  await sendMessage(
    chatId,
    fit(
      header,
      blocks,
      (n) =>
        `${n} more record${n === 1 ? "" : "s"} with links did not fit — ask for them by name.`,
    ),
  );
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

  if (data.startsWith("l:")) {
    await answerCallbackQuery(cb.id);
    await sendItemLinks(user.id, chatId, data.slice(2));
    return;
  }

  if (!data.startsWith("f:")) {
    await answerCallbackQuery(cb.id);
    return;
  }

  await answerCallbackQuery(cb.id, "Sending…");
  await deliver(user.id, chatId, data.slice(2));
}

/** Sends one record's links, each labelled with what it points at. */
async function sendItemLinks(userId: string, chatId: number, itemId: string) {
  // Scoped by owner, exactly like the file path: a guessed id resolves to
  // nothing rather than to another account's link.
  const item = await getItem(userId, itemId);
  if (!item) {
    await sendMessage(chatId, "That record no longer exists.");
    return;
  }

  const links = linksFor(item);
  if (links.length === 0) {
    await sendMessage(chatId, `<b>${esc(item.title)}</b> has no links stored.`);
    return;
  }

  await sendMessage(
    chatId,
    fit(
      [`🔗 <b>${esc(item.title)}</b>`, `<i>${esc(meta(item))}</i>`, ""],
      links.map((l) => linkLines([l])),
      (n) => `${n} more link${n === 1 ? "" : "s"} did not fit in one message.`,
    ),
  );
}

/** Sends one record's original file, preserving its filename and type. */
async function deliver(userId: string, chatId: number, itemId: string) {
  // Scoped by owner: a guessed id from another account resolves to nothing.
  const item = await getItem(userId, itemId);
  if (!item) {
    await sendMessage(chatId, "That record no longer exists.");
    return;
  }

  // A link-only record has nothing to download, but it does have somewhere to
  // go — so hand back the links rather than a dead end.
  if (!item.file) {
    const links = linksFor(item);
    await sendMessage(
      chatId,
      [
        `<b>${esc(item.title)}</b> has no stored file.`,
        ...(links.length
          ? ["", "It lives at:", ...linkLines(links)]
          : []),
      ].join("\n"),
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
    caption: `<b>${esc(item.title)}</b>\n<i>${esc(meta(item))}</i>`,
  });
}
