import { readdir } from "node:fs/promises";
import { join } from "node:path";

const EXTS = [".eval.md", ".eval.yaml", ".eval.yml"];
const SKIP = new Set(["node_modules", "dist", ".git"]);

/** Find eval spec files under `root`, or resolve explicit paths as given. */
export async function discover(root: string, paths: string[]): Promise<string[]> {
  if (paths.length > 0) {
    return paths;
  }
  const found: string[] = [];
  await walk(root, found);
  return found.sort();
}

async function walk(dir: string, out: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.isDirectory()) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) await walk(path, out);
    } else if (EXTS.some((ext) => entry.name.endsWith(ext))) {
      out.push(path);
    }
  }
}
