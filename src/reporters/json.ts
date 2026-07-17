import type { CaseResult } from "../core/runner.ts";

/** Emit machine-readable results (for CI, dashboards). Returns true if all passed. */
export function reportJson(results: CaseResult[]): boolean {
  const cases = results.map((r) => ({
    path: r.spec.path,
    name: r.name,
    pass: r.pass,
    output: r.output,
    latencyMs: r.latencyMs,
    error: r.error,
    assertions: r.scores.map((s) => ({ label: s.label, pass: s.pass, message: s.message })),
  }));
  const passed = cases.filter((c) => c.pass).length;
  const summary = { total: cases.length, passed, failed: cases.length - passed };
  console.log(JSON.stringify({ summary, cases }, null, 2));
  return summary.failed === 0;
}
