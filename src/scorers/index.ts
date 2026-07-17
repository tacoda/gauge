import Ajv from "ajv";
import { cosine, embed } from "../providers/embeddings.ts";
import type { Resolver } from "../providers/index.ts";

export interface ScoreResult {
  pass: boolean;
  /** Normalized 0–1 score. Binary scorers report 1 (pass) or 0 (fail). */
  score: number;
  /** Human-readable label of what was checked. */
  label: string;
  /** Failure detail; empty when passing. */
  message: string;
}

export interface ScoreContext {
  resolve: Resolver;
  /** Provider spec used by llm-judge / llm-rate, e.g. "openai/gpt-4o-mini". */
  judge: string;
}

/** A scorer receives the assertion's value, the output, and run context. */
export type ScorerFn = (
  value: unknown,
  output: string,
  ctx: ScoreContext,
) => ScoreResult | Promise<ScoreResult>;

const REGISTRY: Record<string, ScorerFn> = {};

/** Register a scorer under an assertion key. The plugin extension point for scorers. */
export function registerScorer(name: string, fn: ScorerFn): void {
  REGISTRY[name] = fn;
}

export function scorerNames(): string[] {
  return Object.keys(REGISTRY);
}

/** Apply a single assertion (a one-key object) to a provider output. */
export async function score(
  assertion: Record<string, unknown>,
  output: string,
  ctx: ScoreContext,
): Promise<ScoreResult> {
  const keys = Object.keys(assertion);
  if (keys.length !== 1) {
    throw new Error(`an assertion must have exactly one key, got ${keys.length}`);
  }
  const name = keys[0] as string;
  const fn = REGISTRY[name];
  if (!fn) {
    throw new Error(`unknown assertion "${name}" — known: ${scorerNames().join(", ")}`);
  }
  return fn(assertion[name], output, ctx);
}

// ── helpers ──────────────────────────────────────────────────────────────

function binary(pass: boolean, label: string, failMessage: string): ScoreResult {
  return { pass, score: pass ? 1 : 0, label, message: pass ? "" : failMessage };
}

function asString(value: unknown, key: string): string {
  if (typeof value !== "string") throw new Error(`assertion "${key}" expects a string`);
  return value;
}

function truncate(s: string, max = 120): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

// Accepts a bare pattern ("foo.*") or a `/pattern/flags` literal ("/foo/i").
const LITERAL = /^\/(.+)\/([a-z]*)$/s;
function compileRegex(source: string): RegExp {
  const literal = LITERAL.exec(source);
  return literal ? new RegExp(literal[1] as string, literal[2]) : new RegExp(source);
}

// ── built-in scorers ─────────────────────────────────────────────────────

registerScorer("equals", (value, output) => {
  const want = asString(value, "equals");
  return binary(
    output === want,
    `equals ${JSON.stringify(want)}`,
    `expected exact match, got ${JSON.stringify(truncate(output))}`,
  );
});

registerScorer("contains", (value, output) => {
  const want = asString(value, "contains");
  return binary(
    output.includes(want),
    `contains ${JSON.stringify(want)}`,
    `substring not found in ${JSON.stringify(truncate(output))}`,
  );
});

registerScorer("regex", (value, output) => {
  const re = compileRegex(asString(value, "regex"));
  return binary(re.test(output), `regex ${re}`, `no match in ${JSON.stringify(truncate(output))}`);
});

const JUDGE_PROMPT = `You are grading whether an output satisfies a rubric.
Respond with exactly "PASS" or "FAIL" on the first line, then a one-line reason.

Rubric: {{rubric}}

Output to grade:
{{output}}`;

registerScorer("llm-judge", async (value, output, ctx) => {
  const rubric = asString(value, "llm-judge");
  const verdict = await ask(JUDGE_PROMPT, rubric, output, ctx);
  const pass = /^\s*pass\b/i.test(verdict);
  const reason = verdict.split("\n").slice(1).join(" ").trim() || verdict.trim();
  return {
    pass,
    score: pass ? 1 : 0,
    label: `llm-judge ${JSON.stringify(truncate(rubric, 60))}`,
    message: pass ? "" : `judge failed: ${truncate(reason)}`,
  };
});

const RATE_PROMPT = `You are rating how well an output satisfies a rubric.
Respond with a single integer from 0 to 100 on the first line (100 = perfect),
then a one-line reason.

Rubric: {{rubric}}

Output to rate:
{{output}}`;

registerScorer("llm-rate", async (value, output, ctx) => {
  const { rubric, min } = value as { rubric?: unknown; min?: unknown };
  if (typeof rubric !== "string" || typeof min !== "number") {
    throw new Error('assertion "llm-rate" expects { rubric: string, min: number }');
  }
  const verdict = await ask(RATE_PROMPT, rubric, output, ctx);
  const match = verdict.match(/\d{1,3}/);
  const raw = match ? Math.min(100, Number(match[0])) : 0;
  const score = raw / 100;
  const pass = score >= min;
  const reason = verdict.split("\n").slice(1).join(" ").trim();
  return {
    pass,
    score,
    label: `llm-rate ${JSON.stringify(truncate(rubric, 50))} >= ${min}`,
    message: pass
      ? ""
      : `scored ${score.toFixed(2)} (< ${min})${reason ? `: ${truncate(reason)}` : ""}`,
  };
});

const ajv = new Ajv({ allErrors: true, strict: false });

registerScorer("json-schema", (value, output) => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(output);
  } catch {
    return binary(false, "json-schema", "output is not valid JSON");
  }
  const validate = ajv.compile(value as object);
  const ok = validate(parsed);
  const errs = (validate.errors ?? [])
    .map((e) => `${e.instancePath || "(root)"} ${e.message}`)
    .join("; ");
  return binary(!!ok, "json-schema", `schema validation failed: ${errs || "invalid"}`);
});

registerScorer("similarity", async (value, output) => {
  const { reference, min } = value as { reference?: unknown; min?: unknown };
  if (typeof reference !== "string" || typeof min !== "number") {
    throw new Error('assertion "similarity" expects { reference: string, min: number }');
  }
  const [a, b] = await Promise.all([embed(output), embed(reference)]);
  const score = Math.max(0, cosine(a, b));
  const pass = score >= min;
  return {
    pass,
    score,
    label: `similarity >= ${min}`,
    message: pass ? "" : `cosine ${score.toFixed(2)} (< ${min})`,
  };
});

async function ask(
  template: string,
  rubric: string,
  output: string,
  ctx: ScoreContext,
): Promise<string> {
  const { provider, model } = ctx.resolve(ctx.judge);
  const prompt = template.replace("{{rubric}}", rubric).replace("{{output}}", output);
  const { output: verdict } = await provider.complete({ model, prompt });
  return verdict;
}
