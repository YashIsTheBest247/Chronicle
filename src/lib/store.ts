import "server-only";
import type postgres from "postgres";
import { db, toVector } from "./db";
import type {
  Category,
  Item,
  ItemWithFile,
  Relation,
  SourceFile,
} from "./types";

/**
 * Every read and write in Chronicle goes through this module. Ranking that
 * can be expressed in SQL is expressed in SQL — the vector search below is a
 * pgvector index scan, not a full table load with cosine in JavaScript.
 */

type Row = Record<string, unknown>;

// ---------------------------------------------------------------- mapping --

function toItem(r: Row): Item {
  return {
    id: r.id as string,
    fileId: (r.file_id as string | null) ?? null,
    url: (r.url as string | null) ?? null,
    title: r.title as string,
    summary: r.summary as string,
    category: r.category as Category,
    date: (r.date as string | null) ?? null,
    dateConfidence: r.date_confidence as Item["dateConfidence"],
    organization: (r.organization as string | null) ?? null,
    skills: (r.skills as string[]) ?? [],
    tags: (r.tags as string[]) ?? [],
    people: (r.people as string[]) ?? [],
    links: (r.links as string[]) ?? [],
    highlights: (r.highlights as string[]) ?? [],
    text: (r.content as string) ?? "",
    // Only selected on the paths that need it; absent elsewhere.
    embedding: parseVector(r.embedding),
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

function toFile(r: Row): SourceFile | null {
  if (!r.f_id) return null;
  return {
    id: r.f_id as string,
    name: r.f_name as string,
    mime: r.f_mime as string,
    size: Number(r.f_size),
    uploadedAt: new Date(r.f_uploaded_at as string).toISOString(),
  };
}

function toItemWithFile(r: Row): ItemWithFile {
  return { ...toItem(r), file: toFile(r) };
}

/**
 * Item columns plus its file, minus the embedding. Read paths that render UI
 * never need 768 floats per row, and selecting them is the difference
 * between a 4 KB response and a 400 KB one.
 */
function itemColumns(sql: postgres.Sql) {
  return sql`
    i.id, i.file_id, i.url, i.title, i.summary, i.category, i.date,
    i.date_confidence, i.organization, i.skills, i.tags, i.people,
    i.links, i.highlights, i.content, i.created_at,
    f.id as f_id, f.name as f_name, f.mime as f_mime,
    f.size as f_size, f.uploaded_at as f_uploaded_at
  `;
}

// ------------------------------------------------------------------ reads --

export async function listItems(category?: Category): Promise<ItemWithFile[]> {
  const sql = await db();
  const rows = await sql<Row[]>`
    select ${itemColumns(sql)}
    from items i
    left join files f on f.id = i.file_id
    ${category ? sql`where i.category = ${category}` : sql``}
    order by i.date desc nulls last, i.created_at desc
  `;
  return rows.map(toItemWithFile);
}

/**
 * pgvector has no binary codec registered here, so a vector arrives as the
 * text form "[0.1,0.2,…]" — and as `undefined` on the read paths that don't
 * select it at all. Both collapse to a plain number array here so no caller
 * can mistake a string for a vector.
 */
function parseVector(v: unknown): number[] {
  if (Array.isArray(v)) return v as number[];
  if (typeof v !== "string") return [];
  try {
    return JSON.parse(v) as number[];
  } catch {
    return [];
  }
}

/** Item columns plus the vector, rendered as text so it can be parsed. */
function itemColumnsWithVector(sql: postgres.Sql) {
  return sql`
    id, file_id, url, title, summary, category, date, date_confidence,
    organization, skills, tags, people, links, highlights, content,
    created_at, embedding::text as embedding
  `;
}

/**
 * Items including their vectors. Only the relationship engine needs these —
 * every UI read path uses `listItems()` and leaves the embeddings in Postgres.
 */
export async function listItemsWithEmbeddings(): Promise<Item[]> {
  const sql = await db();
  const rows = await sql<Row[]>`
    select ${itemColumnsWithVector(sql)} from items order by created_at asc
  `;
  return rows.map(toItem);
}

export async function getItem(id: string): Promise<ItemWithFile | null> {
  const sql = await db();
  const [row] = await sql<Row[]>`
    select ${itemColumns(sql)}
    from items i
    left join files f on f.id = i.file_id
    where i.id = ${id}
  `;
  return row ? toItemWithFile(row) : null;
}

export async function countItems(): Promise<number> {
  const sql = await db();
  const [row] = await sql<Row[]>`select count(*)::int as n from items`;
  return Number(row.n);
}

/** Per-category totals, including the categories sitting at zero. */
export async function categoryCounts(): Promise<Record<string, number>> {
  const sql = await db();
  const rows = await sql<Row[]>`
    select category, count(*)::int as n from items group by category
  `;
  return Object.fromEntries(rows.map((r) => [r.category as string, Number(r.n)]));
}

/** Skill frequency across the whole Chronicle, computed in the database. */
export async function skillFrequency(): Promise<
  { name: string; count: number }[]
> {
  const sql = await db();
  const rows = await sql<Row[]>`
    select skill as name, count(*)::int as n
    from items, unnest(skills) as skill
    group by skill
    order by n desc, skill asc
  `;
  return rows.map((r) => ({ name: r.name as string, count: Number(r.n) }));
}

export async function listRelations(): Promise<Relation[]> {
  const sql = await db();
  const rows = await sql<Row[]>`select * from relations`;
  return rows.map((r) => ({
    id: r.id as string,
    from: r.from_id as string,
    to: r.to_id as string,
    kind: r.kind as Relation["kind"],
    weight: Number(r.weight),
    reason: r.reason as string,
  }));
}

export async function countRelations(): Promise<number> {
  const sql = await db();
  const [row] = await sql<Row[]>`select count(*)::int as n from relations`;
  return Number(row.n);
}

/** Every edge touching `id`, joined to the record on the other end. */
export async function getConnections(id: string): Promise<
  {
    relation: Relation;
    direction: "outgoing" | "incoming";
    item: ItemWithFile;
  }[]
> {
  const sql = await db();
  const rows = await sql<Row[]>`
    select
      r.id as r_id, r.kind, r.weight, r.reason,
      case when r.from_id = ${id} then 'outgoing' else 'incoming' end as direction,
      ${itemColumns(sql)}
    from relations r
    join items i
      on i.id = case when r.from_id = ${id} then r.to_id else r.from_id end
    left join files f on f.id = i.file_id
    where r.from_id = ${id} or r.to_id = ${id}
    order by r.weight desc
  `;
  return rows.map((r) => ({
    relation: {
      id: r.r_id as string,
      from: r.direction === "outgoing" ? id : (r.id as string),
      to: r.direction === "outgoing" ? (r.id as string) : id,
      kind: r.kind as Relation["kind"],
      weight: Number(r.weight),
      reason: r.reason as string,
    },
    direction: r.direction as "outgoing" | "incoming",
    item: toItemWithFile(r),
  }));
}

// --------------------------------------------------------------- retrieval --

export interface VectorFilters {
  categories?: Category[];
  organizations?: string[];
  dateFrom?: string;
  dateTo?: string;
}

/**
 * ANN search over the HNSW index. `<=>` is cosine distance, so similarity is
 * 1 minus it. Structured filters are applied in the same statement, which
 * lets Postgres narrow before ranking rather than after.
 */
export async function searchByVector(
  vector: number[],
  limit: number,
  filters: VectorFilters = {},
): Promise<{ item: ItemWithFile; similarity: number }[]> {
  const sql = await db();
  const { categories = [], organizations = [], dateFrom, dateTo } = filters;
  // A bare year as an upper bound should include that entire year.
  const upper = dateTo && dateTo.length === 4 ? `${dateTo}-12-31` : dateTo;

  const rows = await sql<Row[]>`
    select ${itemColumns(sql)},
           1 - (i.embedding <=> ${toVector(vector)}::vector) as similarity
    from items i
    left join files f on f.id = i.file_id
    where i.embedding is not null
      ${categories.length ? sql`and i.category = any(${categories}::text[])` : sql``}
      ${
        organizations.length
          ? sql`and i.organization ilike any(${organizations.map((o) => `%${o}%`)}::text[])`
          : sql``
      }
      ${dateFrom ? sql`and (i.date is null or i.date >= ${dateFrom})` : sql``}
      ${upper ? sql`and (i.date is null or i.date <= ${upper})` : sql``}
    order by i.embedding <=> ${toVector(vector)}::vector
    limit ${limit}
  `;
  return rows.map((r) => ({
    item: toItemWithFile(r),
    similarity: Number(r.similarity),
  }));
}

/**
 * Candidates for the relationship engine: anything sharing a skill or an
 * organisation (a GIN index lookup), plus the nearest vector neighbours.
 * This replaces loading the entire table to compare in memory.
 */
export async function relationCandidates(
  item: Item,
  vectorLimit = 14,
): Promise<Item[]> {
  const sql = await db();
  const rows = await sql<Row[]>`
    with overlapping as (
      select ${itemColumnsWithVector(sql)} from items
      where id <> ${item.id}
        and (
          -- Empty arrays need the cast; Postgres cannot infer '{}' as text[].
          skills && ${item.skills}::text[]
          ${item.organization ? sql`or organization = ${item.organization}` : sql``}
        )
    ),
    nearest as (
      select ${itemColumnsWithVector(sql)} from items
      where id <> ${item.id}
        and embedding is not null
      order by embedding <=> ${toVector(item.embedding)}::vector
      limit ${vectorLimit}
    )
    select distinct on (id) *
    from (select * from overlapping union all select * from nearest) u
    order by id
  `;
  return rows.map(toItem);
}

// ----------------------------------------------------------------- writes --

export async function saveFile(
  id: string,
  name: string,
  mime: string,
  bytes: Buffer,
): Promise<SourceFile> {
  const sql = await db();
  const [row] = await sql<Row[]>`
    insert into files (id, name, mime, size, bytes)
    values (${id}, ${name}, ${mime}, ${bytes.byteLength}, ${bytes})
    returning id, name, mime, size, uploaded_at
  `;
  return {
    id: row.id as string,
    name: row.name as string,
    mime: row.mime as string,
    size: Number(row.size),
    uploadedAt: new Date(row.uploaded_at as string).toISOString(),
  };
}

/** Streams the original bytes back out, exactly as they went in. */
export async function readFileBytes(
  id: string,
): Promise<{ file: SourceFile; bytes: Buffer } | null> {
  const sql = await db();
  const [row] = await sql<Row[]>`
    select id, name, mime, size, bytes, uploaded_at from files where id = ${id}
  `;
  if (!row) return null;
  return {
    file: {
      id: row.id as string,
      name: row.name as string,
      mime: row.mime as string,
      size: Number(row.size),
      uploadedAt: new Date(row.uploaded_at as string).toISOString(),
    },
    bytes: Buffer.from(row.bytes as Uint8Array),
  };
}

export async function addItem(item: Item): Promise<void> {
  const sql = await db();
  await sql`
    insert into items (
      id, file_id, url, title, summary, category, date, date_confidence,
      organization, skills, tags, people, links, highlights, content,
      embedding, created_at
    ) values (
      ${item.id}, ${item.fileId}, ${item.url}, ${item.title}, ${item.summary},
      ${item.category}, ${item.date}, ${item.dateConfidence},
      ${item.organization}, ${item.skills}, ${item.tags}, ${item.people},
      ${item.links}, ${item.highlights}, ${item.text},
      ${toVector(item.embedding)}::vector, ${item.createdAt}
    )
  `;
}

export async function addItems(items: Item[]): Promise<void> {
  // Sequential inside one transaction: the batch is small and this keeps the
  // insert statement identical to the single-item path.
  const sql = await db();
  await sql.begin(async (tx) => {
    for (const item of items) {
      await tx`
        insert into items (
          id, file_id, url, title, summary, category, date, date_confidence,
          organization, skills, tags, people, links, highlights, content,
          embedding, created_at
        ) values (
          ${item.id}, ${item.fileId}, ${item.url}, ${item.title},
          ${item.summary}, ${item.category}, ${item.date},
          ${item.dateConfidence}, ${item.organization}, ${item.skills},
          ${item.tags}, ${item.people}, ${item.links}, ${item.highlights},
          ${item.text}, ${toVector(item.embedding)}::vector, ${item.createdAt}
        )
      `;
    }
  });
}

/** Swaps in a freshly computed edge set for one item, atomically. */
export async function replaceRelationsFor(
  id: string,
  relations: Relation[],
): Promise<void> {
  const sql = await db();
  await sql.begin(async (tx) => {
    await tx`delete from relations where from_id = ${id} or to_id = ${id}`;
    for (const r of relations) {
      await tx`
        insert into relations (id, from_id, to_id, kind, weight, reason)
        values (${r.id}, ${r.from}, ${r.to}, ${r.kind}, ${r.weight}, ${r.reason})
        on conflict (from_id, to_id) do update
          set kind = excluded.kind,
              weight = excluded.weight,
              reason = excluded.reason
      `;
    }
  });
}

export async function deleteItem(id: string): Promise<void> {
  const sql = await db();
  await sql.begin(async (tx) => {
    const [row] = await tx<Row[]>`select file_id from items where id = ${id}`;
    const fileId = (row?.file_id as string | null) ?? null;
    // Relations cascade on the foreign key; the file needs an explicit delete.
    await tx`delete from items where id = ${id}`;
    if (fileId) await tx`delete from files where id = ${fileId}`;
  });
}

export async function reset(): Promise<void> {
  const sql = await db();
  await sql`truncate relations, items, files restart identity cascade`;
}
