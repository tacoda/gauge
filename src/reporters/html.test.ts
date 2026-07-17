import { expect, test } from "bun:test";
import type { CaseResult } from "../core/runner.ts";
import { reportHtml } from "./html.ts";

function capture(fn: () => boolean): { out: string; ok: boolean } {
  const orig = console.log;
  let out = "";
  console.log = (s?: unknown) => {
    out += String(s);
  };
  try {
    return { ok: fn(), out };
  } finally {
    console.log = orig;
  }
}

const spec = {
  path: "a.eval.md",
  prompt: "",
  config: { provider: "openai/x", vars: {}, assert: [] },
};

test("emits a self-contained page with an inline summary", () => {
  const results: CaseResult[] = [
    {
      spec,
      pass: true,
      score: 1,
      latencyMs: 900,
      scores: [{ label: "contains", pass: true, score: 1, message: "" }],
    },
  ];
  const { out, ok } = capture(() => reportHtml(results, "/"));
  expect(ok).toBe(true);
  expect(out).toStartWith("<!doctype html>");
  expect(out).toContain("<style>"); // styles inlined — no external assets
  expect(out).not.toContain("http://");
  expect(out).toContain("1 passed · 0 failed · 1 total");
});

test("escapes output so model text can't inject markup, and fails on failures", () => {
  const results: CaseResult[] = [
    {
      spec,
      name: "c1",
      pass: false,
      score: 0,
      output: "<script>alert(1)</script>",
      scores: [{ label: "contains", pass: false, score: 0, message: "no <b>match</b>" }],
    },
  ];
  const { out, ok } = capture(() => reportHtml(results, "/"));
  expect(ok).toBe(false);
  expect(out).toContain("&lt;script&gt;");
  expect(out).not.toContain("<script>alert");
  expect(out).toContain("0 passed · 1 failed · 1 total");
});
