import { readFile } from "node:fs/promises";
import { parseSpec } from "../core/parse.ts";
import { runAll } from "../core/runner.ts";
import type { Spec } from "../core/spec.ts";
import { reportJson } from "../reporters/json.ts";
import { reportTty } from "../reporters/tty.ts";
import { discover } from "./discover.ts";

/** `gauge run [paths...] [--reporter tty|json]` — discover, run, report. Returns an exit code. */
export async function run(args: string[]): Promise<number> {
  const cwd = process.cwd();
  const { paths, reporter } = parseArgs(args);
  const files = await discover(cwd, paths);
  if (files.length === 0) {
    console.log("No eval files found (looked for **/*.eval.{md,yaml,yml}).");
    return 0;
  }

  const specs: Spec[] = [];
  for (const file of files) {
    try {
      specs.push(parseSpec(file, await readFile(file, "utf8")));
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      return 1;
    }
  }

  const results = await runAll(specs);
  const ok = reporter === "json" ? reportJson(results) : reportTty(results, cwd);
  return ok ? 0 : 1;
}

function parseArgs(args: string[]): { paths: string[]; reporter: string } {
  const paths: string[] = [];
  let reporter = "tty";
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--reporter" || arg === "-r") {
      reporter = args[++i] ?? "tty";
    } else if (arg?.startsWith("--reporter=")) {
      reporter = arg.slice("--reporter=".length);
    } else if (arg) {
      paths.push(arg);
    }
  }
  return { paths, reporter };
}
