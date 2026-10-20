import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { formatMessage } from "./log.ts";

export type ClassMatcher = string | RegExp;

export interface TailcloakConfig {
  /**
   * Turn obfuscation on or off.
   *
   * @default process.env.NODE_ENV === "production"
   */
  enabled?: boolean;
  /**
   * Prepended to every obfuscated class name, e.g. `"tc_"` turns `flex` into `tc_a8Kd2q`.
   *
   * @default ""
   */
  prefix?: string;
  /**
   * Number of hash characters after the prefix (3 to 16).
   *
   * @default 6
   */
  length?: number;
  /**
   * Collapse the Tailwind classes of each class string into a single class name, so
   * `className="flex items-center p-4"` becomes `className="tc_a8Kd2q"`. The CSS rules of
   * those utilities then also match the combined name. Set to `false` to rename classes
   * one-to-one, which skips scanning your sources from the CSS side.
   *
   * @default true
   */
  combine?: boolean;
  /**
   * Secret salt mixed into every hash, at least 16 characters. Required whenever obfuscation is
   * enabled: without it, anyone could compute your names. `npx tailcloak init` writes a random
   * one to your root config. The app's `package.json` name is always mixed in too, so apps
   * sharing a seed still get different names. Change it to reshuffle all names.
   */
  seed?: string;
  /**
   * Tailwind entry stylesheet(s), relative to `root`. They define which tokens are
   * Tailwind classes. When omitted, every stylesheet that imports `tailwindcss` and is either
   * under `root` or imported by a source file under `root` (including through a package's
   * `exports`) is used.
   */
  css?: string | string[];
  /**
   * JSX attributes and object properties whose values hold class names.
   * Attributes ending in `ClassName` (e.g. `wrapperClassName`) are always included.
   *
   * @default ["class", "className"]
   */
  attributes?: string[];
  /**
   * Functions whose arguments are class names, clsx-style (strings, arrays, object keys).
   * `cva` and `tv` are understood natively and should not be listed here.
   *
   * @default ["cn", "clsx", "cx", "classnames", "classNames", "twMerge", "twJoin", "tw"]
   */
  functions?: string[];
  /** Classes that must never be obfuscated, e.g. classes toggled by third-party scripts. */
  exclude?: ClassMatcher[];
  /**
   * Extra source folders, relative to `root`, whose class strings are combined like your own.
   * Folders listed with `@source` in your Tailwind stylesheet are already included, so this is
   * rarely needed. Files outside `root` and these folders are still obfuscated, one name per
   * class. The folders must be compiled by your bundler (not loaded from `node_modules`).
   *
   * @default []
   */
  sources?: string[];
  /**
   * Writes a JSON map of every obfuscated name to the classes it stands for, relative to
   * `root`, e.g. `"tailcloak-manifest.json"`. Useful for debugging production markup.
   * Keep it out of your public output folder unless you want the mapping to be public.
   */
  manifest?: string;
  /**
   * Project root used to find Tailwind entry stylesheets and sources. Config files are read from
   * here and every parent folder up to the repository or workspace root, closest file winning.
   *
   * @default process.cwd()
   */
  root?: string;
}

export interface ResolvedConfig {
  enabled: boolean;
  prefix: string;
  length: number;
  combine: boolean;
  seed: string;
  css: string[] | null;
  attributes: string[];
  functions: string[];
  exclude: ClassMatcher[];
  sources: string[];
  manifest: string | null;
  root: string;
}

export function configError(message: string): Error {
  const error = new Error(formatMessage(message));
  error.stack = `Error: ${error.message}`;
  return error;
}

export function defineConfig(config: TailcloakConfig): TailcloakConfig {
  return config;
}

export const CONFIG_FILES = [
  "tailcloak.config.ts",
  "tailcloak.config.mts",
  "tailcloak.config.cts",
  "tailcloak.config.js",
  "tailcloak.config.mjs",
  "tailcloak.config.cjs",
];

export const DEFAULT_FUNCTIONS = [
  "cn",
  "clsx",
  "cx",
  "classnames",
  "classNames",
  "twMerge",
  "twJoin",
  "tw",
];

const PREFIX_RE = /^(?:-?[A-Za-z_][\w-]*)?$/;

