#!/usr/bin/env node
import { run } from "./cli/run.ts";
import { watch } from "./cli/watch.ts";
import { VERSION } from "./index.ts";

// ponytail: hand-rolled arg switch. Swap for a parser lib if flags keep
// multiplying; commands are still few enough not to earn a dependency.
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
    process.exit(await watch(rest));
    break;
  case "report":
    console.log('gauge: "report" lands in a later phase.');
    process.exit(1);
    break;
  default:
    console.log(
      [
        "gauge — a test framework for LLM prompts",
        "",
        "Usage: gauge <command> [paths...] [options]",
        "",
        "Commands:",
        "  run [paths]   run evals (defaults to discovering **/*.eval.{md,yaml,yml})",
        "  watch         re-run on change",
        "  report        show last run (Phase 4)",
        "",
        "Options:",
        "  -r, --reporter <tty|json|junit>",
        "  -f, --filter <substring>",
        "  -v, --version",
      ].join("\n"),
    );
}
