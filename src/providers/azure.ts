import { postJson } from "./http.ts";
import type { CompletionRequest, CompletionResult, Provider } from "./types.ts";

const DEFAULT_API_VERSION = process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21";

interface AzureResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

/**
 * Azure OpenAI provider (chat completions). `model` is the deployment name.
 * Reads AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY at call time.
 */
export class AzureOpenAIProvider implements Provider {
  readonly vendor = "azure";

  constructor(
    private readonly endpoint: string | undefined = process.env.AZURE_OPENAI_ENDPOINT,
    private readonly apiKey: string | undefined = process.env.AZURE_OPENAI_API_KEY,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    if (!this.endpoint) throw new Error("AZURE_OPENAI_ENDPOINT is not set");
    if (!this.apiKey) throw new Error("AZURE_OPENAI_API_KEY is not set");
    const base = this.endpoint.replace(/\/$/, "");
    const url = `${base}/openai/deployments/${req.model}/chat/completions?api-version=${DEFAULT_API_VERSION}`;
    const start = performance.now();
    const res = await postJson(
      url,
      { "content-type": "application/json", "api-key": this.apiKey },
      { messages: [{ role: "user", content: req.prompt }] },
      { fetchImpl: this.fetchImpl },
    );
    const latencyMs = Math.round(performance.now() - start);
    const body = res.json as AzureResponse;
    if (!res.ok) throw new Error(`azure ${res.status}: ${body.error?.message ?? "request failed"}`);
    const output = body.choices?.[0]?.message?.content;
    if (output == null) throw new Error("azure response contained no message content");
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
