import "server-only";
import { generateJSON } from "./gemini";
import { CATEGORIES, type Category, type Extraction } from "./types";

/** Formats Gemini reads natively as binary — no local parsing needed. */
const NATIVE_MIME = /^(application\/pdf|image\/(png|jpe?g|webp|heic|heif))$/i;

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description:
        "A specific, human title for this record. Prefer the real name of the credential, project, or role over the filename.",
    },
    summary: {
      type: "string",
      description:
        "Two or three sentences in the third person describing what this record shows about the person.",
    },
    category: { type: "string", enum: [...CATEGORIES] },
    date: {
      type: "string",
      description:
        "The date the record belongs to, as YYYY-MM-DD or YYYY-MM or YYYY. Empty string if genuinely absent.",
    },
    dateConfidence: { type: "string", enum: ["exact", "approximate", "unknown"] },
    organization: {
      type: "string",
      description:
        "Issuing or employing body — university, company, platform. Empty string if none.",
    },
    skills: {
      type: "array",
      items: { type: "string" },
      description:
        "Canonical skill names demonstrated or certified. Use the common industry spelling: 'Python', 'React', 'Machine Learning'. No sentences.",
    },
    tags: { type: "array", items: { type: "string" } },
    people: { type: "array", items: { type: "string" } },
    links: { type: "array", items: { type: "string" } },
    highlights: {
      type: "array",
      items: { type: "string" },
      description:
        "Concrete facts worth surfacing: grades, scores, ranks, durations, team size, measurable outcomes.",
    },
  },
  required: [
    "title",
    "summary",
    "category",
    "date",
    "dateConfidence",
    "organization",
    "skills",
    "tags",
    "people",
    "links",
    "highlights",
  ],
} as const;

const SYSTEM = `You are the understanding layer of Chronicle, a digital identity system for students.

You are given one document from a student's record and you return structured facts about it.

Rules:
- Extract only what the document supports. Never invent an organisation, date, or score.
- Skills must be canonical and atomic. "Built a REST API in Flask" yields ["Flask", "REST APIs", "Python"], not the sentence.
- Choose the single category that best describes what the document IS:
  Certifications = a credential awarded for completing something.
  Projects = something the person built or produced.
  Internships = a work placement, offer letter, or completion letter.
  Achievements = a prize, rank, award, or competitive result.
  Academics = transcripts, marksheets, degrees, enrolment records.
  Skills = a record whose subject is a capability itself rather than an artifact.
  Other = anything that fits none of the above.
- A resume is not one record. Categorise it as Other and put its strongest signals in skills and highlights.
- Prefer the document's own wording for titles and organisations.`;

export interface ExtractResult {
  text: string;
  extraction: Extraction;
}

/**
 * Turns a source document into plain text plus structured understanding.
 * PDFs and images go to Gemini as bytes; everything else is decoded locally
 * first so the model receives clean text.
 */
export async function extractFromFile(args: {
  name: string;
  mime: string;
  bytes: Buffer;
}): Promise<ExtractResult> {
  const { name, mime, bytes } = args;

  if (NATIVE_MIME.test(mime)) {
    const extraction = await runExtraction({
      prompt: `Filename: ${name}\n\nRead the attached document and extract its structured record.`,
      file: { mime, data: bytes },
    });
    return { text: `${extraction.title}\n\n${extraction.summary}`, extraction };
  }

  const text = await toText(name, mime, bytes);
  if (!text.trim()) {
    throw new Error(`No readable text could be extracted from ${name}`);
  }
  const extraction = await runExtraction({
    prompt: `Filename: ${name}\n\nDocument contents:\n"""\n${text.slice(0, 60_000)}\n"""\n\nExtract the structured record.`,
  });
  return { text, extraction };
}

/** Extracts a record from a pasted URL — portfolio, GitHub repo, profile. */
export async function extractFromUrl(url: string): Promise<ExtractResult> {
  let page = "";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Chronicle/0.1 (+student portfolio indexer)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) page = stripHtml(await res.text()).slice(0, 40_000);
  } catch {
    // A dead or blocked link still yields a usable record from the URL itself.
  }

  const extraction = await runExtraction({
    prompt: page
      ? `URL: ${url}\n\nPage contents:\n"""\n${page}\n"""\n\nExtract the structured record for this link.`
      : `URL: ${url}\n\nThe page could not be fetched. Infer what you reasonably can from the URL structure alone, and keep dateConfidence "unknown".`,
  });
  if (!extraction.links.includes(url)) extraction.links.unshift(url);
  return { text: page || url, extraction };
}

async function runExtraction(args: {
  prompt: string;
  file?: { mime: string; data: Buffer };
}): Promise<Extraction> {
  const raw = await generateJSON<Record<string, unknown>>({
    prompt: args.prompt,
    file: args.file,
    system: SYSTEM,
    schema: EXTRACTION_SCHEMA as unknown as Record<string, unknown>,
  });
  return normalizeExtraction(raw);
}

/** Coerces the model's output into the shape the rest of the app relies on. */
function normalizeExtraction(raw: Record<string, unknown>): Extraction {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const list = (v: unknown) =>
    Array.isArray(v)
      ? [...new Set(v.map((x) => str(x)).filter(Boolean))].slice(0, 24)
      : [];

  const category = CATEGORIES.includes(str(raw.category) as Category)
    ? (str(raw.category) as Category)
    : "Other";

  const date = str(raw.date);

  return {
    title: str(raw.title) || "Untitled record",
    summary: str(raw.summary),
    category,
    date: date || null,
    dateConfidence:
      raw.dateConfidence === "exact" || raw.dateConfidence === "approximate"
        ? raw.dateConfidence
        : date
          ? "approximate"
          : "unknown",
    organization: str(raw.organization) || null,
    // Title-case-ish canonicalisation keeps "python" and "Python" as one node.
    skills: list(raw.skills).map(canonicalSkill),
    tags: list(raw.tags),
    people: list(raw.people),
    links: list(raw.links),
    highlights: list(raw.highlights),
  };
}

/** Normalises skill spelling so the relationship engine can match on identity. */
export function canonicalSkill(s: string): string {
  const trimmed = s.trim().replace(/\s+/g, " ");
  const known: Record<string, string> = {
    js: "JavaScript",
    javascript: "JavaScript",
    ts: "TypeScript",
    typescript: "TypeScript",
    python: "Python",
    "machine learning": "Machine Learning",
    ml: "Machine Learning",
    ai: "Artificial Intelligence",
    "deep learning": "Deep Learning",
    nlp: "Natural Language Processing",
    react: "React",
    "react.js": "React",
    nodejs: "Node.js",
    "node js": "Node.js",
    sql: "SQL",
    aws: "AWS",
    "data science": "Data Science",
    "data analysis": "Data Analysis",
  };
  const hit = known[trimmed.toLowerCase()];
  if (hit) return hit;
  // Leave acronyms and already-capitalised names alone.
  if (/[A-Z]/.test(trimmed)) return trimmed;
  return trimmed.replace(/\b\w/g, (c) => c.toUpperCase());
}

async function toText(name: string, mime: string, bytes: Buffer): Promise<string> {
  if (/wordprocessingml|\.docx$/i.test(mime + name)) {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer: bytes });
    return value;
  }
  if (/html/i.test(mime) || /\.html?$/i.test(name)) {
    return stripHtml(bytes.toString("utf8"));
  }
  // txt, md, csv, json, and anything else that decodes as text.
  return bytes.toString("utf8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
