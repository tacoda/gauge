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

## Reporters

`gauge run --reporter tty` (default) or `--reporter json` (CI/dashboards).
Exit code is non-zero if any eval fails.

## Status

Beta (`0.2.0`). Working: OpenAI/Anthropic/exec providers, equals/contains/regex/llm-judge
scorers, tty + json reporters. See the roadmap for the path to 1.0
(matrix vars, watch, config file, snapshot regression).

## Development

```bash
bun install
bun test
bun run dev -- --version
bun run build
```

## License

MIT
