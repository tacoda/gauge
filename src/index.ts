// gauge-eval public library API.

export const VERSION = "0.2.0";

export { parseSpec, SpecError } from "./core/parse.ts";
export { runAll, runSpec, type CaseResult, type RunOptions } from "./core/runner.ts";
export { render } from "./core/template.ts";
export type { Assertion, ProviderSpec, Spec, SpecConfig } from "./core/spec.ts";
export {
  AnthropicProvider,
  ExecProvider,
  OpenAIProvider,
  resolveProvider,
  type CompletionRequest,
  type CompletionResult,
  type Provider,
  type ResolvedProvider,
  type Resolver,
} from "./providers/index.ts";
export { score, type ScoreContext, type ScoreResult } from "./scorers/index.ts";
