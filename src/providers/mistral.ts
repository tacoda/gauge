import { OpenAICompatProvider } from "./openai-compat.ts";

const ENDPOINT = "https://api.mistral.ai/v1/chat/completions";

/** Mistral provider (OpenAI-compatible). Reads MISTRAL_API_KEY at construction. */
export class MistralProvider extends OpenAICompatProvider {
  constructor(apiKey?: string, fetchImpl: typeof fetch = fetch) {
    super({ vendor: "mistral", endpoint: ENDPOINT, keyEnv: "MISTRAL_API_KEY" }, apiKey, fetchImpl);
  }
}
