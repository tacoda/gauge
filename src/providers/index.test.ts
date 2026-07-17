import { expect, test } from "bun:test";
import {
  AnthropicProvider,
  ExecProvider,
  GLMProvider,
  HuggingFaceProvider,
  MistralProvider,
  OpenAICompatProvider,
  OpenAIProvider,
  OpenRouterProvider,
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

test("resolves glm, mistral, and hugging face shorthands", () => {
  expect(resolveProvider("glm/glm-4.6").provider).toBeInstanceOf(GLMProvider);
  expect(resolveProvider("mistral/mistral-large-latest").provider).toBeInstanceOf(MistralProvider);
  expect(resolveProvider("huggingface/meta-llama/Llama-3.3-70B").provider).toBeInstanceOf(
    HuggingFaceProvider,
  );
  const hf = resolveProvider("hf/meta-llama/Llama-3.3-70B");
  expect(hf.provider).toBeInstanceOf(HuggingFaceProvider);
  expect(hf.model).toBe("meta-llama/Llama-3.3-70B"); // slashes kept in model
});

test("keeps slashes in the model portion", () => {
  expect(resolveProvider("openai/ft:gpt-4o:acme/x").model).toBe("ft:gpt-4o:acme/x");
});

test("resolves openrouter shorthand, keeping the slashed model slug", () => {
  const { provider, model } = resolveProvider("openrouter/anthropic/claude-3.5-sonnet");
  expect(provider).toBeInstanceOf(OpenRouterProvider);
  expect(model).toBe("anthropic/claude-3.5-sonnet");
});

test("resolves generic openai-compat object form", () => {
  const { provider, model } = resolveProvider({
    type: "openai-compat",
    model: "deepseek-chat",
    baseUrl: "https://api.deepseek.com/v1",
    apiKeyEnv: "DEEPSEEK_API_KEY",
  });
  expect(provider).toBeInstanceOf(OpenAICompatProvider);
  expect(model).toBe("deepseek-chat");
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
