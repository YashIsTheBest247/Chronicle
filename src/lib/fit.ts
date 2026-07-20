import "server-only";
import { embed, generateJSON, generateText } from "./gemini";
import { searchByVector } from "./store";
import { formatDate } from "./utils";
import type { ItemWithFile } from "./types";

/**
 * Opportunity fit — the feature that turns an archive into a career instrument.
 *
 * Given a job description, this works out which of the user's *own* records
 * satisfy each requirement, cites them, and names what is genuinely missing.
 *
 * The pipeline is deliberately retrieval-first: each requirement is embedded
 * and matched against the user's records by vector search, and only the
 * shortlisted candidates are shown to the model. That keeps the judgement
 * grounded in real records rather than letting an LLM free-associate about a
 * CV it half-remembers, and it keeps token cost proportional to the number of
 * requirements rather than the size of the Chronicle.
 */

export interface Requirement {
  id: string;
  text: string;
  kind: "skill" | "experience" | "education" | "other";
  importance: "must" | "nice";
}

export interface RequirementVerdict extends Requirement {
  met: boolean;
  /** 0..1 — how strongly the cited records support it. */
  confidence: number;
  /** Records that prove it, strongest first. */
  evidence: { id: string; title: string; date: string | null; why: string }[];
  /** What is missing, when it is not met. */
  gap: string | null;
}

export interface FitResult {
  role: string | null;
  score: number;
  verdict: string;
  requirements: RequirementVerdict[];
  strengths: string[];
  gaps: string[];
  /** Records that carried the most weight, for a "highlight these" hint. */
  keyRecords: { id: string; title: string; uses: number }[];
}

const JD_SCHEMA = {
  type: "object",
  properties: {
    role: { type: "string" },
    requirements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description:
              "One atomic requirement, as a short phrase. 'Python' not 'strong Python skills required'.",
          },
          kind: {
            type: "string",
            enum: ["skill", "experience", "education", "other"],
          },
          importance: { type: "string", enum: ["must", "nice"] },
        },
        required: ["text", "kind", "importance"],
      },
    },
  },
  required: ["role", "requirements"],
} as const;

const JUDGE_SCHEMA = {
  type: "object",
  properties: {
    verdicts: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          met: { type: "boolean" },
          confidence: { type: "number" },
          evidenceIds: { type: "array", items: { type: "string" } },
          why: {
            type: "string",
            description:
              "One clause naming the record and what it proves. Under fifteen words.",
          },
          gap: {
            type: "string",
            description:
              "When not met, what specifically is missing. Empty string when met.",
          },
        },
        required: ["id", "met", "confidence", "evidenceIds", "why", "gap"],
      },
    },
  },
  required: ["verdicts"],
} as const;

/** How many candidate records each requirement is judged against. */
const CANDIDATES_PER_REQUIREMENT = 4;
/** Below this cosine similarity a record is not worth showing the judge. */
const CANDIDATE_FLOOR = 0.35;

