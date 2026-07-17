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

// An assertion is a single-key object naming a scorer (built-in or registered
// via registerScorer). The key selects the scorer; the value is scorer-specific
// and validated by the scorer at run time, so custom scorers work without a
// schema change here.
export const AssertionSchema = z
  .record(z.string(), z.unknown())
  .refine((o) => Object.keys(o).length === 1, {
    message: "an assertion must have exactly one key",
  });
export type Assertion = z.infer<typeof AssertionSchema>;

// A scenario is the BDD "Given": it sets up the world before the prompt runs.
// `system` becomes the model's system/agent instruction; `vars` form the base
// layer that spec- and case-level vars merge over. Both are rendered with the
// case's vars, so a scenario can reference {{...}} too.
export const ScenarioSchema = z
  .object({
    system: z.string().optional(),
    vars: z.record(z.string(), z.unknown()).default({}),
  })
  .strict();
export type ScenarioConfig = z.infer<typeof ScenarioSchema>;

// A case overrides/extends the spec-level vars and assertions. Case vars merge
// over base vars; case assertions are appended to base assertions.
export const CaseSchema = z
  .object({
    name: z.string().optional(),
    vars: z.record(z.string(), z.unknown()).default({}),
    assert: z.array(AssertionSchema).default([]),
  })
  .strict();
export type CaseConfig = z.infer<typeof CaseSchema>;

// One eval spec = one prompt run against one or more cases. With no `cases`,
// the spec-level vars/assert form a single implicit case.
export const SpecSchema = z.object({
  provider: ProviderSpecSchema,
  scenario: ScenarioSchema.optional(),
  vars: z.record(z.string(), z.unknown()).default({}),
  assert: z.array(AssertionSchema).default([]),
  cases: z.array(CaseSchema).optional(),
});
export type SpecConfig = z.infer<typeof SpecSchema>;

// A parsed spec pairs frontmatter config with the prompt body and its source path.
export interface Spec {
  path: string;
  config: SpecConfig;
  prompt: string;
}
