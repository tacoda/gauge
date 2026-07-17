import { expect, test } from "bun:test";
import { OpenAIProvider } from "./openai.ts";

interface Capture {
  init?: RequestInit;
}

function mockFetch(response: unknown, capture: Capture = {}, status = 200): typeof fetch {
  return (async (_url, init) => {
    capture.init = init;
    return new Response(JSON.stringify(response), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
}

test("sends model + user message and parses content", async () => {
  const capture: Capture = {};
  const p = new OpenAIProvider(
    "sk-test",
    mockFetch({ choices: [{ message: { content: "hello" } }] }, capture),
  );
  const res = await p.complete({ model: "gpt-4o", prompt: "hi" });

  expect(res.output).toBe("hello");
  expect(typeof res.latencyMs).toBe("number");
  const body = JSON.parse(capture.init?.body as string);
  expect(body.model).toBe("gpt-4o");
  expect(body.messages).toEqual([{ role: "user", content: "hi" }]);
});

test("prepends a system message when the scenario set one", async () => {
  const capture: Capture = {};
  const p = new OpenAIProvider(
    "sk-test",
    mockFetch({ choices: [{ message: { content: "ok" } }] }, capture),
  );
  await p.complete({ model: "gpt-4o", prompt: "hi", system: "be terse" });
  const body = JSON.parse(capture.init?.body as string);
  expect(body.messages).toEqual([
    { role: "system", content: "be terse" },
    { role: "user", content: "hi" },
  ]);
});

test("throws on API error status", async () => {
  const p = new OpenAIProvider("sk-test", mockFetch({ error: { message: "bad key" } }, {}, 401));
  await expect(p.complete({ model: "gpt-4o", prompt: "hi" })).rejects.toThrow(
    /openai 401: bad key/,
  );
});

test("throws when key missing", async () => {
  const p = new OpenAIProvider(undefined, mockFetch({}));
  await expect(p.complete({ model: "gpt-4o", prompt: "hi" })).rejects.toThrow(/OPENAI_API_KEY/);
});
