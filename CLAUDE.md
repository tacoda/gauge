# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`gauge` — a test framework for LLM prompts. Evals are written in Markdown (or YAML) and run like a test suite. Published on npm as **`gauge-eval`**; the CLI binary is **`gauge`**. Runtime is Bun for dev/test, but the shipped build targets Node ≥18 (ESM).

## Commands

```bash
bun install
bun test                          # all tests
bun test src/core/runner.test.ts  # single file
bun test -t "regression"          # single test by name
bun run lint                      # biome check (CI gate — must pass)
bun run lint:fix                  # biome autofix
bun run build                     # bundle to dist/ (bun build) + emit .d.ts (tsc)
bun run dev -- run examples       # run the CLI from source (args after --)
```

CI (`.github/workflows/ci.yml`) runs `lint` → `test` → `build`; all three must pass. Publish is release-triggered.

Tests are colocated (`*.test.ts`) and use `bun:test`. No network in tests — providers are stubbed via the injectable `Resolver` (see below).

## Architecture

Pipeline: **discover → parse → run → score → report**, with an optional **baseline** comparison layer for regression gating. Everything flows through a few narrow interfaces, which is what makes the plugin points and test stubbing work.

- **Spec** ([src/core/spec.ts](src/core/spec.ts)) — the parsed eval: `{ path, config, prompt }`. Zod schemas validate frontmatter. An `Assertion` is a **single-key object** where the key names a scorer; its value is validated by the scorer at runtime, *not* by a central schema — this is deliberate so custom scorers need no schema change.
- **parse** ([src/core/parse.ts](src/core/parse.ts)) — `.eval.md` = YAML frontmatter + Markdown body (body is the prompt); `.eval.yaml` = one doc with a `prompt:` field. Throws `SpecError`.
- **runner** ([src/core/runner.ts](src/core/runner.ts)) — `expand()` turns a spec into cases (spec-level `vars`/`assert` are the base; each case merges its `vars` and appends its `assert`; no `cases` = one implicit case). `mapLimit` bounds concurrency (default 5). A failed provider call becomes a `CaseResult` with `error`, never a thrown exception.
- **providers** ([src/providers/index.ts](src/providers/index.ts)) — `Resolver` maps a `ProviderSpec` → `{ provider, model }`. The `Provider` interface is just `complete({model, prompt}) → {output, latencyMs, usage?}`. Vendors register in the `VENDORS` map for the `vendor/model` string shorthand. `registerProvider()` is the public plugin point.
- **scorers** ([src/scorers/index.ts](src/scorers/index.ts)) — a global `REGISTRY` of `ScorerFn`. Built-ins register themselves at module load. `registerScorer()` is the public plugin point; the assertion key you pick *is* the assertion name. Scorers return `{ pass, score (0–1), label, message }`; `score` is the mean of assertion scores per case.
- **store** ([src/core/store.ts](src/core/store.ts)) — regression baselines. `.gauge/baseline.json` (saved with `run -u`) and `.gauge/last-run.json`. A case regresses when it flips passing→failing, its score drops > `SCORE_TOLERANCE` (0.05), or — for assertion-free cases — its output changes. `annotateRegressions` mutates results in place, flipping `pass` to false.

### Two seams that shape everything

1. **`Resolver` injection.** `RunOptions.resolve` lets callers substitute providers. Tests pass a fake resolver; the disk cache is `withCache()` wrapping the resolver ([CacheProvider](src/core/cache.ts)), and the `llm-judge`/`llm-rate`/`similarity` scorers call back through `ScoreContext.resolve` to reach a judge/embedding model. Anything that needs a model goes through the resolver — keep it that way.
2. **Registry-based extension.** Providers and scorers both extend by mutating a module-level registry, not by editing a switch. Adding a scorer = one `registerScorer` call; adding a vendor = one `VENDORS` entry or `registerProvider`. The `Assertion` schema stays untouched.

### CLI & entry

[src/cli.ts](src/cli.ts) is a hand-rolled command switch (`run`/`watch`/`report`/`init`). [src/cli/run.ts](src/cli/run.ts) `runOnce()` is the shared discover→run→report pass (also used by `watch`). Reporters ([src/reporters/](src/reporters)) return a boolean pass/fail that becomes the process exit code (non-zero if any eval fails) — this is the CI gate. [src/index.ts](src/index.ts) is the public library API; keep its exports in sync when adding public surface.

## Conventions

- **TS extensions in imports** (`./foo.ts`) — required by the config (`allowImportingTsExtensions`, `verbatimModuleSyntax`). Match it.
- `noUncheckedIndexedAccess` is on — index access is `T | undefined`; handle it.
- Provider/scorer errors surface as data (`CaseResult.error`, failing `ScoreResult`), not thrown exceptions that abort a run. Preserve that so one bad case doesn't sink the suite.
- `.gauge/` is runtime output (baselines, cache, last-run) — gitignored, never commit it.
- `// ponytail:` comments mark deliberate simplifications (e.g. the hand-rolled arg parser) — intent, not omission.
