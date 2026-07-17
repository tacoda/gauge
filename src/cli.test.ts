import { expect, test } from "bun:test";
import { VERSION } from "./index.ts";

test("VERSION matches package.json", async () => {
  const pkg = await Bun.file(new URL("../package.json", import.meta.url)).json();
  expect(VERSION).toBe(pkg.version);
});

test("cli --version prints version", async () => {
  const proc = Bun.spawn(["bun", "run", "./src/cli.ts", "--version"], {
    cwd: new URL("..", import.meta.url).pathname,
    stdout: "pipe",
  });
  const out = (await new Response(proc.stdout).text()).trim();
  expect(out).toBe(VERSION);
});
