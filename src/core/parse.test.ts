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

test("parses a scenario block (system + vars)", () => {
  const raw = `---
provider: openai/gpt-4o
scenario:
  system: You are a router.
  vars: { queues: "auth, billing" }
assert:
  - contains: auth
---
Classify: {{input}}`;
  const spec = parseSpec("x.eval.md", raw);
  expect(spec.config.scenario?.system).toBe("You are a router.");
  expect(spec.config.scenario?.vars).toEqual({ queues: "auth, billing" });
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

test("parses cases array for matrix specs", () => {
  const raw = `---
provider: openai/gpt-4o
cases:
  - name: a
    vars: { x: 1 }
  - vars: { x: 2 }
    assert:
      - contains: "2"
---
value {{x}}`;
  const spec = parseSpec("x.eval.md", raw);
  expect(spec.config.cases?.length).toBe(2);
  expect(spec.config.cases?.[0]?.name).toBe("a");
  expect(spec.config.cases?.[1]?.assert).toEqual([{ contains: "2" }]);
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

test("accepts unknown assertion keys at parse time (validated when run)", () => {
  // Custom scorers are validated at run time, so parsing a single-key
  // assertion always succeeds regardless of the key.
  const raw = "---\nprovider: openai/gpt-4o\nassert:\n  - bogus: x\n---\nhi";
  const spec = parseSpec("x.eval.md", raw);
  expect(spec.config.assert).toEqual([{ bogus: "x" }]);
});

test("rejects an assertion with more than one key", () => {
  const raw = "---\nprovider: openai/gpt-4o\nassert:\n  - contains: a\n    equals: b\n---\nhi";
  expect(() => parseSpec("x.eval.md", raw)).toThrow(SpecError);
});
