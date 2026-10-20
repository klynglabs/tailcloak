import { readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { configError, type ClassMatcher, type ResolvedConfig } from "./config.ts";
import { formatList, formatMessage } from "./log.ts";
import { CSS_CONDITIONS, resolveImport } from "./resolve.ts";
import { isScannedDir, isSourceName, MAX_DEPTH } from "./sources.ts";

interface DesignSystem {
  candidatesToCss(classes: string[]): (string | null)[];
}

type LoadDesignSystem = (css: string, options: { base: string }) => Promise<DesignSystem>;

interface SourcePattern {
  base: string;
  pattern: string;
}

interface Compiled {
  sources: (SourcePattern & { negated: boolean })[];
  root: "none" | SourcePattern | null;
}

type Compile = (
  css: string,
  options: { base: string; onDependency: (path: string) => void },
) => Promise<Compiled>;

interface TailwindNode {
  loadDesignSystem: LoadDesignSystem;
  compile: Compile;
}

export const TAILWIND_IMPORT_RE =
  /@import\s+(?:url\()?["']tailwindcss(?:\/[^"']*)?["']|@tailwind\s+utilities/;
const JS_CSS_IMPORT_RE =
  /\b(?:import|from|require)\s*\(?\s*["']([^"'\n?#]+\.css)(?:[?#][^"'\n]*)?["']/g;
const CSS_IMPORT_RE = /@import\s+(?:url\(\s*)?["']([^"'\n]+)["']/g;
const SKIPPED_CSS_IMPORT_RE = /^(?:tailwindcss(?:\/|$)|[a-z][\w+.-]*:|\/\/)/i;

const isStylesheet = (name: string): boolean =>
  name.endsWith(".css") && !name.endsWith(".module.css");

interface Scan {
  mtime: number;
  size: number;
  tailwind: boolean;
  imports: string[];
}

const scans = new Map<string, Scan>();

function parse(file: string, text: string): Pick<Scan, "tailwind" | "imports"> {
  if (!isStylesheet(file)) {
    const imports = [...text.matchAll(JS_CSS_IMPORT_RE)].map((m) => m[1]!).filter(isStylesheet);
    return { tailwind: false, imports };
  }
  const imports = [...text.matchAll(CSS_IMPORT_RE)]
    .map((m) => m[1]!)
    .filter((specifier) => !SKIPPED_CSS_IMPORT_RE.test(specifier));
  return { tailwind: TAILWIND_IMPORT_RE.test(text), imports };
}

function scan(file: string): Scan | undefined {
  const stat = statSync(file, { throwIfNoEntry: false });
  if (!stat?.isFile()) return undefined;
  const cached = scans.get(file);
  if (cached?.mtime === stat.mtimeMs && cached.size === stat.size) return cached;
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
  const result = { mtime: stat.mtimeMs, size: stat.size, ...parse(file, text) };
  scans.set(file, result);
  return result;
}

function resolveStylesheet(specifier: string, from: string, css: boolean): string | undefined {
  if (!css) {
    const file = resolveImport(specifier, from);
    return file && isStylesheet(file) ? file : undefined;
  }
  const isRelative = specifier.startsWith(".") || isAbsolute(specifier);
  for (const candidate of isRelative ? [specifier] : [`./${specifier}`, specifier]) {
    for (const path of extname(candidate) ? [candidate] : [candidate, `${candidate}.css`]) {
      const file = resolveImport(path, from, CSS_CONDITIONS);
      if (file && isStylesheet(file)) return file;
    }
  }
  return undefined;
}

function cssImports(file: string, imports: string[]): string[] {
  return imports.flatMap((specifier) => resolveStylesheet(specifier, file, true) ?? []);
}

function importsTailwind(file: string, seen: Set<string>): boolean {
  if (seen.has(file)) return false;
  seen.add(file);
  const result = scan(file);
  if (!result) return false;
  return result.tailwind || cssImports(file, result.imports).some((f) => importsTailwind(f, seen));
}

export function isTailwindStylesheet(file: string, source?: string): boolean {
  if (!isStylesheet(file)) return false;
  const seen = new Set([realPath(file)]);
  const { tailwind, imports } =
    source === undefined ? (scan(file) ?? parse(file, "")) : parse(file, source);
  return tailwind || cssImports(file, imports).some((f) => importsTailwind(f, seen));
}

function importedStylesheets(file: string, found: Set<string>) {
  for (const imported of cssImports(file, scan(file)?.imports ?? [])) {
    if (found.has(imported)) continue;
    found.add(imported);
    importedStylesheets(imported, found);
  }
}

function realPath(file: string): string {
  try {
    return realpathSync(file);
  } catch {
    return file;
  }
}

export function findTailwindEntries(root: string): string[] {
  const candidates = new Map<string, string>();
  const walk = (dir: string, depth: number) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (depth < MAX_DEPTH && isScannedDir(entry.name)) walk(file, depth + 1);
      } else if (!entry.isFile() && !entry.isSymbolicLink()) {
        continue;
      } else if (isStylesheet(entry.name)) {
        const real = realPath(file);
        if (!candidates.has(real)) candidates.set(real, file);
      } else if (isSourceName(entry.name)) {
        for (const specifier of scan(file)?.imports ?? []) {
          const target = resolveStylesheet(specifier, file, false);
          if (target && !candidates.has(target)) candidates.set(target, target);
        }
      }
    }
  };
  walk(root, 0);

  let kept: [string, string][] = [];
  const nested = new Set<string>();
  for (const entry of [...candidates].toSorted(([a], [b]) => a.localeCompare(b))) {
    if (nested.has(entry[0]) || !isTailwindStylesheet(entry[0])) continue;
    const reached = new Set<string>();
    importedStylesheets(entry[0], reached);
    kept = kept.filter(([real]) => !reached.has(real));
    kept.push(entry);
    for (const file of reached) nested.add(file);
  }
  return kept.map(([, file]) => file).toSorted();
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
  throw configError(
    `Could not find Tailwind CSS v4 from ${root}. Install @tailwindcss/postcss or @tailwindcss/vite.`,
  );
}

async function importTailwindNode(root: string): Promise<TailwindNode> {
  const url = pathToFileURL(resolveTailwindNode(root)).href;
  const mod = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url);
  return { loadDesignSystem: mod.__unstable__loadDesignSystem, compile: mod.compile };
}

