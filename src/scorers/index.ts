import type { Assertion } from "../core/spec.ts";
import type { Resolver } from "../providers/index.ts";

export interface ScoreResult {
  pass: boolean;
  /** Human-readable label of what was checked. */
  label: string;
  /** Failure detail; empty when passing. */
  message: string;
}

export interface ScoreContext {
  resolve: Resolver;
  /** Provider spec used by llm-judge, e.g. "openai/gpt-4o-mini". */
  judge: string;
}

/** Apply a single assertion to a provider output. */
export async function score(
  assertion: Assertion,
  output: string,
  ctx: ScoreContext,
): Promise<ScoreResult> {
  if ("equals" in assertion) {
    const pass = output === assertion.equals;
    return {
      pass,
      label: `equals ${JSON.stringify(assertion.equals)}`,
      message: pass ? "" : `expected exact match, got ${JSON.stringify(truncate(output))}`,
    };
  }
  if ("contains" in assertion) {
    const pass = output.includes(assertion.contains);
    return {
      pass,
      label: `contains ${JSON.stringify(assertion.contains)}`,
      message: pass ? "" : `substring not found in ${JSON.stringify(truncate(output))}`,
    };
  }
  if ("regex" in assertion) {
    const re = compileRegex(assertion.regex);
    const pass = re.test(output);
    return {
      pass,
      label: `regex ${re}`,
      message: pass ? "" : `no match in ${JSON.stringify(truncate(output))}`,
    };
  }
  return judge(assertion["llm-judge"], output, ctx);
}

const JUDGE_PROMPT = `You are grading whether an output satisfies a rubric.
Respond with exactly "PASS" or "FAIL" on the first line, then a one-line reason.

Rubric: {{rubric}}

Output to grade:
{{output}}`;

async function judge(rubric: string, output: string, ctx: ScoreContext): Promise<ScoreResult> {
  const { provider, model } = ctx.resolve(ctx.judge);
  const prompt = JUDGE_PROMPT.replace("{{rubric}}", rubric).replace("{{output}}", output);
  const { output: verdict } = await provider.complete({ model, prompt });
  const pass = /^\s*pass\b/i.test(verdict);
  const reason = verdict.split("\n").slice(1).join(" ").trim() || verdict.trim();
  return {
    pass,
    label: `llm-judge ${JSON.stringify(truncate(rubric, 60))}`,
    message: pass ? "" : `judge failed: ${truncate(reason)}`,
  };
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
