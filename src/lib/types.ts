export const CATEGORIES = [
  "Projects",
  "Skills",
  "Certifications",
  "Internships",
  "Achievements",
  "Academics",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLOR: Record<Category, string> = {
  Projects: "#2D6BFF",
  Skills: "#138A72",
  Certifications: "#B07A1E",
  Internships: "#6D4AA7",
  Achievements: "#C2641F",
  Academics: "#2E6F52",
  Other: "#676059",
};

/** How two records relate. Mirrors the Module 3 relationship taxonomy. */
export const RELATION_KINDS = [
  "proves", // Certification -> Skill
  "applies", // Skill -> Project
  "led-to", // Project -> Internship
  "part-of", // anything -> a larger programme
  "issued-by", // record -> organisation
  "same-org", // shares an organisation
  "same-skill", // shares a skill
  "continues", // a later record building on an earlier one
  "related", // semantic neighbour, no stronger label
] as const;

export type RelationKind = (typeof RELATION_KINDS)[number];

/** A stored source file, preserved byte-for-byte in the `files` table. */
export interface SourceFile {
  id: string;
  name: string;
  mime: string;
  size: number;
  uploadedAt: string;
}

/** The structured understanding Gemini derives from a source file. */
export interface Extraction {
  title: string;
  summary: string;
  category: Category;
  /** ISO date (YYYY-MM-DD) or year (YYYY) the record belongs to. */
  date: string | null;
  dateConfidence: "exact" | "approximate" | "unknown";
  organization: string | null;
  skills: string[];
  tags: string[];
  people: string[];
  links: string[];
  /** Free-text notable facts — grades, scores, ranks, durations. */
  highlights: string[];
}

export interface Item extends Extraction {
  id: string;
  fileId: string | null;
  /** Present when the item came from a pasted link rather than a file. */
  url: string | null;
  /** Raw text handed to the model — kept for retrieval and citation. */
  text: string;
  embedding: number[];
  createdAt: string;
}

/**
 * What the browser receives. Embeddings are 768 floats each and the raw text
 * can run to tens of kilobytes — neither is useful client-side, so both are
 * dropped at the API boundary.
 */
export type ClientItem = Omit<Item, "embedding" | "text"> & {
  /** First few hundred characters of source text, for the detail panel. */
  excerpt: string;
  file: SourceFile | null;
};

export interface Relation {
  id: string;
  from: string;
  to: string;
  kind: RelationKind;
  /** 0..1 — how strongly the engine believes this link. */
  weight: number;
  reason: string;
}

/** An item joined to its file row — what most read paths actually want. */
export interface ItemWithFile extends Item {
  file: SourceFile | null;
}

/** A single hit from the retrieval layer. */
export interface SearchHit {
  item: Item;
  score: number;
  /** Which signals fired, for the "why this matched" affordance. */
  matchedOn: string[];
}

export interface SearchResponse {
  query: string;
  /** Structured intent Gemini parsed out of the natural-language query. */
  intent: {
    categories: Category[];
    skills: string[];
    organizations: string[];
    dateFrom: string | null;
    dateTo: string | null;
    wantsLatest: boolean;
  };
  answer: string;
  hits: SearchHit[];
}
