import { relative } from "node:path";
import type { CaseResult } from "../core/runner.ts";

/** Emit a single self-contained HTML page. Returns true if all passed. */
export function reportHtml(results: CaseResult[], cwd = process.cwd()): boolean {
  const passed = results.filter((r) => r.pass).length;
  const failed = results.length - passed;
  const totalCost = results.reduce((sum, r) => sum + (r.cost ?? 0), 0);
  const cards = results.map((r) => card(r, cwd)).join("\n");
  console.log(page(results.length, passed, failed, totalCost, cards));
  return failed === 0;
}

function card(r: CaseResult, cwd: string): string {
  const rel = esc(relative(cwd, r.spec.path));
  const name = r.name ? `${rel} <span class="dim">›</span> ${esc(r.name)}` : rel;
  const status = r.error ? "error" : r.pass ? "pass" : "fail";

  const meta = [
    `score ${r.score.toFixed(2)}`,
    r.latencyMs != null ? `${r.latencyMs}ms` : null,
    r.cost != null ? `$${r.cost.toFixed(4)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const parts = [`<div class="case ${status}">`];
  parts.push(`<div class="head"><span class="mark">${MARK[status]}</span>`);
  parts.push(`<span class="name">${name}</span><span class="meta">${esc(meta)}</span></div>`);

  if (r.error) parts.push(`<div class="err">${esc(r.error)}</div>`);
  if (r.regression) parts.push(`<div class="reg">⚠ regression — ${esc(r.regression)}</div>`);

  for (const s of r.scores) {
    const mk = s.pass ? MARK.pass : MARK.fail;
    const msg = s.pass ? "" : ` <span class="dim">— ${esc(s.message)}</span>`;
    parts.push(`<div class="assert ${s.pass ? "pass" : "fail"}">${mk} ${esc(s.label)}${msg}</div>`);
  }

  if (r.output != null) {
    parts.push(`<details><summary>output</summary><pre>${esc(r.output)}</pre></details>`);
  }
  parts.push("</div>");
  return parts.join("\n");
}

const MARK: Record<string, string> = { pass: "✓", fail: "✗", error: "✗" };

function page(total: number, passed: number, failed: number, cost: number, cards: string): string {
  const costLine = cost > 0 ? ` · ~$${cost.toFixed(4)}` : "";
  const generated = new Date().toISOString();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>gauge report</title>
<style>${STYLE}</style>
</head>
<body>
<header>
  <h1>gauge report</h1>
  <p class="summary ${failed === 0 ? "ok" : "bad"}">
    ${passed} passed · ${failed} failed · ${total} total${costLine}
  </p>
  <p class="dim">generated ${esc(generated)}</p>
</header>
<main>
${cards}
</main>
</body>
</html>`;
}

/** Escape the five HTML-significant characters so output can't inject markup. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STYLE = `
:root { color-scheme: light dark; --bg:#fff; --fg:#1a1a1a; --card:#f6f6f7; --line:#e2e2e5;
  --dim:#6b7280; --pass:#15803d; --fail:#b91c1c; --warn:#b45309; }
@media (prefers-color-scheme: dark) {
  :root { --bg:#0f1115; --fg:#e6e6e6; --card:#181b21; --line:#2a2e37;
    --dim:#9aa2b1; --pass:#4ade80; --fail:#f87171; --warn:#fbbf24; } }
* { box-sizing: border-box; }
body { margin:0; padding:2rem 1rem; background:var(--bg); color:var(--fg);
  font:15px/1.5 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif; }
main, header { max-width: 900px; margin: 0 auto; }
h1 { font-size:1.4rem; margin:0 0 .25rem; }
.summary { font-weight:600; margin:.25rem 0; }
.summary.ok { color:var(--pass); } .summary.bad { color:var(--fail); }
.dim { color:var(--dim); }
.case { background:var(--card); border:1px solid var(--line); border-left-width:4px;
  border-radius:8px; padding:.75rem 1rem; margin:.6rem 0; }
.case.pass { border-left-color:var(--pass); }
.case.fail, .case.error { border-left-color:var(--fail); }
.head { display:flex; align-items:baseline; gap:.5rem; flex-wrap:wrap; }
.head .name { font-weight:600; flex:1; word-break:break-word; }
.head .meta { color:var(--dim); font-size:.85rem; white-space:nowrap; }
.mark { font-weight:700; }
.case.pass .mark { color:var(--pass); }
.case.fail .mark, .case.error .mark { color:var(--fail); }
.assert { margin:.35rem 0 0 1.25rem; font-size:.9rem; }
.assert.pass { color:var(--pass); } .assert.fail { color:var(--fail); }
.err { color:var(--fail); margin:.4rem 0; }
.reg { color:var(--warn); margin:.4rem 0; font-size:.9rem; }
details { margin:.5rem 0 0; }
summary { cursor:pointer; color:var(--dim); font-size:.85rem; }
pre { background:var(--bg); border:1px solid var(--line); border-radius:6px;
  padding:.6rem .75rem; overflow-x:auto; white-space:pre-wrap; word-break:break-word;
  font:13px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace; }
`;
