import { readdirSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";

import type { ResolvedConfig } from "./config.ts";
import { combinedName, type Namer } from "./hash.ts";
import { collectClassSets, createPrefilter } from "./js.ts";
import type { Classifier } from "./tailwind.ts";

export const IGNORED_DIRS = new Set(["node_modules", "dist", "build", "out", "coverage", "public"]);
const SOURCE_RE = /\.[cm]?[jt]sx?$/;
const DECLARATION_RE = /\.d\.[cm]?ts$/;
const MAX_DEPTH = 32;

export const isScannedDir = (name: string): boolean =>
  !name.startsWith(".") && !IGNORED_DIRS.has(name);

const isSourceName = (name: string): boolean => SOURCE_RE.test(name) && !DECLARATION_RE.test(name);

type SourceDirs = Pick<ResolvedConfig, "root" | "sources">;

const sourceDirs = (config: SourceDirs): string[] => [config.root, ...config.sources];

function isUnder(dir: string, file: string): boolean {
  const rel = relative(dir, file);
  if (!rel || rel.startsWith("..") || isAbsolute(rel)) return false;
  const parts = rel.split(/[\\/]/);
  const name = parts.pop()!;
  return parts.length <= MAX_DEPTH && isSourceName(name) && parts.every(isScannedDir);
}

export function isProjectSource(config: SourceDirs, file: string): boolean {
  const clean = file.replace(/[?#].*$/, "");
  return sourceDirs(config).some((dir) => isUnder(dir, clean));
}

export function findProjectSources(config: SourceDirs): string[] {
  const found = new Set<string>();
  const walk = (dir: string, depth: number) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (depth < MAX_DEPTH && isScannedDir(entry.name)) walk(join(dir, entry.name), depth + 1);
      } else if (entry.isFile() && isSourceName(entry.name)) {
        found.add(join(dir, entry.name));
      }
    }
  };
  for (const dir of sourceDirs(config)) walk(dir, 0);
  return [...found].toSorted();
}

export interface Combinations {
  byClass: Map<string, string[]>;
  owners: Map<string, string>;
  files: string[];
}

interface FileEntry {
  mtime: number;
  size: number;
  sets: string[][];
}

const fileCache = new Map<string, FileEntry>();

export function collectCombinations(
  config: ResolvedConfig,
  classifier: Classifier,
  name: Namer,
): Combinations {
  const prefilter = createPrefilter(config);
  const cacheKey = JSON.stringify([
    classifier.entries,
    config.attributes,
    config.functions,
    config.exclude.map(String),
  ]);
  const files = findProjectSources(config);
  const sets = new Map<string, string[]>();

  for (const file of files) {
    const stat = statSync(file, { throwIfNoEntry: false });
    if (!stat) continue;
    const key = `${cacheKey}\0${file}`;
    let entry = fileCache.get(key);
    if (!entry || entry.mtime !== stat.mtimeMs || entry.size !== stat.size) {
      const code = readFileSync(file, "utf8");
      const found = prefilter.test(code)
        ? collectClassSets(code, file, { classifier, config })
        : [];
      entry = { mtime: stat.mtimeMs, size: stat.size, sets: found };
      fileCache.set(key, entry);
    }
    for (const set of entry.sets) sets.set(set.join(" "), set);
  }

  const byClass = new Map<string, string[]>();
  const owners = new Map<string, string>();
  for (const [key, set] of sets) {
    const combined = combinedName(name, set);
    const owner = owners.get(combined);
    if (owner !== undefined && owner !== key) throw collision(owner, key, combined);
    owners.set(combined, key);
    for (const cls of set) {
      const list = byClass.get(cls);
      if (list) list.push(combined);
      else byClass.set(cls, [combined]);
    }
  }
  for (const list of byClass.values()) list.sort();
  return { byClass, owners, files };
}

export function collision(a: string, b: string, name: string): Error {
  return new Error(
    `[tailcloak] Hash collision: "${a}" and "${b}" both map to "${name}". ` +
      `Increase "length" or change "seed" in your tailcloak config.`,
  );
}
