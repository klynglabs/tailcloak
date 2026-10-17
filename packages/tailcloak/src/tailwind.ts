import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { ClassMatcher, ResolvedConfig } from "./config.ts";
import { isScannedDir } from "./sources.ts";

interface DesignSystem {
  candidatesToCss(classes: string[]): (string | null)[];
}

type LoadDesignSystem = (css: string, options: { base: string }) => Promise<DesignSystem>;

export const TAILWIND_IMPORT_RE =
  /@import\s+(?:url\()?["']tailwindcss(?:\/[^"']*)?["']|@tailwind\s+utilities/;
const MAX_DEPTH = 6;

export function findTailwindEntries(root: string): string[] {
  const found: string[] = [];
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
      } else if (entry.name.endsWith(".css") && !entry.name.endsWith(".module.css")) {
        const file = join(dir, entry.name);
        if (TAILWIND_IMPORT_RE.test(readFileSync(file, "utf8"))) found.push(file);
      }
    }
  };
  walk(root, 0);
  return found.toSorted();
}

const INTEGRATIONS = ["@tailwindcss/postcss", "@tailwindcss/vite", "@tailwindcss/cli"];

function resolveTailwindNode(root: string): string {
  for (const from of [join(root, "package.json"), import.meta.filename]) {
    const require = createRequire(from);
    for (const integration of INTEGRATIONS) {
      try {
        return createRequire(require.resolve(integration)).resolve("@tailwindcss/node");
      } catch {}
    }
    try {
      return require.resolve("@tailwindcss/node");
    } catch {}
  }
  throw new Error(
    `[tailcloak] Could not find Tailwind CSS v4 from ${root}. Install @tailwindcss/postcss or @tailwindcss/vite.`,
  );
}

async function importTailwindNode(root: string): Promise<LoadDesignSystem> {
  const url = pathToFileURL(resolveTailwindNode(root)).href;
  const mod = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url);
  return mod.__unstable__loadDesignSystem;
}

export interface Classifier {
  test(token: string): boolean;
  entries: readonly string[];
}

const MARKER_RE = /^(?:[\w-]+:)?(?:group|peer)(?:\/\S+)?$/;
const CANDIDATE_HINT_RE = /^[!@\w[(*-]/;

function isExcluded(token: string, exclude: ClassMatcher[]): boolean {
  for (const m of exclude) {
    if (typeof m === "string" ? m === token : ((m.lastIndex = 0), m.test(token))) return true;
  }
  return false;
}

export function createClassifier(
  designSystems: DesignSystem[],
  exclude: ClassMatcher[],
  entries: readonly string[] = [],
): Classifier {
  const cache = new Map<string, boolean>();
  return {
    entries,
    test(token) {
      let result = cache.get(token);
      if (result !== undefined) return result;
      result = false;
      if (token.length > 0 && CANDIDATE_HINT_RE.test(token) && !isExcluded(token, exclude)) {
        if (MARKER_RE.test(token)) result = true;
        else {
          for (const ds of designSystems) {
            if (ds.candidatesToCss([token])[0]) {
              result = true;
              break;
            }
          }
        }
      }
      cache.set(token, result);
      return result;
    },
  };
}

interface CacheEntry {
  key: string;
  checkedAt: number;
  promise: Promise<Classifier>;
}

const classifiers = new Map<string, CacheEntry>();
const RECHECK_MS = 1000;

function signature(files: string[]): string {
  return files.map((f) => `${f}:${statSync(f, { throwIfNoEntry: false })?.mtimeMs ?? 0}`).join("|");
}

export function getClassifier(config: ResolvedConfig): Promise<Classifier> {
  const id = JSON.stringify([config.root, config.css, config.exclude.map(String)]);
  const now = Date.now();
  const cached = classifiers.get(id);
  if (cached && now - cached.checkedAt < RECHECK_MS) return cached.promise;

  const entries = config.css
    ? config.css.map((file) => resolve(config.root, file))
    : findTailwindEntries(config.root);
  const key = signature(entries);
  if (cached && cached.key === key) {
    cached.checkedAt = now;
    return cached.promise;
  }

  const promise = (async () => {
    if (entries.length === 0) {
      console.warn(
        `[tailcloak] No Tailwind stylesheet found under ${config.root}. Set "css" in tailcloak.config.ts. Nothing will be obfuscated.`,
      );
    }
    const loadDesignSystem = await importTailwindNode(config.root);
    const systems = await Promise.all(
      entries.map((file) => loadDesignSystem(readFileSync(file, "utf8"), { base: dirname(file) })),
    );
    return createClassifier(systems, config.exclude, entries);
  })();
  classifiers.set(id, { key, checkedAt: now, promise });
  promise.catch(() => classifiers.delete(id));
  return promise;
}
