import { expect, test } from "bun:test";
import { GLMProvider } from "./glm.ts";
import { HuggingFaceProvider } from "./huggingface.ts";
import { MistralProvider } from "./mistral.ts";
import { OpenAICompatProvider } from "./openai-compat.ts";

interface Capture {
  url?: string;
  init?: RequestInit;
}

function mockFetch(response: unknown, capture: Capture = {}, status = 200): typeof fetch {
  return (async (url, init) => {
    capture.url = String(url);
    capture.init = init;
    return new Response(JSON.stringify(response), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

const OK = {
  choices: [{ message: { content: "hi" } }],
  usage: { prompt_tokens: 2, completion_tokens: 1 },
};

test("mistral: posts to api.mistral.ai with Bearer key, parses content + usage", async () => {
  const cap: Capture = {};
  const p = new MistralProvider("sk-m", mockFetch(OK, cap));
  const res = await p.complete({ model: "mistral-large-latest", prompt: "yo" });
  expect(res.output).toBe("hi");
  expect(res.usage).toEqual({ inputTokens: 2, outputTokens: 1 });
  expect(cap.url).toBe("https://api.mistral.ai/v1/chat/completions");
  expect((cap.init?.headers as Record<string, string>).authorization).toBe("Bearer sk-m");
});

test("huggingface: posts to the router with Bearer HF_TOKEN", async () => {
  const cap: Capture = {};
  const p = new HuggingFaceProvider("hf_x", mockFetch(OK, cap));
  await p.complete({ model: "meta-llama/Llama-3.3-70B-Instruct", prompt: "yo" });
  expect(cap.url).toBe("https://router.huggingface.co/v1/chat/completions");
  expect((cap.init?.headers as Record<string, string>).authorization).toBe("Bearer hf_x");
});

test("glm: defaults to the Z.AI base, sends a scenario system message", async () => {
  const cap: Capture = {};
  const p = new GLMProvider("glm-k", mockFetch(OK, cap));
  await p.complete({ model: "glm-4.6", prompt: "yo", system: "be terse" });
  expect(cap.url).toBe("https://api.z.ai/api/paas/v4/chat/completions");
  const body = JSON.parse(cap.init?.body as string);
  expect(body.messages).toEqual([
    { role: "system", content: "be terse" },
    { role: "user", content: "yo" },
  ]);
});

test("generic provider posts to the configured endpoint with its key env", async () => {
  const cap: Capture = {};
  const p = new OpenAICompatProvider(
    { vendor: "deepseek", endpoint: "https://api.deepseek.com/v1/chat/completions", keyEnv: "X" },
    "sk-d",
    mockFetch(OK, cap),
  );
  const res = await p.complete({ model: "deepseek-chat", prompt: "hi" });
  expect(res.output).toBe("hi");
  expect(cap.url).toBe("https://api.deepseek.com/v1/chat/completions");
  expect((cap.init?.headers as Record<string, string>).authorization).toBe("Bearer sk-d");
});

test("surfaces API errors under the vendor name", async () => {
  const p = new MistralProvider("sk-m", mockFetch({ error: { message: "nope" } }, {}, 401));
  await expect(p.complete({ model: "m", prompt: "x" })).rejects.toThrow(/mistral 401: nope/);
});

test("throws a named error when the key is missing", async () => {
  const p = new GLMProvider(undefined, mockFetch(OK));
  await expect(p.complete({ model: "glm-4.6", prompt: "x" })).rejects.toThrow(/GLM_API_KEY/);
});
