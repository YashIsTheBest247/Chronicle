import type { ClientItem, ItemWithFile } from "./types";

/** Strips server-only weight (vectors, full text) before crossing the wire. */
export function toClientItem(
  row: ItemWithFile,
  excerptLength = 400,
): ClientItem {
  const { embedding: _embedding, text, file, ...rest } = row;
  return { ...rest, excerpt: text.slice(0, excerptLength), file };
}

export function toClientItems(rows: ItemWithFile[]): ClientItem[] {
  return rows.map((r) => toClientItem(r));
}
