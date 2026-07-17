import { expect, test } from "bun:test";
import type { CaseResult } from "../core/runner.ts";
import { reportJunit } from "./junit.ts";

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

test("emits a passing testsuite", () => {
  const results: CaseResult[] = [
    { spec, pass: true, latencyMs: 1200, scores: [{ label: "contains", pass: true, message: "" }] },
  ];
  const { out, ok } = capture(() => reportJunit(results));
  expect(ok).toBe(true);
  expect(out).toContain('tests="1" failures="0" errors="0"');
  expect(out).toContain('time="1.200"');
});

test("records failures and errors distinctly and escapes XML", () => {
  const results: CaseResult[] = [
    {
      spec,
      name: "c1",
      pass: false,
      scores: [{ label: "contains <x>", pass: false, message: "no" }],
    },
    { spec, name: "c2", pass: false, scores: [], error: "boom & fail" },
  ];
  const { out, ok } = capture(() => reportJunit(results));
  expect(ok).toBe(false);
  expect(out).toContain('failures="1" errors="1"');
  expect(out).toContain("&lt;x&gt;");
  expect(out).toContain("boom &amp; fail");
});
