import { expect, test } from "bun:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "./config.ts";

async function tmp(): Promise<string> {
  return mkdtemp(join(tmpdir(), "gauge-cfg-"));
}

test("returns {} when no config file present", async () => {
  expect(await loadConfig(await tmp())).toEqual({});
});

test("loads and validates gauge.config.yaml", async () => {
  const dir = await tmp();
  await writeFile(
    join(dir, "gauge.config.yaml"),
    "reporter: json\njudge: openai/gpt-4o-mini\npaths:\n  - evals\n",
  );
  const cfg = await loadConfig(dir);
  expect(cfg.reporter).toBe("json");
  expect(cfg.judge).toBe("openai/gpt-4o-mini");
  expect(cfg.paths).toEqual(["evals"]);
});

test("rejects unknown reporter", async () => {
  const dir = await tmp();
  await writeFile(join(dir, "gauge.config.yaml"), "reporter: bogus\n");
  await expect(loadConfig(dir)).rejects.toThrow();
});
