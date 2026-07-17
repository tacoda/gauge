#!/usr/bin/env node
import { run } from "./cli/run.ts";
import { VERSION } from "./index.ts";

// ponytail: hand-rolled arg switch. Swap for a parser lib in Phase 3 when
// flags multiply; a couple of commands don't earn a dependency yet.
const [, , cmd, ...rest] = process.argv;

switch (cmd) {
  case "--version":
  case "-v":
    console.log(VERSION);
    break;
  case "run":
    process.exit(await run(rest));
    break;
  case "watch":
  case "report":
    console.log(`gauge: "${cmd}" lands in a later phase.`);
    process.exit(1);
    break;
  default:
    console.log(
      [
        "gauge — a test framework for LLM prompts",
        "",
        "Usage: gauge <command> [paths...]",
        "",
        "Commands:",
        "  run [paths]   run evals (defaults to discovering **/*.eval.{md,yaml,yml})",
        "  watch         re-run on change (Phase 3)",
        "  report        show last run (Phase 4)",
        "",
        "  -v, --version",
      ].join("\n"),
    );
}
