import { expect, test } from "bun:test";
import {
  AnthropicProvider,
  ExecProvider,
  OpenAIProvider,
  registerProvider,
  resolveProvider,
} from "./index.ts";

test("resolves openai vendor + model (string form)", () => {
  const { provider, model } = resolveProvider("openai/gpt-4o-mini");
  expect(provider).toBeInstanceOf(OpenAIProvider);
  expect(model).toBe("gpt-4o-mini");
});

test("resolves anthropic string form", () => {
  const { provider, model } = resolveProvider("anthropic/claude-opus-4-8");
  expect(provider).toBeInstanceOf(AnthropicProvider);
  expect(model).toBe("claude-opus-4-8");
});

test("keeps slashes in the model portion", () => {
  expect(resolveProvider("openai/ft:gpt-4o:acme/x").model).toBe("ft:gpt-4o:acme/x");
});

test("resolves object form for anthropic", () => {
  const { provider, model } = resolveProvider({ type: "anthropic", model: "claude-x" });
  expect(provider).toBeInstanceOf(AnthropicProvider);
  expect(model).toBe("claude-x");
});

test("resolves exec object form, command carried as model", () => {
  const { provider, model } = resolveProvider({ type: "exec", command: "python h.py" });
  expect(provider).toBeInstanceOf(ExecProvider);
  expect(model).toBe("python h.py");
});

test("rejects missing slash", () => {
  expect(() => resolveProvider("openai")).toThrow(/vendor\/model/);
});

test("rejects unknown vendor", () => {
  expect(() => resolveProvider("acme/model")).toThrow(/unknown provider vendor/);
});

test("rejects empty model", () => {
  expect(() => resolveProvider("openai/")).toThrow(/missing model/);
});

test("registerProvider adds a custom vendor", () => {
  registerProvider("echo", () => ({
    vendor: "echo",
    complete: async ({ prompt }) => ({ output: prompt, latencyMs: 0 }),
  }));
  const { provider, model } = resolveProvider("echo/v1");
  expect(provider.vendor).toBe("echo");
  expect(model).toBe("v1");
});
