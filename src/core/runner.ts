import { type Resolver, resolveProvider } from "../providers/index.ts";
import { type ScoreContext, type ScoreResult, score } from "../scorers/index.ts";
import type { Spec } from "./spec.ts";
import { render } from "./template.ts";

export interface CaseResult {
  spec: Spec;
  /** True when the provider call succeeded and every assertion passed. */
  pass: boolean;
  output?: string;
  latencyMs?: number;
  scores: ScoreResult[];
  /** Set when the run errored before assertions (bad provider, API error). */
  error?: string;
}

export interface RunOptions {
  resolve?: Resolver;
  /** Provider spec for llm-judge assertions. */
  judge?: string;
}

const DEFAULT_JUDGE = process.env.GAUGE_JUDGE ?? "openai/gpt-4o-mini";

/** Run one spec: render the prompt, call the provider, apply assertions. */
export async function runSpec(spec: Spec, opts: RunOptions = {}): Promise<CaseResult> {
  const resolve = opts.resolve ?? resolveProvider;
  const ctx: ScoreContext = { resolve, judge: opts.judge ?? DEFAULT_JUDGE };
  try {
    const { provider, model } = resolve(spec.config.provider);
    const prompt = render(spec.prompt, spec.config.vars);
    const { output, latencyMs } = await provider.complete({ model, prompt });
    const scores = await Promise.all(spec.config.assert.map((a) => score(a, output, ctx)));
    return { spec, output, latencyMs, scores, pass: scores.every((s) => s.pass) };
  } catch (err) {
    return {
      spec,
      pass: false,
      scores: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Run many specs sequentially. Concurrency lands in Phase 5. */
export async function runAll(specs: Spec[], opts: RunOptions = {}): Promise<CaseResult[]> {
  const results: CaseResult[] = [];
  for (const spec of specs) {
    results.push(await runSpec(spec, opts));
  }
  return results;
}
