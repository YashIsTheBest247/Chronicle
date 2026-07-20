import "server-only";
import { nanoid } from "nanoid";
import { db } from "./db";

export interface ChronicleUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  telegramChatId: number | null;
}

type Row = Record<string, unknown>;

function toUser(r: Row): ChronicleUser {
  return {
    id: r.id as string,
    email: r.email as string,
    name: (r.name as string | null) ?? null,
    image: (r.image as string | null) ?? null,
    telegramChatId:
      r.telegram_chat_id === null || r.telegram_chat_id === undefined
        ? null
        : Number(r.telegram_chat_id),
  };
}

/**
 * Upserts the signed-in Google account. Email is the natural key: the same
 * person signing in again must land on the same records, so a fresh id is
 * only minted when the email is genuinely new.
 */
export async function upsertUser(args: {
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<ChronicleUser> {
  const sql = await db();
  const [row] = await sql<Row[]>`
    insert into users (id, email, name, image)
    values (${nanoid(14)}, ${args.email.toLowerCase()}, ${args.name ?? null}, ${args.image ?? null})
    on conflict (email) do update
      set name  = coalesce(excluded.name, users.name),
          image = coalesce(excluded.image, users.image)
    returning id, email, name, image, telegram_chat_id
  `;
  return toUser(row);
}

export async function getUserById(id: string): Promise<ChronicleUser | null> {
  const sql = await db();
  const [row] = await sql<Row[]>`
    select id, email, name, image, telegram_chat_id from users where id = ${id}
  `;
  return row ? toUser(row) : null;
}

export async function getUserByTelegramChat(
  chatId: number,
): Promise<ChronicleUser | null> {
  const sql = await db();
  const [row] = await sql<Row[]>`
    select id, email, name, image, telegram_chat_id
    from users where telegram_chat_id = ${chatId}
  `;
  return row ? toUser(row) : null;
}

/** Mints a short-lived code the user pastes into Telegram to link that chat. */
export async function createLinkCode(userId: string): Promise<string> {
  const sql = await db();
  // Ambiguous characters removed: this gets read off a screen and retyped.
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  await sql`
    insert into telegram_link_codes (code, user_id, expires_at)
    values (${code}, ${userId}, now() + interval '15 minutes')
  `;
  return code;
}

/**
 * Redeems a link code, binding this Telegram chat to the account. Codes are
 * single-use — deleted on redemption — and a chat can only map to one user.
 */
export async function redeemLinkCode(
  code: string,
  chatId: number,
): Promise<ChronicleUser | null> {
  const sql = await db();
  return sql.begin(async (tx) => {
    const [row] = await tx<Row[]>`
      delete from telegram_link_codes
      where code = ${code.toUpperCase()} and expires_at > now()
      returning user_id
    `;
    if (!row) return null;

    // Releasing the chat from any previous owner keeps the unique index happy
    // when someone re-links a chat to a different account.
    await tx`update users set telegram_chat_id = null where telegram_chat_id = ${chatId}`;
    const [user] = await tx<Row[]>`
      update users set telegram_chat_id = ${chatId}
      where id = ${row.user_id as string}
      returning id, email, name, image, telegram_chat_id
    `;
    return user ? toUser(user) : null;
  });
}

export async function unlinkTelegram(userId: string): Promise<void> {
  const sql = await db();
  await sql`update users set telegram_chat_id = null where id = ${userId}`;
}
