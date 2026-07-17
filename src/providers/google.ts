import { postJson } from "./http.ts";
import type { CompletionRequest, CompletionResult, Provider } from "./types.ts";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string };
}

/** Google Gemini provider. Reads GEMINI_API_KEY (or GOOGLE_API_KEY) at call time. */
export class GoogleProvider implements Provider {
  readonly vendor = "google";

  constructor(
    private readonly apiKey: string | undefined = process.env.GEMINI_API_KEY ??
      process.env.GOOGLE_API_KEY,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    if (!this.apiKey) throw new Error("GEMINI_API_KEY is not set");
    const start = performance.now();
    // Key goes in a header, never the URL query string.
    const res = await postJson(
      `${BASE}/${req.model}:generateContent`,
      { "content-type": "application/json", "x-goog-api-key": this.apiKey },
      { contents: [{ parts: [{ text: req.prompt }] }] },
      { fetchImpl: this.fetchImpl },
    );
    const latencyMs = Math.round(performance.now() - start);
    const body = res.json as GeminiResponse;
    if (!res.ok)
      throw new Error(`google ${res.status}: ${body.error?.message ?? "request failed"}`);
    const output = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (output == null) throw new Error("google response contained no text content");
    return {
      output,
      latencyMs,
      usage: {
        inputTokens: body.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: body.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  }
}
