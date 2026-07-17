// gauge-eval public library API.

export const VERSION = "1.1.0";

export { type Config, loadConfig, loadEnv } from "./config.ts";
export { parseSpec, SpecError } from "./core/parse.ts";
export { runAll, runSpec, type CaseResult, type RunOptions } from "./core/runner.ts";
export { render } from "./core/template.ts";
export type {
  Assertion,
  CaseConfig,
  ProviderSpec,
  ScenarioConfig,
  Spec,
  SpecConfig,
} from "./core/spec.ts";
export {
  annotateRegressions,
  type Baseline,
  type BaselineEntry,
  loadBaseline,
  loadLastRun,
  saveBaseline,
  saveLastRun,
  storedKey,
  type StoredCase,
} from "./core/store.ts";
export { CacheProvider } from "./core/cache.ts";
export {
  AnthropicProvider,
  AzureOpenAIProvider,
  ExecProvider,
  GLMProvider,
  GoogleProvider,
  HuggingFaceProvider,
  MistralProvider,
  OllamaProvider,
  OpenAICompatProvider,
  type OpenAICompatOptions,
  OpenAIProvider,
  OpenRouterProvider,
  registerProvider,
  resolveProvider,
  type CompletionRequest,
  type CompletionResult,
  type Provider,
  type ResolvedProvider,
  type Resolver,
  type Usage,
} from "./providers/index.ts";
export { cosine, embed } from "./providers/embeddings.ts";
export { postJson, type HttpResult, type PostOptions } from "./providers/http.ts";
export { estimateCost } from "./providers/pricing.ts";
export {
  registerScorer,
  score,
  scorerNames,
  type ScoreContext,
  type ScorerFn,
  type ScoreResult,
} from "./scorers/index.ts";
