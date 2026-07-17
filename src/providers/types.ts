export interface CompletionRequest {
  model: string;
  prompt: string;
}

export interface CompletionResult {
  output: string;
  latencyMs: number;
}

export interface Provider {
  /** Vendor id, e.g. "openai". */
  readonly vendor: string;
  complete(req: CompletionRequest): Promise<CompletionResult>;
}
