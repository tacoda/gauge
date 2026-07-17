import { loadBaseline, loadLastRun, storedKey } from "../core/store.ts";

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const color = process.stdout.isTTY
  ? (c: string, s: string) => `${c}${s}${RESET}`
  : (_: string, s: string) => s;

/** `gauge report` — reprint the last run, with cost and baseline output diffs. */
export async function report(): Promise<number> {
  const cwd = process.cwd();
  const results = await loadLastRun(cwd);
  if (!results) {
    console.log("No previous run found. Run `gauge run` first.");
    return 1;
  }
  const baseline = (await loadBaseline(cwd)) ?? {};

  let totalCost = 0;
  for (const r of results) {
    const name = r.name ? `${r.path} › ${r.name}` : r.path;
    if (r.error) {
      console.log(`${color(RED, "✗")} ${name} ${color(DIM, `— ${r.error}`)}`);
      continue;
    }
    totalCost += r.cost ?? 0;
    const mark = r.pass ? color(GREEN, "✓") : color(RED, "✗");
    const cost = r.cost != null ? `, $${r.cost.toFixed(4)}` : "";
    console.log(`${mark} ${name} ${color(DIM, `score ${r.score.toFixed(2)}${cost}`)}`);
    if (r.regression) {
      console.log(`  ${color(YELLOW, "⚠ regression")} ${color(DIM, `— ${r.regression}`)}`);
      printDiff(baseline[storedKey(r)]?.output, r.output);
    }
  }

  const passed = results.filter((r) => r.pass).length;
  console.log("");
  const totals = totalCost > 0 ? `, ~$${totalCost.toFixed(4)}` : "";
  console.log(
    `${passed} passed, ${results.length - passed} failed, ${results.length} total${totals}`,
  );
  return passed === results.length ? 0 : 1;
}

function printDiff(before: string | undefined, after: string | undefined): void {
  if (before === undefined || after === undefined || before === after) return;
  console.log(`    ${color(RED, `- ${trunc(before)}`)}`);
  console.log(`    ${color(GREEN, `+ ${trunc(after)}`)}`);
}

function trunc(s: string, max = 100): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}
