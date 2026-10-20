import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";

import { CONFIG_FILES, findWorkspaceRoot, generateSeed } from "./config.ts";

const template = (seed: string) => `import type { TailcloakConfig } from "tailcloak";

export default {
  seed: "${seed}",
} satisfies TailcloakConfig;
`;

function canResolveTailcloak(root: string): boolean {
  try {
    createRequire(join(root, "package.json")).resolve("tailcloak");
    return true;
  } catch {
    return false;
  }
}

export function init(cwd: string): string {
  const root = findWorkspaceRoot(cwd);
  const existing = CONFIG_FILES.map((name) => join(root, name)).find((file) => existsSync(file));
  const display = (file: string) => relative(cwd, file) || file;

  if (!existing) {
    const file = join(root, "tailcloak.config.ts");
    writeFileSync(file, template(generateSeed()));
    const created = `Created ${display(file)} with a random seed. Commit it.`;
    if (canResolveTailcloak(root)) return created;
    return `${created}\n\nFor type checking, add tailcloak to the devDependencies in ${display(join(root, "package.json"))}.`;
  }
  if (/\bseed\s*:/.test(readFileSync(existing, "utf8"))) {
    return `${display(existing)} already sets a seed. Nothing to do.`;
  }
  return `${display(existing)} already exists. Add this line to it:\n\n  seed: "${generateSeed()}",`;
}
