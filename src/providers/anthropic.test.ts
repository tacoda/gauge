import { expect, test } from "bun:test";
import { AnthropicProvider } from "./anthropic.ts";

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

test("sends model + message and parses text content", async () => {
  const capture: Capture = {};
  const p = new AnthropicProvider(
    "sk-test",
    mockFetch({ content: [{ type: "text", text: "hello" }] }, capture),
  );
  const res = await p.complete({ model: "claude-x", prompt: "hi" });

  expect(res.output).toBe("hello");
  const headers = capture.init?.headers as Record<string, string>;
  expect(headers["x-api-key"]).toBe("sk-test");
  expect(headers["anthropic-version"]).toBeDefined();
  const body = JSON.parse(capture.init?.body as string);
  expect(body.model).toBe("claude-x");
  expect(body.messages).toEqual([{ role: "user", content: "hi" }]);
});

test("throws on API error status", async () => {
  const p = new AnthropicProvider(
    "sk-test",
    mockFetch({ error: { message: "overloaded" } }, {}, 529),
  );
  await expect(p.complete({ model: "claude-x", prompt: "hi" })).rejects.toThrow(
    /anthropic 529: overloaded/,
  );
});

test("throws when key missing", async () => {
  const p = new AnthropicProvider(undefined, mockFetch({}));
  await expect(p.complete({ model: "claude-x", prompt: "hi" })).rejects.toThrow(
    /ANTHROPIC_API_KEY/,
  );
});
