import { expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { discover } from "./discover.ts";

async function fixture(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "gauge-disc-"));
  await mkdir(join(dir, "sub"), { recursive: true });
  await mkdir(join(dir, "node_modules"), { recursive: true });
  await writeFile(join(dir, "a.eval.md"), "");
  await writeFile(join(dir, "sub", "b.eval.yaml"), "");
  await writeFile(join(dir, "not-an-eval.md"), "");
  await writeFile(join(dir, "node_modules", "c.eval.md"), "");
  return dir;
}

test("walks root, matches eval exts, skips node_modules", async () => {
  const dir = await fixture();
  const found = await discover(dir, []);
  expect(found).toEqual([join(dir, "a.eval.md"), join(dir, "sub", "b.eval.yaml")]);
});

test("expands an explicitly passed directory", async () => {
  const dir = await fixture();
  const found = await discover(dir, ["sub"]);
  expect(found).toEqual([join(dir, "sub", "b.eval.yaml")]);
});

test("passes an explicit file through", async () => {
  const dir = await fixture();
  const found = await discover(dir, [join(dir, "a.eval.md")]);
  expect(found).toEqual([join(dir, "a.eval.md")]);
});
