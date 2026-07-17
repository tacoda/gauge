import { watch as fsWatch } from "node:fs";
import { loadConfig, loadEnv } from "../config.ts";
import { parseArgs, runOnce } from "./run.ts";

const DEBOUNCE_MS = 150;
// Re-run when these change: eval files, prompt sources, and gauge config.
const WATCHED = /\.(eval\.(md|ya?ml)|md|ya?ml|json)$|gauge\.config\./;

/** `gauge watch [paths...]` — run once, then re-run on relevant file changes. */
export async function watch(argv: string[]): Promise<number> {
  const cwd = process.cwd();
  loadEnv(cwd);
  const args = parseArgs(argv);

  const trigger = async () => {
    console.clear();
    console.log("gauge watch — running…\n");
    await runOnce(cwd, args, await loadConfig(cwd));
    console.log("\nwatching for changes… (ctrl-c to exit)");
  };

  await trigger();

  let timer: ReturnType<typeof setTimeout> | undefined;
  fsWatch(cwd, { recursive: true }, (_event, filename) => {
    if (!filename || !WATCHED.test(filename)) return;
    clearTimeout(timer);
    timer = setTimeout(trigger, DEBOUNCE_MS);
  });

  // Run until interrupted; watch never resolves on its own.
  return new Promise(() => {});
}
