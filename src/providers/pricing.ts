import type { Usage } from "./types.ts";

// USD per 1M tokens, [input, output]. Approximate list prices; override via a
// GAUGE_PRICING env var (JSON: { "model": [in, out] }) when they change.
const TABLE: Record<string, [number, number]> = {
  "gpt-4o": [2.5, 10],
  "gpt-4o-mini": [0.15, 0.6],
  "o3-mini": [1.1, 4.4],
  "claude-opus-4-8": [15, 75],
  "claude-opus-4": [15, 75],
  "claude-sonnet-4": [3, 15],
  "claude-3-5-haiku": [0.8, 4],
  "text-embedding-3-small": [0.02, 0],
  "text-embedding-3-large": [0.13, 0],
};

function table(): Record<string, [number, number]> {
  const override = process.env.GAUGE_PRICING;
  if (!override) return TABLE;
  try {
    return { ...TABLE, ...(JSON.parse(override) as Record<string, [number, number]>) };
  } catch {
    return TABLE;
  }
}

/** Estimated USD cost for a call, or undefined when the model's price is unknown. */
export function estimateCost(model: string, usage: Usage | undefined): number | undefined {
  if (!usage) return undefined;
  const price = table()[model];
  if (!price) return undefined;
  return (usage.inputTokens * price[0] + usage.outputTokens * price[1]) / 1_000_000;
}
