import "server-only";
import { embed, generateJSON, generateText } from "./gemini";
import { countItems, listItems, searchByVector } from "./store";
import {
  CATEGORIES,
  type Category,
  type ItemWithFile,
  type SearchResponse,
} from "./types";

/**
 * Retrieval is deliberately hybrid. Pure vector search is great at "things
 * about machine learning" and bad at "my latest resume" — the second is a
 * filter-and-sort question, not a similarity question. So a small structured
 * pass runs first and constrains the candidate set, then vectors rank what's
 * left, then exact lexical hits get a bump so a searched-for title always
 * surfaces at the top.
 */

const INTENT_SCHEMA = {
  type: "object",
  properties: {
    categories: {
      type: "array",
      items: { type: "string", enum: [...CATEGORIES] },
      description: "Only categories the user explicitly restricted to.",
    },
    skills: { type: "array", items: { type: "string" } },
    organizations: { type: "array", items: { type: "string" } },
    dateFrom: { type: "string", description: "YYYY or YYYY-MM-DD, else empty" },
    dateTo: { type: "string", description: "YYYY or YYYY-MM-DD, else empty" },
    wantsLatest: {
      type: "boolean",
      description: "True when the user asked for the most recent one.",
    },
    semanticQuery: {
      type: "string",
      description:
        "The topical part of the query, stripped of filter words. For 'show my AI projects from 2024' this is 'AI'.",
    },
  },
  required: [
    "categories",
    "skills",
    "organizations",
    "dateFrom",
    "dateTo",
    "wantsLatest",
    "semanticQuery",
  ],
} as const;

interface Intent {
  categories: Category[];
  skills: string[];
  organizations: string[];
  dateFrom: string;
  dateTo: string;
  wantsLatest: boolean;
  semanticQuery: string;
}

export interface SearchResult extends Omit<SearchResponse, "hits"> {
  hits: { item: ItemWithFile; score: number; matchedOn: string[] }[];
}

export async function search(
  userId: string,
  query: string,
  limit = 12,
): Promise<SearchResult> {
  const trimmed = query.trim();

  if ((await countItems(userId)) === 0) {
    return {
      query: trimmed,
      intent: emptyIntent(),
      answer: "Nothing has been added to this Chronicle yet.",
      hits: [],
    };
  }

  const intent = await parseIntent(trimmed);

  // --- Vector ranking, executed by pgvector --------------------------------
  const semantic = intent.semanticQuery || trimmed;
  let candidates: { item: ItemWithFile; similarity: number }[] = [];
  try {
    const [queryVec] = await embed([semantic], "RETRIEVAL_QUERY");
    // Over-fetch: the lexical and filter boosts below reorder these, so the
    // final top-N should be chosen from a wider pool than N.
    candidates = await searchByVector(userId, queryVec, Math.max(limit * 3, 30), {
      categories: intent.categories,
      organizations: intent.organizations,
      dateFrom: intent.dateFrom || undefined,
      dateTo: intent.dateTo || undefined,
    });
  } catch {
    // Embedding unavailable — fall back to lexical ranking over the table.
  }

  // A filter combination that matches nothing is worse than no filter at all.
  if (candidates.length === 0) {
    const all = await listItems(userId);
    candidates = all.map((item) => ({ item, similarity: 0 }));
  }

  const terms = tokenize(trimmed);
  const scored = candidates.map(({ item, similarity }) => {
    const matchedOn: string[] = [];
    let score = similarity;

    if (similarity > 0.7) matchedOn.push("meaning");

    const lexical = lexicalScore(item, terms);
    if (lexical > 0) {
      score += lexical;
      matchedOn.push("exact words");
    }

    // Reward the filters that actually fired, so an explicitly requested
    // category outranks a merely similar record from another one.
    if (intent.categories.includes(item.category)) {
      score += 0.25;
      matchedOn.push(item.category.toLowerCase());
    }
    if (
      intent.skills.some((s) =>
        item.skills.some((k) => k.toLowerCase() === s.toLowerCase()),
      )
    ) {
      score += 0.2;
      matchedOn.push("skill");
    }

    return { item, score, matchedOn };
  });

  scored.sort((a, b) => {
    // "latest" flips the primary sort to recency, with relevance as tiebreak.
    if (intent.wantsLatest) {
      const d = dateKey(b.item) - dateKey(a.item);
      if (d !== 0) return d;
    }
    return b.score - a.score;
  });

  const hits = scored.slice(0, intent.wantsLatest ? Math.min(limit, 3) : limit);
  const answer = await summarise(trimmed, hits);

  return {
    query: trimmed,
    intent: {
      categories: intent.categories,
      skills: intent.skills,
      organizations: intent.organizations,
      dateFrom: intent.dateFrom || null,
      dateTo: intent.dateTo || null,
      wantsLatest: intent.wantsLatest,
    },
    answer,
    hits,
  };
}

