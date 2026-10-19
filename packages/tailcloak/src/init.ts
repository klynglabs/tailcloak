import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

import { CONFIG_FILES, findWorkspaceRoot, generateSeed } from "./config.ts";

export function init(cwd: string): string {
  const root = findWorkspaceRoot(cwd);
  const existing = CONFIG_FILES.map((name) => join(root, name)).find((file) => existsSync(file));
  const display = (file: string) => relative(cwd, file) || file;

  if (!existing) {
    const file = join(root, "tailcloak.config.ts");
    writeFileSync(file, `export default {\n  seed: "${generateSeed()}",\n};\n`);
    return `Created ${display(file)} with a random seed. Commit it.`;
  }
  if (/\bseed\s*:/.test(readFileSync(existing, "utf8"))) {
    return `${display(existing)} already sets a seed. Nothing to do.`;
  }
  return `${display(existing)} already exists. Add this line to it:\n\n  seed: "${generateSeed()}",`;
}
