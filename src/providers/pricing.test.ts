import { expect, test } from "bun:test";
import { estimateCost } from "./pricing.ts";

test("computes cost from usage and known model price", () => {
  // gpt-4o-mini: [0.15, 0.6] per 1M tokens
  const cost = estimateCost("gpt-4o-mini", { inputTokens: 1_000_000, outputTokens: 1_000_000 });
  expect(cost).toBeCloseTo(0.75);
});

test("returns undefined for unknown model", () => {
  expect(estimateCost("mystery-model", { inputTokens: 100, outputTokens: 100 })).toBeUndefined();
});

test("returns undefined without usage", () => {
  expect(estimateCost("gpt-4o", undefined)).toBeUndefined();
});
