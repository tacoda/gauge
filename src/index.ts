// gauge-eval public library API.

export const VERSION = "1.0.0";

export { type Config, loadConfig, loadEnv } from "./config.ts";
export { parseSpec, SpecError } from "./core/parse.ts";
export { runAll, runSpec, type CaseResult, type RunOptions } from "./core/runner.ts";
export { render } from "./core/template.ts";
export type { Assertion, CaseConfig, ProviderSpec, Spec, SpecConfig } from "./core/spec.ts";
export {
  annotateRegressions,
  loadBaseline,
  loadLastRun,
  saveBaseline,
  saveLastRun,
  type StoredCase,
} from "./core/store.ts";
export { CacheProvider } from "./core/cache.ts";
export {
  AnthropicProvider,
  ExecProvider,
  OpenAIProvider,
  registerProvider,
  resolveProvider,
  type CompletionRequest,
  type CompletionResult,
  type Provider,
  type ResolvedProvider,
  type Resolver,
} from "./providers/index.ts";
export { postJson, type HttpResult, type PostOptions } from "./providers/http.ts";
export { score, type ScoreContext, type ScoreResult } from "./scorers/index.ts";
