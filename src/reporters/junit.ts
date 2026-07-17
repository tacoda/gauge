import type { CaseResult } from "../core/runner.ts";

/** Emit JUnit XML (for CI systems that ingest it). Returns true if all passed. */
export function reportJunit(results: CaseResult[]): boolean {
  const failures = results.filter((r) => !r.pass && !r.error).length;
  const errors = results.filter((r) => r.error).length;
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuite name="gauge" tests="${results.length}" failures="${failures}" errors="${errors}">`,
  ];
  for (const r of results) {
    lines.push(testcase(r));
  }
  lines.push("</testsuite>");
  console.log(lines.join("\n"));
  return failures === 0 && errors === 0;
}

function testcase(r: CaseResult): string {
  const name = xml(r.name ? `${r.spec.path} › ${r.name}` : r.spec.path);
  const time = ((r.latencyMs ?? 0) / 1000).toFixed(3);
  const open = `  <testcase classname="${xml(r.spec.path)}" name="${name}" time="${time}">`;
  if (r.error) {
    return `${open}\n    <error message="${xml(r.error)}"/>\n  </testcase>`;
  }
  const failed = r.scores.filter((s) => !s.pass);
  if (failed.length === 0) {
    return `${open}</testcase>`;
  }
  const detail = failed.map((s) => `${s.label}: ${s.message}`).join("\n");
  return `${open}\n    <failure message="${xml(`${failed.length} assertion(s) failed`)}">${xml(detail)}</failure>\n  </testcase>`;
}

function xml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
