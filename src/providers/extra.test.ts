import { expect, test } from "bun:test";
import { AzureOpenAIProvider } from "./azure.ts";
import { cosine } from "./embeddings.ts";
import { GoogleProvider } from "./google.ts";
import { OllamaProvider } from "./ollama.ts";

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

test("google: sends key in header (not URL) and parses text + usage", async () => {
  const cap: Capture = {};
  const p = new GoogleProvider(
    "k",
    mockFetch(
      {
        candidates: [{ content: { parts: [{ text: "hi" }] } }],
        usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 2 },
      },
      cap,
    ),
  );
  const res = await p.complete({ model: "gemini-1.5-flash", prompt: "yo" });
  expect(res.output).toBe("hi");
  expect(res.usage).toEqual({ inputTokens: 5, outputTokens: 2 });
  expect(cap.url).not.toContain("k"); // key not leaked into the URL
  expect((cap.init?.headers as Record<string, string>)["x-goog-api-key"]).toBe("k");
});

test("ollama: posts to /api/generate and parses response + usage", async () => {
  const cap: Capture = {};
  const p = new OllamaProvider(
    "http://localhost:11434",
    mockFetch({ response: "out", prompt_eval_count: 3, eval_count: 4 }, cap),
  );
  const res = await p.complete({ model: "llama3", prompt: "hi" });
  expect(res.output).toBe("out");
  expect(res.usage).toEqual({ inputTokens: 3, outputTokens: 4 });
  expect(cap.url).toBe("http://localhost:11434/api/generate");
});

test("azure: builds deployment URL, sends api-key header", async () => {
  const cap: Capture = {};
  const p = new AzureOpenAIProvider(
    "https://acme.openai.azure.com",
    "secret",
    mockFetch({ choices: [{ message: { content: "hey" } }], usage: {} }, cap),
  );
  const res = await p.complete({ model: "gpt4o-deploy", prompt: "hi" });
  expect(res.output).toBe("hey");
  expect(cap.url).toContain("/openai/deployments/gpt4o-deploy/chat/completions?api-version=");
  expect((cap.init?.headers as Record<string, string>)["api-key"]).toBe("secret");
});

test("cosine: identical vectors = 1, orthogonal = 0", () => {
  expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(1);
  expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
});
