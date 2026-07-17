import { readFile } from "node:fs/promises";
import { type Config, loadConfig, loadEnv } from "../config.ts";
import { parseSpec } from "../core/parse.ts";
import { type CaseResult, runAll } from "../core/runner.ts";
import type { Spec } from "../core/spec.ts";
import { annotateRegressions, loadBaseline, saveBaseline, saveLastRun } from "../core/store.ts";
import { reportHtml } from "../reporters/html.ts";
import { reportJson } from "../reporters/json.ts";
import { reportJunit } from "../reporters/junit.ts";
import { reportTty } from "../reporters/tty.ts";
import { discover } from "./discover.ts";

interface Args {
  paths: string[];
  reporter?: string;
  filter?: string;
  /** Write current results as the new baseline instead of comparing. */
  updateBaseline?: boolean;
  concurrency?: number;
  cache?: boolean;
}

type Reporter = (results: CaseResult[], cwd: string) => boolean;

const ttyReporter: Reporter = (r, cwd) => reportTty(r, cwd);
const REPORTERS: Record<string, Reporter> = {
  tty: ttyReporter,
  json: (r) => reportJson(r),
  junit: (r) => reportJunit(r),
  html: (r, cwd) => reportHtml(r, cwd),
};

/** `gauge run [paths...] [--reporter tty|json|junit] [--filter substr]`. Returns an exit code. */
export async function run(argv: string[]): Promise<number> {
  const cwd = process.cwd();
  loadEnv(cwd);
  const config = await loadConfig(cwd);
  return runOnce(cwd, parseArgs(argv), config);
}

/** One discover→parse→run→report pass. Shared by `run` and `watch`. */
export async function runOnce(cwd: string, args: Args, config: Config): Promise<number> {
  const roots = args.paths.length > 0 ? args.paths : (config.paths ?? []);
  const filter = args.filter ?? config.filter;
  let files = await discover(cwd, roots);
  if (filter) {
    const needle = filter.toLowerCase();
    files = files.filter((f) => f.toLowerCase().includes(needle));
  }
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

  const cacheEnabled = args.cache ?? config.cache ?? false;
  const results = await runAll(specs, {
    judge: config.judge,
    concurrency: args.concurrency ?? config.concurrency,
    cacheDir: cacheEnabled ? cwd : undefined,
  });

  if (args.updateBaseline) {
    await saveBaseline(cwd, results);
    console.log(`Baseline updated (${results.length} cases).`);
  } else {
    const baseline = await loadBaseline(cwd);
    if (baseline) {
      const regressions = annotateRegressions(cwd, results, baseline);
      if (regressions > 0) console.log(`⚠ ${regressions} regression(s) vs baseline.\n`);
    }
  }
  await saveLastRun(cwd, results);

  const reporterName = args.reporter ?? config.reporter ?? "tty";
  const reporter = REPORTERS[reporterName] ?? ttyReporter;
  return reporter(results, cwd) ? 0 : 1;
}

export function parseArgs(argv: string[]): Args {
  const paths: string[] = [];
  const args: Args = { paths };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--reporter" || arg === "-r") {
      args.reporter = argv[++i];
    } else if (arg?.startsWith("--reporter=")) {
      args.reporter = arg.slice("--reporter=".length);
    } else if (arg === "--filter" || arg === "-f") {
      args.filter = argv[++i];
    } else if (arg?.startsWith("--filter=")) {
      args.filter = arg.slice("--filter=".length);
    } else if (arg === "--update-baseline" || arg === "-u") {
      args.updateBaseline = true;
    } else if (arg === "--concurrency" || arg === "-c") {
      args.concurrency = Number(argv[++i]);
    } else if (arg?.startsWith("--concurrency=")) {
      args.concurrency = Number(arg.slice("--concurrency=".length));
    } else if (arg === "--cache") {
      args.cache = true;
    } else if (arg === "--no-cache") {
      args.cache = false;
    } else if (arg) {
      paths.push(arg);
    }
  }
  return args;
}
