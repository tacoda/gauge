import { postJson } from "./http.ts";

const ENDPOINT = "https://api.openai.com/v1/embeddings";
const DEFAULT_MODEL = process.env.GAUGE_EMBED_MODEL ?? "text-embedding-3-small";

interface EmbeddingResponse {
  data?: { embedding?: number[] }[];
  error?: { message?: string };
}

/** Embed text via the OpenAI embeddings API. Reads OPENAI_API_KEY at call time. */
export async function embed(
  text: string,
  opts: { model?: string; apiKey?: string; fetchImpl?: typeof fetch } = {},
): Promise<number[]> {
  const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set (needed for similarity scoring)");
  const res = await postJson(
    ENDPOINT,
    { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    { model: opts.model ?? DEFAULT_MODEL, input: text },
    { fetchImpl: opts.fetchImpl },
  );
  const body = res.json as EmbeddingResponse;
  if (!res.ok) throw new Error(`embeddings ${res.status}: ${body.error?.message ?? "failed"}`);
  const vec = body.data?.[0]?.embedding;
  if (!vec) throw new Error("embeddings response contained no vector");
  return vec;
}

/** Cosine similarity of two equal-length vectors, in [-1, 1]. */
export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
