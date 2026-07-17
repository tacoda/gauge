import { type Resolver, resolveProvider } from "../providers/index.ts";
import { type ScoreContext, type ScoreResult, score } from "../scorers/index.ts";
import { CacheProvider } from "./cache.ts";
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
  /** Max cases run in parallel (default 5). */
  concurrency?: number;
  /** When set, cache provider responses on disk under this directory's .gauge/cache. */
  cacheDir?: string;
}

const DEFAULT_JUDGE = process.env.GAUGE_JUDGE ?? "openai/gpt-4o-mini";
const DEFAULT_CONCURRENCY = 5;

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

/** Wrap a resolver so resolved providers cache responses on disk. */
function withCache(resolve: Resolver, cacheDir?: string): Resolver {
  if (!cacheDir) return resolve;
  return (spec) => {
    const { provider, model } = resolve(spec);
    return { model, provider: new CacheProvider(provider, cacheDir) };
  };
}

/** Run tasks with a bounded number in flight, preserving input order. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i] as T);
    }
  };
  const workers = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workers }, worker));
  return results;
}

function contextFor(opts: RunOptions): { resolve: Resolver; ctx: ScoreContext } {
  const resolve = withCache(opts.resolve ?? resolveProvider, opts.cacheDir);
  return { resolve, ctx: { resolve, judge: opts.judge ?? DEFAULT_JUDGE } };
}

/** Run every case in a spec. */
export async function runSpec(spec: Spec, opts: RunOptions = {}): Promise<CaseResult[]> {
  const { resolve, ctx } = contextFor(opts);
  const limit = opts.concurrency ?? DEFAULT_CONCURRENCY;
  return mapLimit(expand(spec), limit, (rc) => runCase(spec, rc, resolve, ctx));
}

/** Run many specs, executing cases with bounded concurrency. */
export async function runAll(specs: Spec[], opts: RunOptions = {}): Promise<CaseResult[]> {
  const { resolve, ctx } = contextFor(opts);
  const limit = opts.concurrency ?? DEFAULT_CONCURRENCY;
  const tasks = specs.flatMap((spec) => expand(spec).map((rc) => ({ spec, rc })));
  return mapLimit(tasks, limit, ({ spec, rc }) => runCase(spec, rc, resolve, ctx));
}
