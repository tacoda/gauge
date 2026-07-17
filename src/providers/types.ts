export interface CompletionRequest {
  model: string;
  prompt: string;
  /** Scenario setup: the system / agent instruction sent as the system role. */
  system?: string;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}

export interface CompletionResult {
  output: string;
  latencyMs: number;
  /** Token usage when the provider reports it (native APIs do; exec does not). */
  usage?: Usage;
}

export interface Provider {
  /** Vendor id, e.g. "openai". */
  readonly vendor: string;
  complete(req: CompletionRequest): Promise<CompletionResult>;
}
