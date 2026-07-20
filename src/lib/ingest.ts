import "server-only";
import { nanoid } from "nanoid";
import { embed } from "./gemini";
import { extractFromFile, extractFromUrl } from "./extract";
import { embeddingText, relateItem } from "./relate";
import {
  addItem,
  listItems,
  relationCandidates,
  replaceRelationsFor,
  saveFile,
} from "./store";
import type { Item, Relation } from "./types";

/**
 * One ingest = understand, embed, store, then connect. The connect step runs
 * against everything already in the Chronicle, which is why uploading a
 * certificate can light up a project you added months earlier.
 */

export interface IngestResult {
  item: Item;
  relations: Relation[];
}

export async function ingestFile(
  userId: string,
  args: { name: string; mime: string; bytes: Buffer },
): Promise<IngestResult> {
  const fileId = nanoid(12);
  const { text, extraction } = await extractFromFile(args);
  const file = await saveFile(userId, fileId, args.name, args.mime, args.bytes);
  return finish(userId, { extraction, text, fileId: file.id, url: null });
}

export async function ingestUrl(
  userId: string,
  url: string,
): Promise<IngestResult> {
  const { text, extraction } = await extractFromUrl(url);
  return finish(userId, { extraction, text, fileId: null, url });
}

async function finish(userId: string, args: {
  extraction: Awaited<ReturnType<typeof extractFromFile>>["extraction"];
  text: string;
  fileId: string | null;
  url: string | null;
}): Promise<IngestResult> {
  const [vector] = await embed([embeddingText(args.extraction)]);

  const item: Item = {
    ...args.extraction,
    id: nanoid(12),
    fileId: args.fileId,
    url: args.url,
    // Keep enough source text to cite from without bloating the row.
    text: args.text.slice(0, 20_000),
    embedding: vector,
    createdAt: new Date().toISOString(),
  };

  await addItem(userId, item);

  // Candidates are drawn only from this account, so relationships can never
  // form across users.
  const candidates = await relationCandidates(userId, item);
  const relations = await relateItem(item, candidates);
  await replaceRelationsFor(userId, item.id, relations);

  return { item, relations };
}

/** Recomputes every edge in the graph — used after a bulk import or reset. */
export async function rebuildRelations(userId: string): Promise<number> {
  const items = await listItems(userId);
  let total = 0;
  for (const row of items) {
    const candidates = await relationCandidates(userId, row);
    const relations = await relateItem(row, candidates);
    await replaceRelationsFor(userId, row.id, relations);
    total += relations.length;
  }
  return total;
}
