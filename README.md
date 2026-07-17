# gauge

A test framework for LLM prompts. Write evals in Markdown, run them like tests.

> Published on npm as **`gauge-eval`** (the `gauge` name was taken). The CLI binary is `gauge`.

```bash
npx gauge-eval run
```

## Why

Prompts drift. Harnesses and the tooling around them break in ways unit tests
never catch. `gauge` treats prompt evaluation like a test suite: declarative
specs, a runner, assertions, CI-friendly reporters — decoupled from whatever
language your harness is written in.

## Eval format

Markdown with YAML frontmatter. The prompt is the body; config and assertions
live in the frontmatter.

```markdown
---
provider: anthropic/claude-opus-4-8
vars:
  input: "reset my password"
assert:
  - contains: "auth-flow"
  - llm-judge: "Routes correctly without asking clarifying questions"
  - latency_ms: { max: 3000 }
---

You are a router. Classify the user request: {{input}}
```

Discovery: `**/*.eval.md` and `**/*.eval.yaml`.

## Scenario (the setup step)

Think BDD: the prompt body is the **When**, `assert` is the **Then**. A
`scenario` is the **Given** — it sets up the world before the prompt runs.
`system` becomes the model's system / agent instruction; `vars` are the base
layer that spec- and case-level vars merge over. Both are rendered with the
case's vars, so a scenario can interpolate `{{...}}` too.

```markdown
---
provider: anthropic/claude-opus-4-8
scenario:
  system: You are a terse support router. Queues: {{queues}}.
  vars:
    queues: "auth, billing, other"
assert:
  - regex: "/^(auth|billing|other)$/"
---
Classify: {{input}}
```

Var precedence (last wins): `scenario.vars` → spec `vars` → case `vars`. The
`system` reaches each provider natively (OpenAI/Azure system message, Anthropic
top-level `system`, Gemini `systemInstruction`, Ollama `system`). The `exec`
provider receives it as the `GAUGE_SYSTEM` env var (stdin stays the bare prompt).

## Providers

```yaml
provider: openai/gpt-4o-mini          # vendor/model shorthand
provider: anthropic/claude-opus-4-8
provider: google/gemini-1.5-flash
provider: ollama/llama3               # local, no key
provider: azure/my-deployment         # deployment name as the model
provider:                             # object form
  type: exec                          # shell out — any language harness
  command: "python my_harness.py"     # prompt on stdin, output on stdout
```

Keys come from the environment: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
`GEMINI_API_KEY`, `AZURE_OPENAI_ENDPOINT` + `AZURE_OPENAI_API_KEY`. Ollama uses
`OLLAMA_HOST` (default `http://localhost:11434`). Native providers report token
usage, and gauge estimates per-run cost from a built-in price table.

## Assertions

| Assertion | Passes when |
|---|---|
| `equals: "x"` | output is exactly `x` |
| `contains: "x"` | output contains `x` |
| `regex: "/x/i"` | output matches (bare pattern or `/pattern/flags`) |
| `llm-judge: "rubric"` | a judge model grades the output PASS against the rubric |
| `llm-rate: { rubric, min }` | a judge rates the output 0–1; passes at or above `min` |
| `json-schema: {…}` | output parses as JSON and validates against the schema |
| `similarity: { reference, min }` | embedding cosine of output vs `reference` ≥ `min` |

Judge model defaults to `openai/gpt-4o-mini`; override with `GAUGE_JUDGE`.
Every case also gets a numeric `score` (0–1, mean of its assertion scores).

## Matrix (multiple cases per file)

Spec-level `vars`/`assert` are shared; each case merges its own `vars` over them
and appends its own `assert`.

```markdown
---
provider: openai/gpt-4o-mini
assert:
  - regex: "/^(auth|billing|other)$/"   # applies to every case
cases:
  - name: password-reset
    vars: { input: "I forgot my password" }
    assert: [{ equals: "auth" }]
  - name: refund
    vars: { input: "I want a refund" }
    assert: [{ equals: "billing" }]
---
Classify: {{input}}
```

## Reporters & CLI

```bash
gauge init                      # scaffold gauge.config.yaml + an example eval
gauge run [paths...] [-r tty|json|junit] [-f <substring>] [-u] [-c <n>] [--cache]
gauge watch [paths...]          # re-run on change
gauge report                    # reprint the last run (with cost + baseline diffs)
```

Cases run with bounded concurrency (`-c`, default 5). `--cache` stores provider
responses under `.gauge/cache` and serves identical `(model, prompt)` calls from
disk — big speedup on re-runs, and it makes runs deterministic.

`tty` (default) · `json` (dashboards) · `junit` (CI). Exit code is non-zero if
any eval fails. `--filter` keeps only specs whose path matches the substring.

## Regression baselines

```bash
gauge run -u          # save this run as the baseline (.gauge/baseline.json)
gauge run             # later runs compare against it
```

A case **regresses** — flagged and failing the run — when it was passing and now
fails, when its score drops more than 0.05, or (for assertion-free cases) when
its output changes. Every run is also saved to `.gauge/last-run.json` for
`gauge report`. Add `.gauge/` to your `.gitignore`.

## Config & secrets

Optional `gauge.config.yaml` in the working dir sets defaults (CLI flags win):

```yaml
paths: [evals]
reporter: tty
judge: openai/gpt-4o-mini
filter: ""
```

A `.env` file in the working dir is loaded automatically (API keys, `GAUGE_JUDGE`).

## Custom providers (plugin API)

```ts
import { registerProvider } from "gauge-eval";

registerProvider("myllm", () => ({
  vendor: "myllm",
  async complete({ model, prompt }) {
    return { output: await callMyModel(model, prompt), latencyMs: 0 };
  },
}));
```

Then reference it in a spec: `provider: myllm/some-model`.

Custom scorers register the same way — the key you pick becomes the assertion name:

```ts
import { registerScorer } from "gauge-eval";

registerScorer("word-count-under", (value, output) => {
  const limit = value as number;
  const n = output.split(/\s+/).filter(Boolean).length;
  return { pass: n <= limit, score: n <= limit ? 1 : 0,
    label: `word-count-under ${limit}`, message: n <= limit ? "" : `${n} words` };
});
```

```yaml
assert:
  - word-count-under: 50
```

## Config reference

```yaml
paths: [evals]
reporter: tty          # tty | json | junit
judge: openai/gpt-4o-mini
filter: ""
concurrency: 5
cache: false
```

## Status

Stable (`1.1.0`). Providers: OpenAI, Anthropic, Google Gemini, Ollama, Azure OpenAI,
exec — plus custom-provider and custom-scorer plugin APIs. Scorers:
equals/contains/regex/llm-judge/llm-rate/json-schema/similarity, with numeric scores.
tty/json/junit reporters; token usage + cost estimation; matrix cases; watch; config;
regression baselines with output diffs; `init` and `report`; bounded concurrency;
automatic retry on transient API errors; response caching.

## Development

```bash
bun install
bun test
bun run dev -- --version
bun run build
```

## License

MIT