export function resolveConfig(config: TailcloakConfig = {}): ResolvedConfig {
  const prefix = config.prefix ?? "";
  if (!PREFIX_RE.test(prefix)) {
    throw configError(
      `Invalid prefix "${prefix}". It must be a valid CSS identifier start, e.g. "tc_" or "x-".`,
    );
  }
  const length = config.length ?? 6;
  if (!Number.isInteger(length) || length < 3 || length > 16) {
    throw configError(`"length" must be an integer between 3 and 16, got ${length}.`);
  }
  const css = config.css === undefined ? null : [config.css].flat();
  const root = config.root ?? process.cwd();
  const enabled = config.enabled ?? process.env.NODE_ENV === "production";
  if (enabled) checkSeed(config.seed);
  return {
    enabled,
    prefix,
    length,
    combine: config.combine ?? true,
    seed: `${config.seed ?? ""}\u0000${packageName(root)}`,
    css: css && css.length > 0 ? css : null,
    attributes: config.attributes ?? ["class", "className"],
    functions: config.functions ?? DEFAULT_FUNCTIONS,
    exclude: config.exclude ?? [],
    sources: (config.sources ?? []).map((dir) => resolve(root, dir)),
    manifest: config.manifest ? resolve(root, config.manifest) : null,
    root,
  };
}

export const MIN_SEED_LENGTH = 16;

export function generateSeed(): string {
  return randomBytes(16).toString("hex");
}

function checkSeed(seed: string | undefined) {
  if (typeof seed === "string" && seed.length >= MIN_SEED_LENGTH) return;
  const problem = seed
    ? `"seed" must be at least ${MIN_SEED_LENGTH} characters, so nobody can guess it.`
    : `No "seed" set. Without a secret seed, anyone can compute your class names.`;
  throw configError(
    `${problem}\n\n` +
      `Run \`npx tailcloak init\`, or add this to tailcloak.config.ts at your repository root:\n\n` +
      `  seed: "${generateSeed()}",\n`,
  );
}

export function readPackageJson(dir: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  } catch {
    return undefined;
  }
}

function packageName(root: string): string {
  for (let dir = resolve(root); ; dir = dirname(dir)) {
    const pkg = readPackageJson(dir);
    if (pkg) return typeof pkg.name === "string" ? pkg.name : "";
    if (dirname(dir) === dir) return "";
  }
}

function isWorkspaceRoot(dir: string): boolean {
  if (existsSync(join(dir, ".git")) || existsSync(join(dir, "pnpm-workspace.yaml"))) return true;
  return readPackageJson(dir)?.workspaces !== undefined;
}

export function findWorkspaceRoot(from: string): string {
  for (let dir = resolve(from); ; dir = dirname(dir)) {
    if (isWorkspaceRoot(dir)) return dir;
    if (dirname(dir) === dir) return resolve(from);
  }
}

export function findConfigFiles(root: string): string[] {
  const files: string[] = [];
  for (let dir = resolve(root); ; dir = dirname(dir)) {
    const file = CONFIG_FILES.map((name) => join(dir, name)).find((path) => existsSync(path));
    if (file) files.unshift(file);
    if (dirname(dir) === dir || isWorkspaceRoot(dir)) return files;
  }
}

async function loadConfigFiles(root: string): Promise<TailcloakConfig> {
  const configs = await Promise.all(findConfigFiles(root).map(importConfigFile));
  return Object.assign({}, ...configs.map(stripUndefined));
}

const fileCache = new Map<string, { mtime: number; config: TailcloakConfig }>();

async function importConfigFile(file: string): Promise<TailcloakConfig> {
  const mtime = statSync(file).mtimeMs;
  const cached = fileCache.get(file);
  if (cached?.mtime === mtime) return cached.config;

  const { createJiti } = await import("jiti");
  const jiti = createJiti(import.meta.url, { moduleCache: false, fsCache: false });
  const mod = await jiti.import<TailcloakConfig | (() => TailcloakConfig)>(file, { default: true });
  const config = typeof mod === "function" ? mod() : mod;
  if (!config || typeof config !== "object") {
    throw configError(`${file} must default-export a config object.`);
  }
  fileCache.set(file, { mtime, config });
  return config;
}

export async function loadConfig(
  inline: TailcloakConfig = {},
  defaults: TailcloakConfig = {},
): Promise<ResolvedConfig> {
  const root = inline.root ?? defaults.root ?? process.cwd();
  const fromFile = await loadConfigFiles(root);
  return resolveConfig({ ...defaults, ...fromFile, ...stripUndefined(inline), root });
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

type SerializedMatcher = string | { source: string; flags: string };

export function serializeConfig(config: TailcloakConfig): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify({
      ...config,
      exclude: config.exclude?.map((m): SerializedMatcher =>
        m instanceof RegExp ? { source: m.source, flags: m.flags } : m,
      ),
    }),
  );
}

export function deserializeConfig(raw: Record<string, unknown>): TailcloakConfig {
  const exclude = raw.exclude as SerializedMatcher[] | undefined;
  return {
    ...raw,
    exclude: exclude?.map((m) => (typeof m === "string" ? m : new RegExp(m.source, m.flags))),
  } as TailcloakConfig;
}
