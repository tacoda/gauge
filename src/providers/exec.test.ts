import { expect, test } from "bun:test";
import { ExecProvider } from "./exec.ts";

test("pipes prompt to stdin and returns stdout", async () => {
  // `cat` echoes stdin back; model carries the command string.
  const res = await new ExecProvider().complete({ model: "cat", prompt: "hello world" });
  expect(res.output).toBe("hello world");
  expect(typeof res.latencyMs).toBe("number");
});

test("rejects on non-zero exit", async () => {
  const p = new ExecProvider();
  await expect(p.complete({ model: "exit 3", prompt: "x" })).rejects.toThrow(/exited with code 3/);
});
