import { expect, test } from "bun:test";
import { postJson } from "./http.ts";

function seqFetch(responses: { status: number; body?: unknown }[]): {
  fetchImpl: typeof fetch;
  calls: () => number;
} {
  let i = 0;
  const fetchImpl = (async () => {
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    return new Response(JSON.stringify(r?.body ?? {}), { status: r?.status ?? 200 });
  }) as typeof fetch;
  return { fetchImpl, calls: () => i };
}

test("returns first response on success without retrying", async () => {
  const { fetchImpl, calls } = seqFetch([{ status: 200, body: { ok: 1 } }]);
  const res = await postJson("u", {}, {}, { fetchImpl, backoffMs: 1 });
  expect(res.ok).toBe(true);
  expect(calls()).toBe(1);
});

test("retries transient 503 then succeeds", async () => {
  const { fetchImpl, calls } = seqFetch([{ status: 503 }, { status: 503 }, { status: 200 }]);
  const res = await postJson("u", {}, {}, { fetchImpl, retries: 2, backoffMs: 1 });
  expect(res.status).toBe(200);
  expect(calls()).toBe(3);
});

test("gives up after exhausting retries and returns last error status", async () => {
  const { fetchImpl, calls } = seqFetch([{ status: 429 }]);
  const res = await postJson("u", {}, {}, { fetchImpl, retries: 2, backoffMs: 1 });
  expect(res.status).toBe(429);
  expect(calls()).toBe(3); // initial + 2 retries
});

test("does not retry a non-retryable 400", async () => {
  const { fetchImpl, calls } = seqFetch([{ status: 400 }]);
  const res = await postJson("u", {}, {}, { fetchImpl, retries: 2, backoffMs: 1 });
  expect(res.status).toBe(400);
  expect(calls()).toBe(1);
});