export async function assessFit(
  userId: string,
  jobDescription: string,
): Promise<FitResult> {
  // --- 1. Break the posting into atomic, checkable requirements -----------
  const parsed = await generateJSON<{
    role: string;
    requirements: Omit<Requirement, "id">[];
  }>({
    system: `You read a job or internship posting and reduce it to a checklist.

Rules:
- Each requirement is one atomic, checkable thing. Split "Python and SQL" into two.
- Strip fluff. "Excellent communication skills" is a requirement; "join a fast-paced team" is not.
- importance "must" for stated requirements, "nice" for preferred/bonus items.
- Return at most 12 requirements, most important first.`,
    prompt: jobDescription.slice(0, 12_000),
    schema: JD_SCHEMA as unknown as Record<string, unknown>,
  });

  const requirements: Requirement[] = (parsed.requirements ?? [])
    .slice(0, 12)
    .map((r, i) => ({ ...r, id: `r${i + 1}` }));

  if (requirements.length === 0) {
    return {
      role: parsed.role || null,
      score: 0,
      verdict: "That did not look like a job description.",
      requirements: [],
      strengths: [],
      gaps: [],
      keyRecords: [],
    };
  }

  // --- 2. Retrieve candidate evidence per requirement ---------------------
  // One batched embedding call for all requirements, then one vector query
  // each — cheaper and far more accurate than embedding the whole posting.
  const vectors = await embed(
    requirements.map((r) => r.text),
    "RETRIEVAL_QUERY",
  );

  const candidatesByReq = new Map<string, ItemWithFile[]>();
  const seen = new Map<string, ItemWithFile>();

  await Promise.all(
    requirements.map(async (req, i) => {
      const hits = await searchByVector(
        userId,
        vectors[i],
        CANDIDATES_PER_REQUIREMENT,
      );
      const kept = hits
        .filter((h) => h.similarity >= CANDIDATE_FLOOR)
        .map((h) => h.item);
      candidatesByReq.set(req.id, kept);
      for (const item of kept) seen.set(item.id, item);
    }),
  );

  if (seen.size === 0) {
    return {
      role: parsed.role || null,
      score: 0,
      verdict:
        "Nothing in your Chronicle matches this posting yet. Add some records and try again.",
      requirements: requirements.map((r) => ({
        ...r,
        met: false,
        confidence: 0,
        evidence: [],
        gap: r.text,
      })),
      strengths: [],
      gaps: requirements.filter((r) => r.importance === "must").map((r) => r.text),
      keyRecords: [],
    };
  }

  // --- 3. Judge each requirement against its shortlist --------------------
  const describe = (item: ItemWithFile) =>
    `[${item.id}] ${item.title} — ${item.category}${
      item.organization ? `, ${item.organization}` : ""
    }, ${formatDate(item.date)}. Skills: ${item.skills.join(", ") || "—"}. ${
      item.summary
    }${item.highlights.length ? ` Highlights: ${item.highlights.join("; ")}` : ""}`;

  const block = requirements
    .map((r) => {
      const cands = candidatesByReq.get(r.id) ?? [];
      return `${r.id} (${r.importance}) — ${r.text}\n${
        cands.length
          ? cands.map((c) => `    ${describe(c)}`).join("\n")
          : "    (no candidate records)"
      }`;
    })
    .join("\n\n");

  const judged = await generateJSON<{
    verdicts: {
      id: string;
      met: boolean;
      confidence: number;
      evidenceIds: string[];
      why: string;
      gap: string;
    }[];
  }>({
    system: `You decide whether a candidate meets each requirement, using only the records listed under it.

Rules:
- Cite record ids in evidenceIds. Never cite a record that is not listed under that requirement.
- met = true only when a listed record genuinely demonstrates the requirement. Adjacent is not the same: a Python certificate does not prove Django.
- Be honest. Inflating a match is worse than admitting a gap — the person is about to rely on this.
- "why" names the record and what it proves, under fifteen words.
- "gap" is what is specifically missing when met is false; empty string when met is true.
- confidence 0..1 reflects how directly the evidence supports the requirement.`,
    prompt: `REQUIREMENTS AND CANDIDATE RECORDS\n\n${block}`,
    schema: JUDGE_SCHEMA as unknown as Record<string, unknown>,
  });

  const byId = new Map(judged.verdicts?.map((v) => [v.id, v]) ?? []);

  const verdicts: RequirementVerdict[] = requirements.map((req) => {
    const v = byId.get(req.id);
    const allowed = new Set((candidatesByReq.get(req.id) ?? []).map((c) => c.id));
    // Drop any citation the model invented or borrowed from another
    // requirement — the whole value here is that evidence is real.
    const evidenceIds = (v?.evidenceIds ?? []).filter((id) => allowed.has(id));
    const met = Boolean(v?.met) && evidenceIds.length > 0;

    return {
      ...req,
      met,
      confidence: met ? Math.min(1, Math.max(0, v?.confidence ?? 0.5)) : 0,
      evidence: evidenceIds.map((id) => {
        const item = seen.get(id)!;
        return {
          id,
          title: item.title,
          date: item.date,
          why: v?.why ?? "",
        };
      }),
      gap: met ? null : v?.gap?.trim() || req.text,
    };
  });

  // --- 4. Score --------------------------------------------------------
  // Must-haves are weighted 3× nice-to-haves: missing one is disqualifying
  // in a way that missing a bonus is not, and a score that ignores that
  // would flatter the user into applying for the wrong things.
  const weight = (r: Requirement) => (r.importance === "must" ? 3 : 1);
  const total = verdicts.reduce((sum, v) => sum + weight(v), 0);
  const earned = verdicts.reduce(
    (sum, v) => sum + (v.met ? weight(v) * v.confidence : 0),
    0,
  );
  const score = total === 0 ? 0 : Math.round((earned / total) * 100);

  // Which records did the most work?
  const uses = new Map<string, number>();
  for (const v of verdicts) {
    for (const e of v.evidence) uses.set(e.id, (uses.get(e.id) ?? 0) + 1);
  }
  const keyRecords = [...uses.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, n]) => ({ id, title: seen.get(id)!.title, uses: n }));

  const strengths = verdicts
    .filter((v) => v.met)
    .sort((a, b) => weight(b) - weight(a) || b.confidence - a.confidence)
    .slice(0, 5)
    .map((v) => v.text);

  const gaps = verdicts
    .filter((v) => !v.met)
    .sort((a, b) => weight(b) - weight(a))
    .map((v) => v.gap ?? v.text);

  let verdictLine = "";
  try {
    verdictLine = (
      await generateText(
        `Role: ${parsed.role}\nScore: ${score}%\nMet: ${strengths.join(", ") || "none"}\nMissing: ${gaps.slice(0, 5).join(", ") || "none"}`,
        `You give a student one honest sentence about their fit for a role, then one short sentence on what to do next. No markdown, no preamble, under 45 words total. Be direct rather than encouraging — they are deciding whether to spend an afternoon on an application.`,
      )
    ).trim();
  } catch {
    verdictLine =
      score >= 70
        ? `Strong match — ${verdicts.filter((v) => v.met).length} of ${verdicts.length} requirements are backed by your records.`
        : `Partial match. ${gaps.length} requirement${gaps.length === 1 ? "" : "s"} have no supporting record yet.`;
  }

  return {
    role: parsed.role || null,
    score,
    verdict: verdictLine,
    requirements: verdicts,
    strengths,
    gaps,
    keyRecords,
  };
}

