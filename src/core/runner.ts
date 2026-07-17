import { type Resolver, resolveProvider } from "../providers/index.ts";
import { type ScoreContext, type ScoreResult, score } from "../scorers/index.ts";
import type { Assertion, Spec } from "./spec.ts";
import { render } from "./template.ts";

export interface CaseResult {
  spec: Spec;
  /** Case name when the spec defines multiple cases; undefined for a lone case. */
  name?: string;
  /** True when the provider call succeeded and every assertion passed. */
  pass: boolean;
  /** Mean of assertion scores (0–1); 1 for a case with no assertions. */
  score: number;
  output?: string;
  latencyMs?: number;
  scores: ScoreResult[];
  /** Set when the run errored before assertions (bad provider, API error). */
  error?: string;
  /** Set by baseline comparison when this case regressed. */
  regression?: string;
}

export interface RunOptions {
  resolve?: Resolver;
  /** Provider spec for llm-judge assertions. */
  judge?: string;
}

const DEFAULT_JUDGE = process.env.GAUGE_JUDGE ?? "openai/gpt-4o-mini";

interface RunCase {
  name?: string;
  vars: Record<string, unknown>;
  assert: Assertion[];
}

/** Mean of scores; 1 when there are no assertions (nothing to fail). */
function mean(scores: number[]): number {
  return scores.length === 0 ? 1 : scores.reduce((a, b) => a + b, 0) / scores.length;
}

/** Expand a spec into its cases (a single implicit case when `cases` is absent). */
function expand(spec: Spec): RunCase[] {
  const { vars, assert, cases } = spec.config;
  if (!cases || cases.length === 0) {
    return [{ vars, assert }];
  }
  return cases.map((c, i) => ({
    name: c.name ?? `case ${i + 1}`,
    vars: { ...vars, ...c.vars },
    assert: [...assert, ...c.assert],
  }));
}

async function runCase(
  spec: Spec,
  rc: RunCase,
  resolve: Resolver,
  ctx: ScoreContext,
): Promise<CaseResult> {
  try {
    const { provider, model } = resolve(spec.config.provider);
    const prompt = render(spec.prompt, rc.vars);
    const { output, latencyMs } = await provider.complete({ model, prompt });
    const scores = await Promise.all(rc.assert.map((a) => score(a, output, ctx)));
    return {
      spec,
      name: rc.name,
      output,
      latencyMs,
      scores,
      pass: scores.every((s) => s.pass),
      score: mean(scores.map((s) => s.score)),
    };
  } catch (err) {
    return {
      spec,
      name: rc.name,
      pass: false,
      score: 0,
      scores: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Run every case in a spec. */
export async function runSpec(spec: Spec, opts: RunOptions = {}): Promise<CaseResult[]> {
  const resolve = opts.resolve ?? resolveProvider;
  const ctx: ScoreContext = { resolve, judge: opts.judge ?? DEFAULT_JUDGE };
  const results: CaseResult[] = [];
  for (const rc of expand(spec)) {
    results.push(await runCase(spec, rc, resolve, ctx));
  }
  return results;
}

/** Run many specs sequentially. Concurrency lands in Phase 5. */
export async function runAll(specs: Spec[], opts: RunOptions = {}): Promise<CaseResult[]> {
  const results: CaseResult[] = [];
  for (const spec of specs) {
    results.push(...(await runSpec(spec, opts)));
  }
  return results;
}
