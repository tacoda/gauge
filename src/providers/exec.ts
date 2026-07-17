import { spawn } from "node:child_process";
import type { CompletionRequest, CompletionResult, Provider } from "./types.ts";

/**
 * Runs an arbitrary command as the "model": the rendered prompt is written to
 * the command's stdin, and its stdout becomes the output. This is the
 * language-agnostic escape hatch — wrap any harness in any language.
 *
 * `model` carries the command string (from the provider object's `command`).
 */
export class ExecProvider implements Provider {
  readonly vendor = "exec";

  complete(req: CompletionRequest): Promise<CompletionResult> {
    const start = performance.now();
    return new Promise((resolve, reject) => {
      const child = spawn(req.model, { shell: true });
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
