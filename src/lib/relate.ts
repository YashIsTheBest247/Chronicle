import "server-only";
import { nanoid } from "nanoid";
import { cosine, generateJSON } from "./gemini";
import {
  RELATION_KINDS,
  type Item,
  type Relation,
  type RelationKind,
} from "./types";

/**
 * The relationship engine runs in two passes.
 *
 * Pass 1 is deterministic: two records that name the same skill or the same
 * organisation are related, full stop — no model call, no ambiguity, and the
 * edge carries a reason the user can verify at a glance.
 *
 * Pass 2 asks Gemini to label the semantically-near pairs that pass 1 missed,
 * which is where the interesting links live (a project that grew out of a
 * course, an internship that followed a certification).
 */

const SEMANTIC_FLOOR = 0.62; // below this, "related" is noise
const MAX_SEMANTIC_CANDIDATES = 14;

/** Directional preferences that make the graph read as a progression. */
const FLOW: Partial<Record<string, RelationKind>> = {
  "Certifications>Skills": "proves",
  "Skills>Projects": "applies",
  "Projects>Internships": "led-to",
  "Academics>Skills": "proves",
  "Certifications>Projects": "applies",
  "Internships>Achievements": "led-to",
};

/**
 * `others` is the candidate set from `relationCandidates()` — records that
 * already share a skill or organisation, plus the nearest vector neighbours.
 * The full table is never loaded.
 */
export async function relateItem(
  item: Item,
  others: Item[],
): Promise<Relation[]> {
  if (others.length === 0) return [];

  const edges = new Map<string, Relation>();
  const add = (r: Relation) => {
    // One edge per pair; the strongest weight wins.
    const key = [r.from, r.to].sort().join("|");
    const existing = edges.get(key);
    if (!existing || r.weight > existing.weight) edges.set(key, r);
  };

  // ---- Pass 1: provable overlap -------------------------------------------
  const mySkills = new Set(item.skills.map((s) => s.toLowerCase()));
  const myOrg = item.organization?.toLowerCase().trim();

  for (const other of others) {
    const shared = other.skills.filter((s) => mySkills.has(s.toLowerCase()));
    if (shared.length > 0) {
      const flow =
        FLOW[`${item.category}>${other.category}`] ??
        FLOW[`${other.category}>${item.category}`];
      const reversed = !FLOW[`${item.category}>${other.category}`] && Boolean(flow);
      add({
        id: nanoid(10),
        from: reversed ? other.id : item.id,
        to: reversed ? item.id : other.id,
        kind: flow ?? "same-skill",
        // Two shared skills is meaningfully stronger evidence than one.
        weight: Math.min(0.95, 0.6 + 0.12 * shared.length),
        reason: `Both involve ${shared.slice(0, 3).join(", ")}`,
      });
    }

    const otherOrg = other.organization?.toLowerCase().trim();
    if (myOrg && otherOrg && myOrg === otherOrg) {
      add({
        id: nanoid(10),
        from: item.id,
        to: other.id,
        kind: "same-org",
        weight: 0.72,
        reason: `Both from ${other.organization}`,
      });
    }
  }

  // ---- Pass 2: semantic neighbours, labelled by Gemini ---------------------
  const candidates = others
    .filter((o) => !edges.has([item.id, o.id].sort().join("|")))
    .map((o) => ({ item: o, score: cosine(item.embedding, o.embedding) }))
    .filter((c) => c.score >= SEMANTIC_FLOOR)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SEMANTIC_CANDIDATES);

  if (candidates.length > 0) {
    try {
      const labelled = await labelPairs(item, candidates.map((c) => c.item));
      for (const link of labelled) {
        const target = candidates.find((c) => c.item.id === link.id);
        if (!target) continue;
        add({
          id: nanoid(10),
          from: link.direction === "incoming" ? target.item.id : item.id,
          to: link.direction === "incoming" ? item.id : target.item.id,
          kind: link.kind,
          // Blend the model's confidence with the raw vector distance.
          weight: Math.min(0.95, 0.5 * link.confidence + 0.5 * target.score),
          reason: link.reason,
        });
      }
    } catch {
      // If labelling fails the graph degrades to unlabelled neighbours
      // rather than losing the edges entirely.
      for (const c of candidates.slice(0, 4)) {
        add({
          id: nanoid(10),
          from: item.id,
          to: c.item.id,
          kind: "related",
          weight: c.score,
          reason: "Semantically similar records",
        });
      }
    }
  }

  return [...edges.values()];
}

const LINK_SCHEMA = {
  type: "object",
  properties: {
    links: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          kind: { type: "string", enum: [...RELATION_KINDS] },
          direction: { type: "string", enum: ["outgoing", "incoming"] },
          confidence: { type: "number" },
          reason: { type: "string" },
        },
        required: ["id", "kind", "direction", "confidence", "reason"],
      },
    },
  },
  required: ["links"],
} as const;

interface LabelledLink {
  id: string;
  kind: RelationKind;
  direction: "outgoing" | "incoming";
  confidence: number;
  reason: string;
}

async function labelPairs(
  item: Item,
  candidates: Item[],
): Promise<LabelledLink[]> {
  const describe = (i: Item) =>
    `id: ${i.id}\ncategory: ${i.category}\ntitle: ${i.title}\ndate: ${i.date ?? "unknown"}\norg: ${i.organization ?? "—"}\nskills: ${i.skills.join(", ") || "—"}\nsummary: ${i.summary}`;

  const result = await generateJSON<{ links: LabelledLink[] }>({
    system: `You map relationships in a student's record graph.

Given one focus record and a list of candidate records, return only the pairs with a real, defensible connection. Omit weak ones — a short precise list beats a long speculative one.

Relationship kinds:
- proves: the first record is evidence the second capability was acquired
- applies: the first record's skill was put to work in the second
- led-to: the first record plausibly caused or enabled the second
- part-of: the first belongs to a larger programme named by the second
- issued-by / same-org: they share an issuing or employing body
- same-skill: they share a demonstrated capability
- continues: a later record builds directly on an earlier one
- related: a genuine link that none of the above describes

"direction" is relative to the focus record: "outgoing" means focus -> candidate; "incoming" means candidate -> focus. Point the arrow the way time and causality actually run.

"reason" is one short clause a student would recognise as true. Under twelve words. No hedging.
"confidence" is 0 to 1.`,
    prompt: `FOCUS RECORD\n${describe(item)}\n\nCANDIDATES\n${candidates.map(describe).join("\n\n")}`,
    schema: LINK_SCHEMA as unknown as Record<string, unknown>,
  });

  const valid = new Set(candidates.map((c) => c.id));
  return (result.links ?? []).filter(
    (l) =>
      valid.has(l.id) &&
      RELATION_KINDS.includes(l.kind) &&
      typeof l.confidence === "number" &&
      l.confidence >= 0.45,
  );
}

/** Text handed to the embedding model — dense in the fields users search by. */
export function embeddingText(e: {
  title: string;
  summary: string;
  category: string;
  organization: string | null;
  skills: string[];
  tags: string[];
  highlights: string[];
  date: string | null;
}): string {
  return [
    e.title,
    e.category,
    e.organization ?? "",
    e.date ?? "",
    e.summary,
    e.skills.join(", "),
    e.tags.join(", "),
    e.highlights.join(". "),
  ]
    .filter(Boolean)
    .join("\n");
}