/**
 * Writes a résumé from the records that actually matched the posting, so it
 * reorders and re-emphasises real history rather than inventing anything.
 */
export async function tailoredResume(
  userId: string,
  jobDescription: string,
  fit: FitResult,
): Promise<string> {
  const ids = new Set(fit.requirements.flatMap((r) => r.evidence.map((e) => e.id)));
  if (ids.size === 0) return "";

  const [vector] = await embed([jobDescription.slice(0, 4000)], "RETRIEVAL_QUERY");
  const pool = await searchByVector(userId, vector, 20);
  const chosen = pool.filter((p) => ids.has(p.item.id) || p.similarity > 0.5);

  const context = chosen
    .map(
      ({ item }) =>
        `- ${item.title} | ${item.category} | ${item.organization ?? "—"} | ${formatDate(item.date)} | skills: ${item.skills.join(", ")} | ${item.summary}${item.highlights.length ? ` | ${item.highlights.join("; ")}` : ""}`,
    )
    .join("\n");

  return (
    await generateText(
      `TARGET ROLE\n${fit.role ?? "the role"}\n\nPOSTING (abridged)\n${jobDescription.slice(0, 3000)}\n\nMY REAL RECORDS\n${context}`,
      `You write a one-page résumé in plain Markdown from a student's real records.

Rules:
- Use only the records given. Never invent an employer, date, metric or project.
- Order by relevance to the target role, not by date.
- Each bullet leads with the outcome and keeps any real number from the record.
- Sections: a two-line summary, then Experience, Projects, Education, Skills. Omit a section with no records.
- No placeholders, no "[insert X]", no commentary about what you produced.`,
    )
  ).trim();
}
