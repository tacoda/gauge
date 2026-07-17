import { expect, test } from "bun:test";
import type { Resolver } from "../providers/index.ts";
import { type ScoreContext, score } from "./index.ts";

// Non-judge scorers ignore ctx; provide a resolver that returns a canned verdict.
function ctxReturning(verdict: string): ScoreContext {
  const resolve: Resolver = () => ({
    model: "m",
    provider: { vendor: "fake", complete: async () => ({ output: verdict, latencyMs: 1 }) },
  });
  return { resolve, judge: "fake/model" };
}

const CTX = ctxReturning("PASS");

test("equals pass/fail", async () => {
  expect((await score({ equals: "ok" }, "ok", CTX)).pass).toBe(true);
  expect((await score({ equals: "ok" }, "nope", CTX)).pass).toBe(false);
});

test("contains pass/fail", async () => {
  expect((await score({ contains: "auth" }, "route: auth-flow", CTX)).pass).toBe(true);
  expect((await score({ contains: "auth" }, "route: billing", CTX)).pass).toBe(false);
});

test("regex pass/fail", async () => {
  expect((await score({ regex: "^(a|b)$" }, "a", CTX)).pass).toBe(true);
  expect((await score({ regex: "^(a|b)$" }, "c", CTX)).pass).toBe(false);
});

test("regex supports /pattern/flags literal form for case-insensitivity", async () => {
  expect((await score({ regex: "/auth/i" }, "AUTH", CTX)).pass).toBe(true);
  expect((await score({ regex: "auth" }, "AUTH", CTX)).pass).toBe(false);
});

test("failure carries a message", async () => {
  const r = await score({ contains: "x" }, "yyy", CTX);
  expect(r.pass).toBe(false);
  expect(r.message).not.toBe("");
});

test("llm-judge passes when verdict starts with PASS", async () => {
  const r = await score({ "llm-judge": "is it polite?" }, "hello!", ctxReturning("PASS\nfriendly"));
  expect(r.pass).toBe(true);
});

test("llm-judge fails and surfaces the reason when verdict is FAIL", async () => {
  const r = await score({ "llm-judge": "is it polite?" }, "no", ctxReturning("FAIL\ntoo terse"));
  expect(r.pass).toBe(false);
  expect(r.message).toContain("too terse");
});

test("binary scorers report score 1 on pass and 0 on fail", async () => {
  expect((await score({ contains: "x" }, "xyz", CTX)).score).toBe(1);
  expect((await score({ contains: "x" }, "abc", CTX)).score).toBe(0);
});

test("llm-rate normalizes the rating to 0–1 and gates on min", async () => {
  const pass = await score(
    { "llm-rate": { rubric: "clarity", min: 0.8 } },
    "out",
    ctxReturning("90\nclear"),
  );
  expect(pass.pass).toBe(true);
  expect(pass.score).toBeCloseTo(0.9);

  const fail = await score(
    { "llm-rate": { rubric: "clarity", min: 0.8 } },
    "out",
    ctxReturning("50\nmeh"),
  );
  expect(fail.pass).toBe(false);
  expect(fail.score).toBeCloseTo(0.5);
  expect(fail.message).toContain("0.50");
});
