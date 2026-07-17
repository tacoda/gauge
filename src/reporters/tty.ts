import { relative } from "node:path";
import type { CaseResult } from "../core/runner.ts";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const color = process.stdout.isTTY
  ? (c: string, s: string) => `${c}${s}${RESET}`
  : (_: string, s: string) => s;

/** Print per-spec results to the terminal. Returns true if all passed. */
export function reportTty(results: CaseResult[], cwd = process.cwd()): boolean {
  for (const r of results) {
    const rel = relative(cwd, r.spec.path);
    const name = r.name ? `${rel} › ${r.name}` : rel;
    if (r.error) {
      console.log(`${color(RED, "✗")} ${name} ${color(DIM, `— ${r.error}`)}`);
      continue;
    }
    const mark = r.pass ? color(GREEN, "✓") : color(RED, "✗");
    const timing = r.latencyMs != null ? color(DIM, ` (${r.latencyMs}ms)`) : "";
    console.log(`${mark} ${name}${timing}`);
    for (const s of r.scores) {
      if (s.pass) {
        console.log(`  ${color(GREEN, "✓")} ${color(DIM, s.label)}`);
      } else {
        console.log(`  ${color(RED, "✗")} ${s.label} ${color(DIM, `— ${s.message}`)}`);
      }
    }
  }
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  console.log("");
  console.log(`${passed} passed, ${failed} failed, ${results.length} total`);
  return failed === 0;
}
