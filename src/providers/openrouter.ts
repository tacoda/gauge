import { OpenAICompatProvider } from "./openai-compat.ts";

// OpenRouter is an OpenAI-compatible gateway to models from many vendors. Model
// slugs carry a slash, e.g. "anthropic/claude-3.5-sonnet".
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/** OpenRouter provider. Reads OPENROUTER_API_KEY at construction. */
export class OpenRouterProvider extends OpenAICompatProvider {
  constructor(apiKey?: string, fetchImpl: typeof fetch = fetch) {
    super(
      { vendor: "openrouter", endpoint: ENDPOINT, keyEnv: "OPENROUTER_API_KEY" },
      apiKey,
      fetchImpl,
    );
  }
}
