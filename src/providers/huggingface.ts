import { OpenAICompatProvider } from "./openai-compat.ts";

// The HF Inference Providers router speaks the OpenAI chat API. Models take the
// form "org/model" (optionally ":provider"), e.g. "meta-llama/Llama-3.3-70B-Instruct".
const ENDPOINT = "https://router.huggingface.co/v1/chat/completions";

/** Hugging Face router provider for OSS models. Reads HF_TOKEN at construction. */
export class HuggingFaceProvider extends OpenAICompatProvider {
  constructor(apiKey?: string, fetchImpl: typeof fetch = fetch) {
    super({ vendor: "huggingface", endpoint: ENDPOINT, keyEnv: "HF_TOKEN" }, apiKey, fetchImpl);
  }
}
