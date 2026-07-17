import type { CompletionRequest, CompletionResult, Provider } from "./types.ts";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

interface OpenAIChatResponse {
  choices?: { message?: { content?: string } }[];
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
    const res = await this.fetchImpl(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: req.model,
        messages: [{ role: "user", content: req.prompt }],
      }),
    });
    const latencyMs = Math.round(performance.now() - start);
    const body = (await res.json()) as OpenAIChatResponse;
    if (!res.ok) {
      throw new Error(`openai ${res.status}: ${body.error?.message ?? "request failed"}`);
    }
    const output = body.choices?.[0]?.message?.content;
    if (output == null) {
      throw new Error("openai response contained no message content");
    }
    return { output, latencyMs };
  }
}
