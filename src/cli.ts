#!/usr/bin/env node
import { init } from "./cli/init.ts";
import { report } from "./cli/report.ts";
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
    process.exit(await report());
    break;
  case "init":
    process.exit(await init());
    break;
  default:
    console.log(
      [
        "gauge — a test framework for LLM prompts",
        "",
        "Usage: gauge <command> [paths...] [options]",
        "",
        "Commands:",
        "  init          scaffold gauge.config.yaml + an example eval",
        "  run [paths]   run evals (defaults to discovering **/*.eval.{md,yaml,yml})",
        "  watch         re-run on change",
        "  report        reprint the last run",
        "",
        "Options:",
        "  -r, --reporter <tty|json|junit>",
        "  -f, --filter <substring>",
        "  -u, --update-baseline   save this run as the regression baseline",
        "  -c, --concurrency <n>   max cases in parallel (default 5)",
        "      --cache / --no-cache  cache provider responses on disk",
        "  -v, --version",
      ].join("\n"),
    );
}
