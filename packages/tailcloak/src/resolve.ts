import { realpathSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";

import { readPackageJson } from "./config.ts";

type Exports = string | null | Exports[] | { [key: string]: Exports };

const JS_CONDITIONS = new Set(["style", "browser", "import", "require", "default"]);
export const CSS_CONDITIONS = new Set(["style", "default"]);
const PACKAGE_RE = /^((?:@[^/]+\/)?[^/]+)(.*)$/;

function existing(file: string): string | undefined {
  try {
    return realpathSync(file);
  } catch {
    return undefined;
  }
}

function pickTarget(value: Exports | undefined, conditions: Set<string>): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const target = pickTarget(item, conditions);
      if (target) return target;
    }
    return undefined;
  }
  if (!value) return undefined;
  for (const [condition, item] of Object.entries(value)) {
    if (!conditions.has(condition)) continue;
    const target = pickTarget(item, conditions);
    if (target) return target;
  }
  return undefined;
}

function exportTarget(
  exports: Exports,
  subpath: string,
  conditions: Set<string>,
): string | undefined {
  const isSubpathMap =
    !!exports &&
    typeof exports === "object" &&
    !Array.isArray(exports) &&
    Object.keys(exports).some((key) => key.startsWith("."));
  if (!isSubpathMap) return subpath === "." ? pickTarget(exports, conditions) : undefined;

  const map = exports as Record<string, Exports>;
  if (subpath in map) return pickTarget(map[subpath], conditions);
  const patterns = Object.keys(map)
    .filter((key) => key.includes("*"))
    .toSorted((a, b) => b.indexOf("*") - a.indexOf("*"));
  for (const key of patterns) {
    const [prefix, suffix] = [key.slice(0, key.indexOf("*")), key.slice(key.indexOf("*") + 1)];
    if (subpath.length < key.length - 1) continue;
    if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) continue;
    const match = subpath.slice(prefix.length, subpath.length - suffix.length);
    return pickTarget(map[key], conditions)?.replaceAll("*", match);
  }
  return undefined;
}

export function resolveImport(
  specifier: string,
  from: string,
  conditions = JS_CONDITIONS,
): string | undefined {
  if (specifier.startsWith(".") || isAbsolute(specifier)) {
    return existing(resolve(dirname(from), specifier));
  }
  const match = PACKAGE_RE.exec(specifier);
  if (!match) return undefined;
  const [, name, rest] = match as unknown as [string, string, string];
  for (let dir = dirname(from); ; dir = dirname(dir)) {
    const packageDir = join(dir, "node_modules", name);
    const pkg = readPackageJson(packageDir);
    if (pkg) {
      const target =
        pkg.exports !== undefined
          ? exportTarget(pkg.exports as Exports, `.${rest}`, conditions)
          : rest
            ? rest.slice(1)
            : typeof pkg.style === "string"
              ? pkg.style
              : "index.css";
      return target ? existing(join(packageDir, target)) : undefined;
    }
    if (dirname(dir) === dir) return undefined;
  }
}
