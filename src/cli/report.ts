import { loadLastRun } from "../core/store.ts";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const color = process.stdout.isTTY
  ? (c: string, s: string) => `${c}${s}${RESET}`
  : (_: string, s: string) => s;

/** `gauge report` — reprint the last run from .gauge/last-run.json. */
export async function report(): Promise<number> {
  const cwd = process.cwd();
  const results = await loadLastRun(cwd);
  if (!results) {
    console.log("No previous run found. Run `gauge run` first.");
    return 1;
  }

  for (const r of results) {
    const name = r.name ? `${r.path} › ${r.name}` : r.path;
    if (r.error) {
      console.log(`${color(RED, "✗")} ${name} ${color(DIM, `— ${r.error}`)}`);
      continue;
    }
    const mark = r.pass ? color(GREEN, "✓") : color(RED, "✗");
    console.log(`${mark} ${name} ${color(DIM, `score ${r.score.toFixed(2)}`)}`);
    if (r.regression) {
      console.log(`  ${color(YELLOW, "⚠ regression")} ${color(DIM, `— ${r.regression}`)}`);
    }
  }

  const passed = results.filter((r) => r.pass).length;
  console.log("");
  console.log(`${passed} passed, ${results.length - passed} failed, ${results.length} total`);
  return passed === results.length ? 0 : 1;
}
