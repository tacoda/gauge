import { readdir, stat } from "node:fs/promises";
import { isAbsolute, join } from "node:path";

const EXTS = [".eval.md", ".eval.yaml", ".eval.yml"];
const SKIP = new Set(["node_modules", "dist", ".git"]);

/**
 * Find eval spec files. With no paths, walk `root`. With paths, expand any
 * directories among them and pass files through as given.
 */
export async function discover(root: string, paths: string[]): Promise<string[]> {
  const roots = paths.length > 0 ? paths.map((p) => (isAbsolute(p) ? p : join(root, p))) : [root];
  const found: string[] = [];
  for (const path of roots) {
    const info = await stat(path).catch(() => null);
    if (info?.isDirectory()) {
      await walk(path, found);
    } else if (info?.isFile()) {
      found.push(path);
    }
  }
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
