import { postJson } from "./http.ts";
import type { CompletionRequest, CompletionResult, Provider } from "./types.ts";

interface OllamaResponse {
  response?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  error?: string;
}

/** Local Ollama provider. Base URL from OLLAMA_HOST (default localhost:11434). */
export class OllamaProvider implements Provider {
  readonly vendor = "ollama";

  constructor(
    private readonly host: string = process.env.OLLAMA_HOST ?? "http://localhost:11434",
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const start = performance.now();
    const res = await postJson(
      `${this.host.replace(/\/$/, "")}/api/generate`,
      { "content-type": "application/json" },
      {
        model: req.model,
        prompt: req.prompt,
        stream: false,
        ...(req.system ? { system: req.system } : {}),
      },
      { fetchImpl: this.fetchImpl },
    );
    const latencyMs = Math.round(performance.now() - start);
    const body = res.json as OllamaResponse;
    if (!res.ok) throw new Error(`ollama ${res.status}: ${body.error ?? "request failed"}`);
    if (body.response == null) throw new Error("ollama response contained no text");
    return {
      output: body.response,
      latencyMs,
      usage: {
        inputTokens: body.prompt_eval_count ?? 0,
        outputTokens: body.eval_count ?? 0,
      },
    };
  }
}
