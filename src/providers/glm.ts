import { OpenAICompatProvider } from "./openai-compat.ts";

// Zhipu GLM speaks the OpenAI chat API. Defaults to the international Z.AI base;
// set GLM_BASE_URL (e.g. https://open.bigmodel.cn/api/paas/v4) for the CN region.
const DEFAULT_BASE = "https://api.z.ai/api/paas/v4";

function endpoint(): string {
  const base = (process.env.GLM_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, "");
  return `${base}/chat/completions`;
}

/** Zhipu GLM provider (OpenAI-compatible). Reads GLM_API_KEY at construction. */
export class GLMProvider extends OpenAICompatProvider {
  constructor(apiKey?: string, fetchImpl: typeof fetch = fetch) {
    super({ vendor: "glm", endpoint: endpoint(), keyEnv: "GLM_API_KEY" }, apiKey, fetchImpl);
  }
}
