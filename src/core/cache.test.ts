import { expect, test } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Provider } from "../providers/index.ts";
import { CacheProvider } from "./cache.ts";

function countingProvider(): Provider & { calls: number } {
  return {
    vendor: "fake",
    calls: 0,
    async complete({ prompt }) {
      this.calls++;
      return { output: `out:${prompt}`, latencyMs: 10 };
    },
  };
}

test("caches identical (model, prompt) calls and serves from disk", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "gauge-cache-"));
  const inner = countingProvider();
  const cached = new CacheProvider(inner, cwd);

  const a = await cached.complete({ model: "m", prompt: "hi" });
  const b = await cached.complete({ model: "m", prompt: "hi" });
  expect(a.output).toBe("out:hi");
  expect(b.output).toBe("out:hi");
  expect(inner.calls).toBe(1); // second served from cache

  // Fresh wrapper, same dir → still a hit.
  const cached2 = new CacheProvider(inner, cwd);
  await cached2.complete({ model: "m", prompt: "hi" });
  expect(inner.calls).toBe(1);
});

test("different prompt misses the cache", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "gauge-cache-"));
  const inner = countingProvider();
  const cached = new CacheProvider(inner, cwd);
  await cached.complete({ model: "m", prompt: "a" });
  await cached.complete({ model: "m", prompt: "b" });
  expect(inner.calls).toBe(2);
});

test("different system prompt misses the cache", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "gauge-cache-"));
  const inner = countingProvider();
  const cached = new CacheProvider(inner, cwd);
  await cached.complete({ model: "m", prompt: "hi" });
  await cached.complete({ model: "m", prompt: "hi", system: "be terse" });
  expect(inner.calls).toBe(2);
});
