import { spawn } from "node:child_process";
import type { CompletionRequest, CompletionResult, Provider } from "./types.ts";

/**
 * Runs an arbitrary command as the "model": the rendered prompt is written to
 * the command's stdin, and its stdout becomes the output. This is the
 * language-agnostic escape hatch — wrap any harness in any language.
 *
 * `model` carries the command string (from the provider object's `command`).
 * A scenario `system` is passed as the GAUGE_SYSTEM env var (stdin stays the
 * bare prompt), so the wrapped harness can consume it without parsing.
 */
export class ExecProvider implements Provider {
  readonly vendor = "exec";

  complete(req: CompletionRequest): Promise<CompletionResult> {
    const start = performance.now();
    return new Promise((resolve, reject) => {
      const env = req.system ? { ...process.env, GAUGE_SYSTEM: req.system } : process.env;
      const child = spawn(req.model, { shell: true, env });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => {
        stdout += d;
      });
      child.stderr.on("data", (d) => {
        stderr += d;
      });
      child.on("error", reject);
      child.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(`exec command exited with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`),
          );
          return;
        }
        resolve({ output: stdout.trim(), latencyMs: Math.round(performance.now() - start) });
      });
      child.stdin.write(req.prompt);
      child.stdin.end();
    });
  }
}
