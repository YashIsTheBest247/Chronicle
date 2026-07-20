import "server-only";
import { db } from "./db";
import { categoryColor, relationLabel, yearOf } from "./utils";
import type { Category } from "./types";

/**
 * The public profile.
 *
 * PRIVACY: this module deliberately never selects `content`, `file_id`, or
 * anything that could reach `readFileBytes`. A public profile shows the shape
 * of someone's journey — titles, categories, dates, skills, connections —
 * and never the documents themselves. Those stay behind the session.
 */

type Row = Record<string, unknown>;

export interface PublicRecord {
  id: string;
  title: string;
  summary: string;
  category: Category;
  date: string | null;
  organization: string | null;
  skills: string[];
  highlights: string[];
}

export interface PublicProfile {
  handle: string;
  name: string | null;
  image: string | null;
  headline: string | null;
  totals: { records: number; connections: number; skills: number };
  years: { year: string; items: PublicRecord[] }[];
  skills: { name: string; count: number }[];
  categories: { name: Category; count: number; color: string }[];
  graph: {
    nodes: { id: string; label: string; category: string; color: string; degree: number }[];
    links: { source: string; target: string; label: string; weight: number }[];
  };
}

/** Loads a profile by handle, or null when it does not exist or is private. */
export async function getPublicProfile(
  handle: string,
): Promise<PublicProfile | null> {
  const sql = await db();

  const [user] = await sql<Row[]>`
    select id, handle, name, image, headline
    from users
    where lower(handle) = lower(${handle}) and profile_public = true
  `;
  if (!user) return null;

  const userId = user.id as string;

  // Explicit column list, not select * — an accidental `content` here would
  // publish the full text of every document.
  const rows = await sql<Row[]>`
    select id, title, summary, category, date, organization, skills, highlights
    from items
    where user_id = ${userId} and hidden = false
    order by date desc nulls last, created_at desc
  `;

  const records: PublicRecord[] = rows.map((r) => ({
    id: r.id as string,
    title: r.title as string,
    summary: r.summary as string,
    category: r.category as Category,
    date: (r.date as string | null) ?? null,
    organization: (r.organization as string | null) ?? null,
    skills: (r.skills as string[]) ?? [],
    highlights: (r.highlights as string[]) ?? [],
  }));

  const visible = new Set(records.map((r) => r.id));

  // Relations are filtered to visible records on both ends, so hiding a
  // record also hides every edge that would have revealed it.
  const relRows = await sql<Row[]>`
    select r.from_id, r.to_id, r.kind, r.weight
    from relations r
    join items a on a.id = r.from_id and a.hidden = false
    join items b on b.id = r.to_id   and b.hidden = false
    where r.user_id = ${userId}
  `;
  const links = relRows
    .filter((r) => visible.has(r.from_id as string) && visible.has(r.to_id as string))
    .map((r) => ({
      source: r.from_id as string,
      target: r.to_id as string,
      label: relationLabel(r.kind as string),
      weight: Number(r.weight),
    }));

  // --- derived views -------------------------------------------------------
  const byYear = new Map<string, PublicRecord[]>();
  for (const rec of records) {
    const y = yearOf(rec.date);
    byYear.set(y, [...(byYear.get(y) ?? []), rec]);
  }
  const years = [...byYear.entries()]
    .map(([year, items]) => ({
      year,
      items: items.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
    }))
    .sort((a, b) => {
      if (a.year === "Undated") return 1;
      if (b.year === "Undated") return -1;
      return b.year.localeCompare(a.year);
    });

  const skillCounts = new Map<string, number>();
  for (const rec of records) {
    for (const s of rec.skills) skillCounts.set(s, (skillCounts.get(s) ?? 0) + 1);
  }
  const skills = [...skillCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));

  const catCounts = new Map<Category, number>();
  for (const rec of records) {
    catCounts.set(rec.category, (catCounts.get(rec.category) ?? 0) + 1);
  }
  const categories = [...catCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, color: categoryColor(name) }));

  const degree = new Map<string, number>();
  for (const l of links) {
    degree.set(l.source, (degree.get(l.source) ?? 0) + 1);
    degree.set(l.target, (degree.get(l.target) ?? 0) + 1);
  }

  return {
    handle: user.handle as string,
    name: (user.name as string | null) ?? null,
    image: (user.image as string | null) ?? null,
    headline: (user.headline as string | null) ?? null,
    totals: {
      records: records.length,
      connections: links.length,
      skills: skills.length,
    },
    years,
    skills,
    categories,
    graph: {
      nodes: records.map((r) => ({
        id: r.id,
        label: r.title,
        category: r.category,
        color: categoryColor(r.category),
        degree: degree.get(r.id) ?? 0,
      })),
      links,
    },
  };
}

// --------------------------------------------------------------- settings --

export interface ProfileSettings {
  handle: string | null;
  isPublic: boolean;
  headline: string | null;
}

export async function getProfileSettings(
  userId: string,
): Promise<ProfileSettings> {
  const sql = await db();
  const [row] = await sql<Row[]>`
    select handle, profile_public, headline from users where id = ${userId}
  `;
  return {
    handle: (row?.handle as string | null) ?? null,
    isPublic: Boolean(row?.profile_public),
    headline: (row?.headline as string | null) ?? null,
  };
}

/** Handles are lowercase, 3–24 chars, letters/numbers/hyphens. */
export function normaliseHandle(raw: string): string | null {
  const h = raw.trim().toLowerCase().replace(/^@/, "");
  return /^[a-z0-9][a-z0-9-]{2,23}$/.test(h) ? h : null;
}

/** Reserved so a profile can never shadow an app route. */
const RESERVED = new Set([
  "api", "login", "dashboard", "timeline", "graph", "search", "upload",
  "settings", "record", "admin", "p", "about", "help", "chronicle",
]);

export async function saveProfileSettings(
  userId: string,
  args: { handle?: string; isPublic?: boolean; headline?: string },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sql = await db();

  if (args.handle !== undefined) {
    const handle = normaliseHandle(args.handle);
    if (!handle) {
      return {
        ok: false,
        error:
          "Use 3–24 characters: lowercase letters, numbers or hyphens, starting with a letter or number.",
      };
    }
    if (RESERVED.has(handle)) {
      return { ok: false, error: "That handle is reserved." };
    }
    try {
      await sql`update users set handle = ${handle} where id = ${userId}`;
    } catch {
      // The unique index is the source of truth for availability; catching
      // the violation avoids a check-then-set race between two users.
      return { ok: false, error: "That handle is already taken." };
    }
  }

  if (args.isPublic !== undefined) {
    await sql`
      update users set profile_public = ${args.isPublic} where id = ${userId}
    `;
  }

  if (args.headline !== undefined) {
    const headline = args.headline.trim().slice(0, 120);
    await sql`
      update users set headline = ${headline || null} where id = ${userId}
    `;
  }

  return { ok: true };
}

/** Toggles whether one record appears on the public profile. */
export async function setRecordHidden(
  userId: string,
  itemId: string,
  hidden: boolean,
): Promise<void> {
  const sql = await db();
  await sql`
    update items set hidden = ${hidden}
    where id = ${itemId} and user_id = ${userId}
  `;
}
