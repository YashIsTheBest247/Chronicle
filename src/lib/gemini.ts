import "server-only";
import { hasAnyKey, withKey } from "./keyring";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";

/** Dimensionality we request from the embedding model and store on items. */
export const EMBED_DIM = 768;

export function hasKey(): boolean {
  return hasAnyKey();
}

/**
 * Generates JSON against a response schema. Gemini's structured-output mode
 * guarantees parseable JSON, so the only failure worth handling is transport.
 */
export async function generateJSON<T>(args: {
  prompt: string;
  schema: Record<string, unknown>;
  /** Optional binary part — a PDF or image Gemini reads natively. */
  file?: { mime: string; data: Buffer };
  system?: string;
}): Promise<T> {
  const parts: Array<Record<string, unknown>> = [];
  if (args.file) {
    parts.push({
      inlineData: {
        mimeType: args.file.mime,
        data: args.file.data.toString("base64"),
      },
    });
  }
  parts.push({ text: args.prompt });

  const res = await withKey((ai) =>
    ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: args.system,
        responseMimeType: "application/json",
        responseSchema: args.schema,
        temperature: 0.2,
      },
    }),
  );

  const text = res.text;
  if (!text) throw new Error("Gemini returned an empty response");
  return JSON.parse(text) as T;
}

/** Short free-text generation — used for the answer line above search results. */
export async function generateText(prompt: string, system?: string) {
  const res = await withKey((ai) =>
    ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { systemInstruction: system, temperature: 0.3 },
    }),
  );
  return res.text ?? "";
}

/**
 * Embeds one or more strings. `taskType` matters: indexing and querying use
 * different projections of the same space, which measurably improves recall.
 */
export async function embed(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT",
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await withKey((ai) =>
    ai.models.embedContent({
      model: EMBED_MODEL,
      contents: texts,
      config: { taskType, outputDimensionality: EMBED_DIM },
    }),
  );
  const vectors = res.embeddings?.map((e) => e.values ?? []) ?? [];
  if (vectors.length !== texts.length) {
    throw new Error(
      `Embedding count mismatch: asked for ${texts.length}, got ${vectors.length}`,
    );
  }
  // gemini-embedding-001 returns unnormalised vectors below 3072 dims.
  return vectors.map(normalize);
}

export function normalize(v: number[]): number[] {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum);
  return norm > 0 ? v.map((x) => x / norm) : v;
}

/** Cosine similarity. Inputs are pre-normalised, so this is a dot product. */
export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot;
}

