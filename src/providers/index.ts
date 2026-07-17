import type { ProviderSpec } from "../core/spec.ts";
import { AnthropicProvider } from "./anthropic.ts";
import { ExecProvider } from "./exec.ts";
import { OpenAIProvider } from "./openai.ts";
import type { Provider } from "./types.ts";

export type { CompletionRequest, CompletionResult, Provider } from "./types.ts";
export { AnthropicProvider } from "./anthropic.ts";
export { ExecProvider } from "./exec.ts";
export { OpenAIProvider } from "./openai.ts";

export interface ResolvedProvider {
  provider: Provider;
  model: string;
}

export type Resolver = (spec: ProviderSpec) => ResolvedProvider;

// vendor -> factory for the "vendor/model" string shorthand.
const VENDORS: Record<string, () => Provider> = {
  openai: () => new OpenAIProvider(),
  anthropic: () => new AnthropicProvider(),
};

/**
 * Register a custom provider vendor for the `vendor/model` shorthand. The
 * plugin extension point for providers.
 */
export function registerProvider(vendor: string, factory: () => Provider): void {
  VENDORS[vendor] = factory;
}

/** Resolve a provider spec (string shorthand or object form) into a provider + model. */
export function resolveProvider(spec: ProviderSpec): ResolvedProvider {
  return typeof spec === "string" ? resolveString(spec) : resolveObject(spec);
}

function resolveString(spec: string): ResolvedProvider {
  const slash = spec.indexOf("/");
  if (slash === -1) {
    throw new Error(`invalid provider "${spec}" — expected "vendor/model"`);
  }
  const vendor = spec.slice(0, slash);
  const model = spec.slice(slash + 1);
  const factory = VENDORS[vendor];
  if (!factory) {
    throw new Error(
      `unknown provider vendor "${vendor}" — known: ${Object.keys(VENDORS).join(", ")}`,
    );
  }
  if (!model) {
    throw new Error(`invalid provider "${spec}" — missing model after "${vendor}/"`);
  }
  return { provider: factory(), model };
}

function resolveObject(spec: Exclude<ProviderSpec, string>): ResolvedProvider {
  switch (spec.type) {
    case "openai":
      return { provider: new OpenAIProvider(), model: spec.model };
    case "anthropic":
      return { provider: new AnthropicProvider(), model: spec.model };
    case "exec":
      // ExecProvider carries the command string in `model`.
      return { provider: new ExecProvider(), model: spec.command };
  }
}