async function parseIntent(query: string): Promise<Intent> {
  try {
    const raw = await generateJSON<Intent>({
      system: `You convert a student's natural-language request about their own records into search filters.

Only set a filter the user actually implied. "Show my certificates" sets categories to ["Certifications"] and leaves everything else empty. "Show my AI projects" sets categories ["Projects"] and semanticQuery "AI". Do not invent date ranges.

Today is ${new Date().toISOString().slice(0, 10)}.`,
      prompt: query,
      schema: INTENT_SCHEMA as unknown as Record<string, unknown>,
    });
    return {
      categories: (raw.categories ?? []).filter((c) =>
        CATEGORIES.includes(c),
      ) as Category[],
      skills: raw.skills ?? [],
      organizations: raw.organizations ?? [],
      dateFrom: raw.dateFrom ?? "",
      dateTo: raw.dateTo ?? "",
      wantsLatest: Boolean(raw.wantsLatest),
      semanticQuery: raw.semanticQuery || query,
    };
  } catch {
    return { ...emptyIntent(), semanticQuery: query } as Intent;
  }
}

function emptyIntent() {
  return {
    categories: [] as Category[],
    skills: [] as string[],
    organizations: [] as string[],
    dateFrom: "",
    dateTo: "",
    wantsLatest: false,
    semanticQuery: "",
  };
}

function tokenize(q: string): string[] {
  const stop = new Set([
    "show", "me", "my", "all", "the", "a", "an", "of", "for", "from", "in",
    "on", "at", "and", "or", "find", "get", "list", "any", "i", "have",
  ]);
  return q
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((t) => t.length > 1 && !stop.has(t));
}

function lexicalScore(item: ItemWithFile, terms: string[]): number {
  if (terms.length === 0) return 0;
  const title = item.title.toLowerCase();
  const body = `${item.summary} ${item.skills.join(" ")} ${item.tags.join(" ")} ${item.organization ?? ""}`.toLowerCase();

  let score = 0;
  for (const t of terms) {
    if (title.includes(t)) score += 0.3;
    else if (body.includes(t)) score += 0.1;
  }
  // Cap so a keyword-stuffed record can't outrank genuine semantic relevance.
  return Math.min(score, 0.9);
}

/** Sortable numeric key from a partial date; undated records sort last. */
function dateKey(item: ItemWithFile): number {
  if (!item.date) return 0;
  const [y, m = "01", d = "01"] = item.date.split("-");
  return Number(y) * 10000 + Number(m) * 100 + Number(d);
}

async function summarise(query: string, hits: SearchResult["hits"]): Promise<string> {
  if (hits.length === 0) return "No records matched that.";
  try {
    const context = hits
      .slice(0, 6)
      .map(
        (h, i) =>
          `${i + 1}. ${h.item.title} — ${h.item.category}, ${h.item.organization ?? "no org"}, ${h.item.date ?? "undated"}. ${h.item.summary}`,
      )
      .join("\n");
    const text = await generateText(
      `Question: ${query}\n\nMatching records:\n${context}`,
      `You answer a student's question about their own records in one or two sentences.

Speak directly and factually about what was found. Reference the records by name where it helps. Never invent a record that is not listed. Do not begin with "Based on" or "I found". No markdown.`,
    );
    return text.trim() || fallbackAnswer(hits);
  } catch {
    return fallbackAnswer(hits);
  }
}

function fallbackAnswer(hits: SearchResult["hits"]): string {
  const n = hits.length;
  const cats = [...new Set(hits.map((h) => h.item.category))];
  return `${n} matching ${n === 1 ? "record" : "records"} across ${cats.join(", ")}.`;
}
