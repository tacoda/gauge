import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CompletionRequest, CompletionResult, Provider } from "../providers/index.ts";

const DIR = join(".gauge", "cache");

/** Wraps a provider so identical (vendor, model, prompt) calls hit a disk cache. */
export class CacheProvider implements Provider {
  readonly vendor: string;

  constructor(
    private readonly inner: Provider,
    private readonly cwd: string,
  ) {
    this.vendor = inner.vendor;
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const file = join(this.cwd, DIR, `${this.key(req)}.json`);
    const cached = await readFile(file, "utf8").catch(() => null);
    if (cached != null) {
      return JSON.parse(cached) as CompletionResult;
    }
    const result = await this.inner.complete(req);
    await mkdir(join(this.cwd, DIR), { recursive: true });
    await writeFile(file, JSON.stringify(result));
    return result;
  }

  private key(req: CompletionRequest): string {
    return createHash("sha256")
      .update(`${this.vendor}\0${req.model}\0${req.system ?? ""}\0${req.prompt}`)
      .digest("hex");
  }
}
