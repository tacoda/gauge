import { postJson } from "./http.ts";
import type { CompletionRequest, CompletionResult, Provider } from "./types.ts";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

interface OpenAIChatResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

/**
 * OpenAI chat-completions provider. Reads the key from OPENAI_API_KEY at call
 * time. `fetchImpl` is injectable for tests.
 */
export class OpenAIProvider implements Provider {
  readonly vendor = "openai";

  constructor(
    private readonly apiKey: string | undefined = process.env.OPENAI_API_KEY,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    const start = performance.now();
    const res = await postJson(
      ENDPOINT,
      { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      { model: req.model, messages: [{ role: "user", content: req.prompt }] },
      { fetchImpl: this.fetchImpl },
    );
    const latencyMs = Math.round(performance.now() - start);
    const body = res.json as OpenAIChatResponse;
    if (!res.ok) {
      throw new Error(`openai ${res.status}: ${body.error?.message ?? "request failed"}`);
    }
    const output = body.choices?.[0]?.message?.content;
    if (output == null) {
      throw new Error("openai response contained no message content");
    }
    return {
      output,
      latencyMs,
      usage: {
        inputTokens: body.usage?.prompt_tokens ?? 0,
        outputTokens: body.usage?.completion_tokens ?? 0,
      },
    };
  }
}
