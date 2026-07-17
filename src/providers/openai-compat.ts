import { chatMessages, postJson } from "./http.ts";
import type { CompletionRequest, CompletionResult, Provider } from "./types.ts";

interface OpenAIChatResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

export interface OpenAICompatOptions {
  /** Vendor id used in the shorthand and error messages, e.g. "mistral". */
  vendor: string;
  /** Full chat-completions URL. */
  endpoint: string;
  /** Env var holding the Bearer key; also named in the "not set" error. */
  keyEnv: string;
}

/**
 * Base for any OpenAI-compatible chat-completions API (OpenAI, GLM, Mistral,
 * Hugging Face router, …): Bearer auth, `{ model, messages }` request,
 * `choices[0].message.content` + `usage.{prompt,completion}_tokens` response.
 * A scenario `system` is sent as a leading system message. `fetchImpl` is
 * injectable for tests.
 */
export class OpenAICompatProvider implements Provider {
  readonly vendor: string;
  private readonly endpoint: string;
  private readonly keyEnv: string;

  constructor(
    opts: OpenAICompatOptions,
    private readonly apiKey: string | undefined = process.env[opts.keyEnv],
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.vendor = opts.vendor;
    this.endpoint = opts.endpoint;
    this.keyEnv = opts.keyEnv;
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    if (!this.apiKey) throw new Error(`${this.keyEnv} is not set`);
    const start = performance.now();
    const res = await postJson(
      this.endpoint,
      { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      { model: req.model, messages: chatMessages(req) },
      { fetchImpl: this.fetchImpl },
    );
    const latencyMs = Math.round(performance.now() - start);
    const body = res.json as OpenAIChatResponse;
    if (!res.ok) {
      throw new Error(`${this.vendor} ${res.status}: ${body.error?.message ?? "request failed"}`);
    }
    const output = body.choices?.[0]?.message?.content;
    if (output == null) {
      throw new Error(`${this.vendor} response contained no message content`);
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
