const VAR = /\{\{\s*([\w.]+)\s*\}\}/g;

/** Replace `{{name}}` placeholders with values from `vars`. Missing vars throw. */
export function render(template: string, vars: Record<string, unknown>): string {
  return template.replace(VAR, (_, name: string) => {
    if (!(name in vars)) {
      throw new Error(`unknown variable {{${name}}} — not defined in vars`);
    }
    return String(vars[name]);
  });
}
