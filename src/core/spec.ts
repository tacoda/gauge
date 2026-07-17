import { z } from "zod";

// A provider is either the "vendor/model" shorthand string, or an object form
// for providers that need more than a model id (exec, http).
export const ProviderSpecSchema = z.union([
  z.string().min(1),
  z.object({ type: z.literal("openai"), model: z.string().min(1) }).strict(),
  z.object({ type: z.literal("anthropic"), model: z.string().min(1) }).strict(),
  z.object({ type: z.literal("exec"), command: z.string().min(1) }).strict(),
]);
export type ProviderSpec = z.infer<typeof ProviderSpecSchema>;

// An assertion is a single-key object naming a scorer.
export const AssertionSchema = z.union([
  z.object({ equals: z.string() }).strict(),
  z.object({ contains: z.string() }).strict(),
  z.object({ regex: z.string() }).strict(),
  z.object({ "llm-judge": z.string().min(1) }).strict(),
]);
export type Assertion = z.infer<typeof AssertionSchema>;

// One eval spec = one prompt, one set of vars, a list of assertions.
// Matrix/multi-case expansion lands in Phase 3.
export const SpecSchema = z.object({
  provider: ProviderSpecSchema,
  vars: z.record(z.string(), z.unknown()).default({}),
  assert: z.array(AssertionSchema).default([]),
});
export type SpecConfig = z.infer<typeof SpecSchema>;

// A parsed spec pairs frontmatter config with the prompt body and its source path.
export interface Spec {
  path: string;
  config: SpecConfig;
  prompt: string;
}
