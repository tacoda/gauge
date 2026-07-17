import { expect, test } from "bun:test";
import { SpecError, parseSpec } from "./parse.ts";

test("parses markdown frontmatter + body", () => {
  const raw = `---
provider: openai/gpt-4o-mini
vars:
  input: hello
assert:
  - contains: world
---
Say {{input}} world`;
  const spec = parseSpec("x.eval.md", raw);
  expect(spec.config.provider).toBe("openai/gpt-4o-mini");
  expect(spec.config.vars).toEqual({ input: "hello" });
  expect(spec.config.assert).toEqual([{ contains: "world" }]);
  expect(spec.prompt).toBe("Say {{input}} world");
});

test("markdown defaults vars and assert when omitted", () => {
  const spec = parseSpec("x.eval.md", "---\nprovider: openai/gpt-4o\n---\nhi");
  expect(spec.config.vars).toEqual({});
  expect(spec.config.assert).toEqual([]);
});

test("parses yaml spec with prompt field", () => {
  const raw = `provider: openai/gpt-4o
prompt: "Classify: {{input}}"
assert:
  - regex: "^(a|b)$"`;
  const spec = parseSpec("x.eval.yaml", raw);
  expect(spec.prompt).toBe("Classify: {{input}}");
  expect(spec.config.assert).toEqual([{ regex: "^(a|b)$" }]);
});

test("throws on missing frontmatter", () => {
  expect(() => parseSpec("x.eval.md", "no frontmatter here")).toThrow(SpecError);
});

test("throws on yaml spec missing prompt", () => {
  expect(() => parseSpec("x.eval.yaml", "provider: openai/gpt-4o")).toThrow(/prompt/);
});

test("throws on invalid config (missing provider)", () => {
  expect(() => parseSpec("x.eval.md", "---\nvars: {}\n---\nhi")).toThrow(SpecError);
});

test("rejects unknown assertion keys", () => {
  const raw = "---\nprovider: openai/gpt-4o\nassert:\n  - bogus: x\n---\nhi";
  expect(() => parseSpec("x.eval.md", raw)).toThrow(SpecError);
});
