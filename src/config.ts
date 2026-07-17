import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const ConfigSchema = z
  .object({
    /** Default discovery roots when no paths are passed on the CLI. */
    paths: z.array(z.string()).optional(),
    reporter: z.enum(["tty", "json", "junit", "html"]).optional(),
    /** Provider spec for llm-judge, e.g. "openai/gpt-4o-mini". */
    judge: z.string().optional(),
    /** Default substring filter on spec path / case name. */
    filter: z.string().optional(),
    /** Max cases run in parallel. */
    concurrency: z.number().int().positive().optional(),
    /** Cache provider responses on disk under .gauge/cache. */
    cache: z.boolean().optional(),
  })
  .strict();
export type Config = z.infer<typeof ConfigSchema>;

const NAMES = ["gauge.config.yaml", "gauge.config.yml", "gauge.config.json"];

/** Load the first gauge config file found in `cwd`, or return {} if none. */
export async function loadConfig(cwd: string): Promise<Config> {
  for (const name of NAMES) {
    const raw = await readFile(join(cwd, name), "utf8").catch(() => null);
    if (raw != null) {
      return ConfigSchema.parse(parseYaml(raw) ?? {});
    }
  }
  return {};
}

/** Load .env into process.env if present. Node 20.12+ has loadEnvFile built in. */
export function loadEnv(cwd: string): void {
  const load = (process as { loadEnvFile?: (path: string) => void }).loadEnvFile;
  try {
    load?.(join(cwd, ".env"));
  } catch {
    // no .env file — fine.
  }
}