const GLOB_RE = /[*?{[]/;

function sourceDir({ base, pattern }: SourcePattern): string | undefined {
  const parts: string[] = [];
  for (const part of pattern.split("/")) {
    if (GLOB_RE.test(part)) break;
    parts.push(part);
  }
  const dir = resolve(base, parts.join("/"));
  return statSync(dir, { throwIfNoEntry: false })?.isDirectory() ? dir : undefined;
}

async function findSourceDirs(compile: Compile, css: string, base: string): Promise<string[]> {
  let compiled: Compiled;
  try {
    compiled = await compile(css, { base, onDependency() {} });
  } catch {
    return [];
  }
  const patterns = compiled.sources.filter((s) => !s.negated);
  if (compiled.root && compiled.root !== "none")
    patterns.push({ ...compiled.root, negated: false });
  return patterns.map(sourceDir).filter((dir) => dir !== undefined);
}

export interface Classifier {
  test(token: string): boolean;
  entries: readonly string[];
  sources: readonly string[];
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
  sources: readonly string[] = [],
): Classifier {
  const cache = new Map<string, boolean>();
  return {
    entries,
    sources,
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

const isFile = (file: string) => statSync(file, { throwIfNoEntry: false })?.isFile() ?? false;

export function tailwindEntries(config: ResolvedConfig): string[] {
  if (config.css) {
    const files = config.css.map((file) => resolve(config.root, file));
    const missing = files
      .filter((file) => !isFile(file))
      .map((file) => relative(config.root, file));
    if (missing.length > 0) {
      throw configError(
        `"css" lists a stylesheet that doesn't exist: ${missing.join(", ")}\n` +
          `Paths are relative to ${config.root}.`,
      );
    }
    return files;
  }
  const entries = findTailwindEntries(config.root);
  if (entries.length > 0) return entries;
  throw configError(
    `No Tailwind stylesheet found for ${config.root}\n\n` +
      `Tailcloak looks for stylesheets that import "tailwindcss", directly or through @import:\n` +
      `  - .css files in that folder\n` +
      `  - .css files its source files import, e.g. import "@acme/ui/globals.css"\n\n` +
      `If yours is somewhere else, set "css" in tailcloak.config.ts:\n\n` +
      `  css: "../../packages/ui/src/globals.css",\n`,
  );
}

export function checkTailwind(config: ResolvedConfig): string {
  const entries = tailwindEntries(config);
  resolveTailwindNode(config.root);
  const files = entries.map((file) => relative(config.root, file).replaceAll("\\", "/"));
  return formatMessage(`Obfuscating Tailwind classes from ${formatList(files)}`);
}

export function getClassifier(config: ResolvedConfig): Promise<Classifier> {
  const id = JSON.stringify([config.root, config.css, config.exclude.map(String)]);
  const now = Date.now();
  const cached = classifiers.get(id);
  if (cached && now - cached.checkedAt < RECHECK_MS) return cached.promise;

  let entries: string[];
  try {
    entries = tailwindEntries(config);
  } catch (error) {
    return Promise.reject(error);
  }
  const key = signature(entries);
  if (cached && cached.key === key) {
    cached.checkedAt = now;
    return cached.promise;
  }

  const promise = (async () => {
    const { loadDesignSystem, compile } = await importTailwindNode(config.root);
    const stylesheets = entries.map((file) => ({
      css: readFileSync(file, "utf8"),
      base: dirname(file),
    }));
    const [systems, sources] = await Promise.all([
      Promise.all(stylesheets.map(({ css, base }) => loadDesignSystem(css, { base }))),
      Promise.all(stylesheets.map(({ css, base }) => findSourceDirs(compile, css, base))),
    ]);
    return createClassifier(
      systems,
      config.exclude,
      entries,
      [...new Set(sources.flat())].toSorted(),
    );
  })();
  classifiers.set(id, { key, checkedAt: now, promise });
  promise.catch(() => classifiers.delete(id));
  return promise;
}
