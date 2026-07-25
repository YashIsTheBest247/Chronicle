import "server-only";
import { generateJSON } from "./gemini";
import { classifyLink } from "./links";
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
  /**
   * Present when a URL turned out to point at a document rather than a page —
   * a shared Google Drive PDF, a directly linked certificate. Ingest stores it
   * like an upload: the link may stop resolving, the bytes will not.
   */
  file?: { name: string; mime: string; bytes: Buffer };
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

/**
 * Reads a document to plain text and returns it. Nothing is written anywhere.
 *
 * Used for job descriptions, which are somebody else's document: they are
 * needed for the length of one request and must never enter the user's
 * Chronicle. Keeping this separate from `extractFromFile` means there is no
 * code path where a posting could accidentally be stored as a record.
 */
export async function extractPlainText(args: {
  name: string;
  mime: string;
  bytes: Buffer;
}): Promise<string> {
  const { name, mime, bytes } = args;

  if (NATIVE_MIME.test(mime)) {
    // PDFs and photos go to Gemini as bytes; ask only for a transcription.
    const { text } = await generateJSON<{ text: string }>({
      prompt: `Filename: ${name}

Transcribe this document to plain text. Preserve headings, bullet points and requirement lists. Do not summarise, comment, or omit anything.`,
      file: { mime, data: bytes },
      schema: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      } as unknown as Record<string, unknown>,
    });
    return (text ?? "").trim();
  }

  return (await toText(name, mime, bytes)).trim();
}

/** Bytes a linked document may occupy before it is read for text only. */
const MAX_LINKED_BYTES = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 4) * 1024 * 1024;

/** Document types worth keeping a copy of, as opposed to reading and dropping. */
const STORABLE_MIME =
  /^(application\/pdf|image\/(png|jpe?g|webp|heic|heif)|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|application\/msword)/i;

/**
 * A page that answered but said nothing: a sign-in wall, a permission prompt,
 * or a JavaScript shell that renders its content client-side. Feeding this to
 * the model produces a record titled "Sign in - Google Accounts", which is
 * worse than admitting the page could not be read.
 */
const UNREADABLE =
  /(sign in|sign up|log in to continue|you need (permission|access)|request access|access denied|enable javascript|javascript is (required|disabled)|are you a robot|verify you are human|403 forbidden|404|not found)/i;

/**
 * Extracts a record from a pasted URL — portfolio, GitHub repo, profile,
 * Google Drive file, or anything else with an address.
 *
 * Three outcomes, in order of preference:
 *   1. The link resolves to a document (a shared Drive PDF, a linked
 *      certificate) — it is read as a file and kept.
 *   2. The link resolves to a readable page — its text is extracted.
 *   3. The link cannot be read at all — a record is still created from what
 *      the URL itself says, so nothing a user adds is silently rejected.
 */
export async function extractFromUrl(url: string): Promise<ExtractResult> {
  const fetched = await fetchLink(url);

  // 1 — a real document behind the link.
  if (fetched?.kind === "document") {
    const { name, mime, bytes } = fetched;
    try {
      const result = await extractFromFile({ name, mime, bytes });
      return {
        ...result,
        extraction: withLink(result.extraction, url),
        // Only worth storing if it is the kind of thing someone would ask for
        // back. A text export of a Google Doc is not; the PDF behind it is.
        file: STORABLE_MIME.test(mime) ? { name, mime, bytes } : undefined,
      };
    } catch {
      // Unreadable bytes — fall through to describing the link itself.
    }
  }

  // 2 — a readable page.
  const page = fetched?.kind === "page" ? fetched.text : "";
  if (page) {
    const extraction = await runExtraction({
      prompt: `URL: ${url}\n\nPage contents:\n"""\n${page}\n"""\n\nExtract the structured record for this link.`,
    });
    return { text: page, extraction: withLink(extraction, url) };
  }

  // 3 — nothing readable. The URL still carries a platform, an owner and often
  //     a project name, and `classifyLink` already knows what kind of thing it
  //     points at, so the model is told that rather than left to guess.
  const { label } = classifyLink(url);
  const extraction = await runExtraction({
    prompt: `URL: ${url}

This link points at: ${label}

The page itself could not be read — it may require sign-in, or render entirely in the browser. Describe the record from the URL alone: name it after what the link points at, never after an error page, and keep dateConfidence "unknown". Leave organization empty unless the URL names one.`,
  });
  return { text: url, extraction: withLink(extraction, url) };
}

