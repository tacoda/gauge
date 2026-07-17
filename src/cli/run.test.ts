import { expect, test } from "bun:test";
import { parseArgs } from "./run.ts";

test("collects paths", () => {
  expect(parseArgs(["a.eval.md", "b.eval.md"]).paths).toEqual(["a.eval.md", "b.eval.md"]);
});

test("parses --reporter and -r", () => {
  expect(parseArgs(["--reporter", "json"]).reporter).toBe("json");
  expect(parseArgs(["-r", "junit"]).reporter).toBe("junit");
  expect(parseArgs(["--reporter=json"]).reporter).toBe("json");
});

test("parses --filter and -f", () => {
  expect(parseArgs(["--filter", "auth"]).filter).toBe("auth");
  expect(parseArgs(["-f", "auth"]).filter).toBe("auth");
  expect(parseArgs(["--filter=auth"]).filter).toBe("auth");
});

test("mixes paths and options", () => {
  const args = parseArgs(["evals", "-r", "json", "--filter=login"]);
  expect(args.paths).toEqual(["evals"]);
  expect(args.reporter).toBe("json");
  expect(args.filter).toBe("login");
});
