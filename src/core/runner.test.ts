import { expect, test } from "bun:test";
import type { ResolvedProvider, Resolver } from "../providers/index.ts";
import { runSpec } from "./runner.ts";
import type { Spec } from "./spec.ts";

function fakeResolver(output: string): Resolver {
  return () => ({
    model: "fake",
    provider: {
      vendor: "fake",
      complete: async ({ prompt }) => ({ output: `${output}:${prompt}`, latencyMs: 1 }),
    },
  });
}

const spec: Spec = {
  path: "x.eval.md",
  prompt: "hi {{who}}",
  config: { provider: "fake/fake", vars: { who: "there" }, assert: [{ contains: "hi there" }] },
};

test("passes when assertions hold and interpolates vars", async () => {
  const r = await runSpec(spec, { resolve: fakeResolver("out") });
  expect(r.pass).toBe(true);
  expect(r.output).toBe("out:hi there");
  expect(r.scores[0]?.pass).toBe(true);
});

test("fails when an assertion fails", async () => {
  const failing: Spec = { ...spec, config: { ...spec.config, assert: [{ contains: "nope" }] } };
  const r = await runSpec(failing, { resolve: fakeResolver("out") });
  expect(r.pass).toBe(false);
});

test("captures provider errors instead of throwing", async () => {
  const r = await runSpec(spec, {
    resolve: () => {
      throw new Error("boom");
    },
  });
  expect(r.pass).toBe(false);
  expect(r.error).toBe("boom");
});

test("llm-judge routes to the judge provider and reads its verdict", async () => {
  // Judge returns PASS; the case provider returns the graded output.
  const resolve: Resolver = (p): ResolvedProvider => ({
    model: "m",
    provider: {
      vendor: "fake",
      complete: async ({ prompt }) => ({
        output: p === "judge/model" ? "PASS\nlooks good" : `answer for ${prompt}`,
        latencyMs: 1,
      }),
    },
  });
  const judged: Spec = {
    path: "j.eval.md",
    prompt: "q",
    config: { provider: "case/model", vars: {}, assert: [{ "llm-judge": "is it good?" }] },
  };
  const r = await runSpec(judged, { resolve, judge: "judge/model" });
  expect(r.pass).toBe(true);
  expect(r.scores[0]?.label).toContain("llm-judge");
});