/** The record's own URL belongs in its links, listed first. */
function withLink(extraction: Extraction, url: string): Extraction {
  if (!extraction.links.includes(url)) extraction.links.unshift(url);
  return extraction;
}

type Fetched =
  | { kind: "document"; name: string; mime: string; bytes: Buffer }
  | { kind: "page"; text: string }
  | null;

/**
 * Fetches a link and decides what came back. Google's document hosts are
 * rewritten to their export endpoints first: a Drive share URL serves a
 * JavaScript shell to a bot, while the same file's download URL serves the
 * actual PDF.
 */
async function fetchLink(url: string): Promise<Fetched> {
  const target = exportUrl(url) ?? url;

  let res: Response;
  try {
    res = await fetch(target, {
      redirect: "follow",
      headers: { "User-Agent": "Chronicle/0.1 (+student portfolio indexer)" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
  } catch {
    return null;
  }

  const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const isHtml = !mime || /html|xml$/.test(mime);

  let bytes: Buffer;
  try {
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_LINKED_BYTES) return null;
    bytes = Buffer.from(buf);
  } catch {
    return null;
  }

  if (!isHtml) {
    return { kind: "document", name: filenameFor(res, target, mime), mime, bytes };
  }

  const text = stripHtml(bytes.toString("utf8")).slice(0, 40_000);
  if (text.length < 250) return null;
  // A wall is short by nature — a real page keeps going. Testing length first
  // matters: plenty of readable pages carry a "Sign in" link in their own
  // navigation, and GitHub is one of them.
  if (text.length < 3_000 && UNREADABLE.test(text)) return null;
  return { kind: "page", text };
}

/**
 * Rewrites Google's viewer URLs to the endpoint that serves the file itself.
 * Only these are special-cased: every other host serves something readable at
 * the URL the user pasted.
 */
function exportUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "drive.google.com") {
    // /file/d/<id>/view, /open?id=<id>, /uc?id=<id>
    const id = u.pathname.match(/\/d\/([\w-]{10,})/)?.[1] ?? u.searchParams.get("id");
    return id ? `https://drive.google.com/uc?export=download&id=${id}` : null;
  }

  if (host === "docs.google.com") {
    const [, kind, id] =
      u.pathname.match(/\/(document|spreadsheets|presentation)\/d\/([\w-]{10,})/) ?? [];
    if (!id) return null;
    if (kind === "spreadsheets")
      return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
    if (kind === "presentation")
      return `https://docs.google.com/presentation/d/${id}/export/txt`;
    return `https://docs.google.com/document/d/${id}/export?format=txt`;
  }

  return null;
}

/** A name for a downloaded document: the server's, the URL's, or the host's. */
function filenameFor(res: Response, url: string, mime: string): string {
  const disposition = res.headers.get("content-disposition") ?? "";
  const named =
    /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1] ??
    /filename="?([^";]+)"?/i.exec(disposition)?.[1];
  if (named) return safeName(named);

  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop();
    if (last && /\.[a-z0-9]{2,5}$/i.test(last)) return safeName(last);
    const ext = mime.split("/")[1]?.replace(/^vnd\..*/, "docx") ?? "bin";
    return `${u.hostname.replace(/^www\./, "")}.${ext}`;
  } catch {
    return "linked-document";
  }
}

// Named rather than written inline: a backslash and a DEL inside a character
// class are exactly the kind of escape that gets mangled when this file is
// edited by a tool.
const PATH_SEP = String.fromCharCode(92);
const DEL = String.fromCharCode(127);

/**
 * A filename from a remote header is untrusted input that ends up in a
 * multipart upload to Telegram, so separators and control characters are
 * dropped rather than escaped.
 */
function safeName(raw: string): string {
  let name = raw.trim();
  try {
    name = decodeURIComponent(name);
  } catch {
    // Malformed percent-encoding — the raw form is still a usable name.
  }
  const cleaned = [...name]
    .map((c) => (c === "/" || c === PATH_SEP ? "-" : c))
    // Control characters and quotes would break the multipart upload.
    .filter((c) => c >= " " && c !== '"' && c !== DEL)
    .join("")
    .trim();
  return cleaned.slice(0, 120) || "linked-document";
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
