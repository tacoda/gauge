import { parse as parseYaml } from "yaml";
import { type Spec, SpecSchema } from "./spec.ts";

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/**
 * Parse an eval file into a Spec.
 *
 * `.eval.md` — YAML frontmatter (config) + Markdown body (prompt).
 * `.eval.yaml` — a single YAML doc; the prompt is the `prompt:` field.
 */
export function parseSpec(path: string, raw: string): Spec {
  return path.endsWith(".md") ? parseMarkdown(path, raw) : parseYamlSpec(path, raw);
}

function parseMarkdown(path: string, raw: string): Spec {
  const match = FRONTMATTER.exec(raw);
  if (!match) {
    throw new SpecError(path, "missing YAML frontmatter (expected a leading `---` block)");
  }
  const [, front, body] = match;
  const config = validate(path, parseYaml(front ?? "") ?? {});
  return { path, config, prompt: (body ?? "").trim() };
}

function parseYamlSpec(path: string, raw: string): Spec {
  const doc = parseYaml(raw) ?? {};
  const { prompt, ...rest } = doc as Record<string, unknown>;
  if (typeof prompt !== "string" || prompt.trim() === "") {
    throw new SpecError(path, "YAML spec must include a non-empty `prompt` field");
  }
  return { path, config: validate(path, rest), prompt: prompt.trim() };
}

function validate(path: string, data: unknown) {
  const result = SpecSchema.safeParse(data);
  if (!result.success) {
    const detail = result.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new SpecError(path, detail);
  }
  return result.data;
}

export class SpecError extends Error {
  constructor(
    readonly path: string,
    message: string,
  ) {
    super(`${path}: ${message}`);
    this.name = "SpecError";
  }
}
