import { OpenAICompatProvider } from "./openai-compat.ts";

const ENDPOINT = "https://api.openai.com/v1/chat/completions";

/**
 * OpenAI chat-completions provider. Reads the key from OPENAI_API_KEY at
 * construction. `fetchImpl` is injectable for tests.
 */
export class OpenAIProvider extends OpenAICompatProvider {
  constructor(apiKey?: string, fetchImpl: typeof fetch = fetch) {
    super({ vendor: "openai", endpoint: ENDPOINT, keyEnv: "OPENAI_API_KEY" }, apiKey, fetchImpl);
  }
}
