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

## Providers

```yaml
provider: openai/gpt-4o-mini          # vendor/model shorthand
provider: anthropic/claude-opus-4-8
provider:                             # object form
  type: exec                          # shell out — any language harness
  command: "python my_harness.py"     # prompt on stdin, output on stdout
```

Keys come from the environment: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`.

## Assertions

| Assertion | Passes when |
|---|---|
| `equals: "x"` | output is exactly `x` |
| `contains: "x"` | output contains `x` |
| `regex: "/x/i"` | output matches (bare pattern or `/pattern/flags`) |
| `llm-judge: "rubric"` | a judge model grades the output PASS against the rubric |

Judge model defaults to `openai/gpt-4o-mini`; override with `GAUGE_JUDGE`.

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
gauge run [paths...] [-r tty|json|junit] [-f <substring>]
gauge watch [paths...]          # re-run on change
```

`tty` (default) · `json` (dashboards) · `junit` (CI). Exit code is non-zero if
any eval fails. `--filter` keeps only specs whose path matches the substring.

## Config & secrets

Optional `gauge.config.yaml` in the working dir sets defaults (CLI flags win):

```yaml
paths: [evals]
reporter: tty
judge: openai/gpt-4o-mini
filter: ""
```

A `.env` file in the working dir is loaded automatically (API keys, `GAUGE_JUDGE`).

## Status

Beta (`0.3.0`). Working: OpenAI/Anthropic/exec providers; equals/contains/regex/llm-judge
scorers; tty/json/junit reporters; matrix cases; watch; config file. Roadmap to 1.0:
snapshot regression, scores + thresholds, stable plugin API, caching.

## Development

```bash
bun install
bun test
bun run dev -- --version
bun run build
```

## License

MIT
