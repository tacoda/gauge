import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import type { CaseResult } from "./runner.ts";

const DIR = ".gauge";
const BASELINE = "baseline.json";
const LAST_RUN = "last-run.json";

// A case that drops in score by more than this vs baseline counts as a regression.
const SCORE_TOLERANCE = 0.05;

/** Flattened, serializable view of a case result (no Spec object). */
export interface StoredCase {
  path: string;
  name?: string;
  pass: boolean;
  score: number;
  output?: string;
  latencyMs?: number;
  error?: string;
  regression?: string;
  assertions: { label: string; pass: boolean; score: number; message: string }[];
}

interface BaselineEntry {
  pass: boolean;
  score: number;
  output?: string;
}
type Baseline = Record<string, BaselineEntry>;

function key(cwd: string, r: CaseResult): string {
  return `${relative(cwd, r.spec.path)}::${r.name ?? ""}`;
}

function toStored(cwd: string, r: CaseResult): StoredCase {
  return {
    path: relative(cwd, r.spec.path),
    name: r.name,
    pass: r.pass,
    score: r.score,
    output: r.output,
    latencyMs: r.latencyMs,
    error: r.error,
    regression: r.regression,
    assertions: r.scores.map((s) => ({
      label: s.label,
      pass: s.pass,
      score: s.score,
      message: s.message,
    })),
  };
}

async function readJson<T>(cwd: string, name: string): Promise<T | null> {
  const raw = await readFile(join(cwd, DIR, name), "utf8").catch(() => null);
  return raw == null ? null : (JSON.parse(raw) as T);
}

async function writeJson(cwd: string, name: string, data: unknown): Promise<void> {
  await mkdir(join(cwd, DIR), { recursive: true });
  await writeFile(join(cwd, DIR, name), `${JSON.stringify(data, null, 2)}\n`);
}

export async function saveLastRun(cwd: string, results: CaseResult[]): Promise<void> {
  await writeJson(
    cwd,
    LAST_RUN,
    results.map((r) => toStored(cwd, r)),
  );
}

export function loadLastRun(cwd: string): Promise<StoredCase[] | null> {
  return readJson<StoredCase[]>(cwd, LAST_RUN);
}

export async function saveBaseline(cwd: string, results: CaseResult[]): Promise<void> {
  const baseline: Baseline = {};
  for (const r of results) {
    baseline[key(cwd, r)] = { pass: r.pass, score: r.score, output: r.output };
  }
  await writeJson(cwd, BASELINE, baseline);
}

export function loadBaseline(cwd: string): Promise<Baseline | null> {
  return readJson<Baseline>(cwd, BASELINE);
}

/**
 * Compare results against a baseline, tagging regressions in place. A case
 * regresses when it was passing and now fails, when its score drops beyond
 * tolerance, or (for assertion-free cases) when its output changes.
 */
export function annotateRegressions(
  cwd: string,
  results: CaseResult[],
  baseline: Baseline,
): number {
  let count = 0;
  for (const r of results) {
    const base = baseline[key(cwd, r)];
    if (!base) continue;
    const reason = regressionReason(r, base);
    if (reason) {
      r.regression = reason;
      r.pass = false;
      count++;
    }
  }
  return count;
}

function regressionReason(r: CaseResult, base: BaselineEntry): string | undefined {
  if (base.pass && !r.pass) {
    return "was passing in baseline, now failing";
  }
  if (base.score - r.score > SCORE_TOLERANCE) {
    return `score dropped ${base.score.toFixed(2)} → ${r.score.toFixed(2)}`;
  }
  if (r.scores.length === 0 && base.output !== undefined && base.output !== r.output) {
    return "output changed from baseline";
  }
  return undefined;
}
