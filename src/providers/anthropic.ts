import type { CompletionRequest, CompletionResult, Provider } from "./types.ts";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";
const MAX_TOKENS = 1024;

interface AnthropicResponse {
  content?: { type: string; text?: string }[];
  error?: { message?: string };
}

/**
 * Anthropic Messages API provider. Reads the key from ANTHROPIC_API_KEY at
 * call time. `fetchImpl` is injectable for tests.
 */
export class AnthropicProvider implements Provider {
  readonly vendor = "anthropic";

  constructor(
    private readonly apiKey: string | undefined = process.env.ANTHROPIC_API_KEY,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    if (!this.apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    const start = performance.now();
    const res = await this.fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": API_VERSION,
      },
      body: JSON.stringify({
        model: req.model,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: req.prompt }],
      }),
    });
    const latencyMs = Math.round(performance.now() - start);
    const body = (await res.json()) as AnthropicResponse;
    if (!res.ok) {
      throw new Error(`anthropic ${res.status}: ${body.error?.message ?? "request failed"}`);
    }
    const output = body.content?.find((b) => b.type === "text")?.text;
    if (output == null) {
      throw new Error("anthropic response contained no text content");
    }
    return { output, latencyMs };
  }
}
