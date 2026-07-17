import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { CaseResult } from "./runner.ts";
import type { Spec } from "./spec.ts";
import {
  annotateRegressions,
  loadBaseline,
  loadLastRun,
  saveBaseline,
  saveLastRun,
} from "./store.ts";

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), "gauge-store-"));
}

function result(cwd: string, over: Partial<CaseResult> = {}): CaseResult {
  const spec: Spec = {
    path: join(cwd, "a.eval.md"),
    prompt: "",
    config: { provider: "openai/x", vars: {}, assert: [] },
  };
  return { spec, pass: true, score: 1, output: "hi", scores: [], ...over };
}

test("saves and loads last run as relative-pathed cases", async () => {
  const cwd = await tmp();
  await saveLastRun(cwd, [result(cwd, { latencyMs: 5 })]);
  const loaded = await loadLastRun(cwd);
  expect(loaded?.[0]?.path).toBe("a.eval.md");
  expect(loaded?.[0]?.pass).toBe(true);
});

test("loadBaseline returns null when absent", async () => {
  expect(await loadBaseline(await tmp())).toBeNull();
});

test("flags a case that was passing and now fails", async () => {
  const cwd = await tmp();
  await saveBaseline(cwd, [result(cwd, { pass: true, score: 1 })]);
  const baseline = (await loadBaseline(cwd)) ?? {};
  const results = [result(cwd, { pass: false, score: 0 })];
  const count = annotateRegressions(cwd, results, baseline);
  expect(count).toBe(1);
  expect(results[0]?.regression).toContain("now failing");
  expect(results[0]?.pass).toBe(false);
});

test("flags a score drop beyond tolerance", async () => {
  const cwd = await tmp();
  await saveBaseline(cwd, [result(cwd, { pass: true, score: 0.9 })]);
  const baseline = (await loadBaseline(cwd)) ?? {};
  // still "passing" but score cratered
  const results = [result(cwd, { pass: true, score: 0.5 })];
  expect(annotateRegressions(cwd, results, baseline)).toBe(1);
  expect(results[0]?.regression).toContain("score dropped");
});

test("flags output drift for assertion-free cases", async () => {
  const cwd = await tmp();
  await saveBaseline(cwd, [result(cwd, { output: "hello" })]);
  const baseline = (await loadBaseline(cwd)) ?? {};
  const results = [result(cwd, { output: "goodbye" })];
  expect(annotateRegressions(cwd, results, baseline)).toBe(1);
  expect(results[0]?.regression).toContain("output changed");
});

test("no regression when unchanged", async () => {
  const cwd = await tmp();
  await saveBaseline(cwd, [result(cwd)]);
  const baseline = (await loadBaseline(cwd)) ?? {};
  expect(annotateRegressions(cwd, [result(cwd)], baseline)).toBe(0);
});
