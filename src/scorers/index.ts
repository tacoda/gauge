import type { Assertion } from "../core/spec.ts";
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

/** Apply a single assertion to a provider output. */
export async function score(
  assertion: Assertion,
  output: string,
  ctx: ScoreContext,
): Promise<ScoreResult> {
  if ("equals" in assertion) {
    return binary(
      output === assertion.equals,
      `equals ${JSON.stringify(assertion.equals)}`,
      `expected exact match, got ${JSON.stringify(truncate(output))}`,
    );
  }
  if ("contains" in assertion) {
    return binary(
      output.includes(assertion.contains),
      `contains ${JSON.stringify(assertion.contains)}`,
      `substring not found in ${JSON.stringify(truncate(output))}`,
    );
  }
  if ("regex" in assertion) {
    const re = compileRegex(assertion.regex);
    return binary(
      re.test(output),
      `regex ${re}`,
      `no match in ${JSON.stringify(truncate(output))}`,
    );
  }
  if ("llm-judge" in assertion) {
    return judge(assertion["llm-judge"], output, ctx);
  }
  return rate(assertion["llm-rate"].rubric, assertion["llm-rate"].min, output, ctx);
}

function binary(pass: boolean, label: string, failMessage: string): ScoreResult {
  return { pass, score: pass ? 1 : 0, label, message: pass ? "" : failMessage };
}

const JUDGE_PROMPT = `You are grading whether an output satisfies a rubric.
Respond with exactly "PASS" or "FAIL" on the first line, then a one-line reason.

Rubric: {{rubric}}

Output to grade:
{{output}}`;

async function judge(rubric: string, output: string, ctx: ScoreContext): Promise<ScoreResult> {
  const verdict = await ask(JUDGE_PROMPT, rubric, output, ctx);
  const pass = /^\s*pass\b/i.test(verdict);
  const reason = verdict.split("\n").slice(1).join(" ").trim() || verdict.trim();
  return {
    pass,
    score: pass ? 1 : 0,
    label: `llm-judge ${JSON.stringify(truncate(rubric, 60))}`,
    message: pass ? "" : `judge failed: ${truncate(reason)}`,
  };
}

const RATE_PROMPT = `You are rating how well an output satisfies a rubric.
Respond with a single integer from 0 to 100 on the first line (100 = perfect),
then a one-line reason.

Rubric: {{rubric}}

Output to rate:
{{output}}`;

async function rate(
  rubric: string,
  min: number,
  output: string,
  ctx: ScoreContext,
): Promise<ScoreResult> {
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
}

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

// Accepts a bare pattern ("foo.*") or a `/pattern/flags` literal ("/foo/i"),
// since JS RegExp has no inline `(?i)` flag syntax that PCRE users reach for.
const LITERAL = /^\/(.+)\/([a-z]*)$/s;
function compileRegex(source: string): RegExp {
  const literal = LITERAL.exec(source);
  return literal ? new RegExp(literal[1] as string, literal[2]) : new RegExp(source);
}

function truncate(s: string, max = 120): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
