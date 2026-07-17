import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const CONFIG = `# gauge configuration — CLI flags override these.
paths: [evals]
reporter: tty          # tty | json | junit
judge: openai/gpt-4o-mini
concurrency: 5
cache: false
`;

const EXAMPLE = `---
provider: openai/gpt-4o-mini
vars:
  input: "I forgot my password"
assert:
  - contains: "auth"
  - llm-judge: "Routes correctly without asking a clarifying question"
---

You are a support router. Reply with one lowercase category slug
(auth, billing, technical, other). No punctuation.

User request: {{input}}
`;

/** `gauge init` — scaffold gauge.config.yaml and an example eval (never overwrites). */
export async function init(): Promise<number> {
  const cwd = process.cwd();
  await writeIfAbsent(join(cwd, "gauge.config.yaml"), CONFIG);
  await mkdir(join(cwd, "evals"), { recursive: true });
  await writeIfAbsent(join(cwd, "evals", "example.eval.md"), EXAMPLE);
  console.log("\nDone. Set OPENAI_API_KEY, then run: gauge run");
  return 0;
}

async function writeIfAbsent(path: string, content: string): Promise<void> {
  try {
    await writeFile(path, content, { flag: "wx" });
    console.log(`created ${path}`);
  } catch {
    console.log(`skipped ${path} (already exists)`);
  }
}
