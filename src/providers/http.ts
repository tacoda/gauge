import type { CompletionRequest } from "./types.ts";

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

/** OpenAI-style message list: a leading system message when the scenario set one. */
export function chatMessages(req: CompletionRequest): ChatMessage[] {
  const messages: ChatMessage[] = [];
  if (req.system) messages.push({ role: "system", content: req.system });
  messages.push({ role: "user", content: req.prompt });
  return messages;
}

export interface HttpResult {
  ok: boolean;
  status: number;
  json: unknown;
}

export interface PostOptions {
  fetchImpl?: typeof fetch;
  /** Retry attempts after the first try (default 2). */
  retries?: number;
  /** Base backoff in ms (default 250); grows exponentially with jitter. */
  backoffMs?: number;
}

// Transient statuses worth retrying: rate limit + server/overload errors.
const RETRYABLE = new Set([429, 500, 502, 503, 504, 529]);

/** POST JSON with retry on transient HTTP errors and network failures. */
export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  opts: PostOptions = {},
): Promise<HttpResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const retries = opts.retries ?? 2;
  const backoffMs = opts.backoffMs ?? 250;
  const payload = JSON.stringify(body);

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchImpl(url, { method: "POST", headers, body: payload });
      if (res.ok || !RETRYABLE.has(res.status) || attempt === retries) {
        return { ok: res.ok, status: res.status, json: await res.json() };
      }
    } catch (err) {
      lastError = err;
      if (attempt === retries) throw err;
    }
    await sleep(backoffMs * 2 ** attempt + Math.random() * backoffMs);
  }
  // Unreachable: the loop returns or throws on the final attempt.
  throw lastError ?? new Error("postJson: exhausted retries");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
