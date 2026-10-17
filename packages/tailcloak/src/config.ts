import { existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

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
   * Salt mixed into every hash. Change it to reshuffle all names (e.g. per release).
   *
   * @default ""
   */
  seed?: string;
  /**
   * Tailwind entry stylesheet(s), relative to `root`. They define which tokens are
   * Tailwind classes. Auto-detected (any non-module `.css` file that imports
   * `tailwindcss`) when omitted.
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
   * Extra source folders, relative to `root`, whose class strings are combined like your own,
   * e.g. a shared UI package in a monorepo: `["../../packages/ui/src"]`. Files outside `root`
   * and these folders are still obfuscated, one name per class. The folders must be compiled
   * by your bundler (not loaded from `node_modules`), and Tailwind must scan them (`@source`).
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
   * Project root used to find the config file and Tailwind entry stylesheets.
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
    throw new Error(
      `[tailcloak] Invalid prefix "${prefix}". It must be a valid CSS identifier start, e.g. "tc_" or "x-".`,
    );
  }
  const length = config.length ?? 6;
  if (!Number.isInteger(length) || length < 3 || length > 16) {
    throw new Error(`[tailcloak] "length" must be an integer between 3 and 16, got ${length}.`);
  }
  const css = config.css === undefined ? null : [config.css].flat();
  const root = config.root ?? process.cwd();
  return {
    enabled: config.enabled ?? process.env.NODE_ENV === "production",
    prefix,
    length,
    combine: config.combine ?? true,
    seed: config.seed ?? "",
    css: css && css.length > 0 ? css : null,
    attributes: config.attributes ?? ["class", "className"],
    functions: config.functions ?? DEFAULT_FUNCTIONS,
    exclude: config.exclude ?? [],
    sources: (config.sources ?? []).map((dir) => resolve(root, dir)),
    manifest: config.manifest ? resolve(root, config.manifest) : null,
    root,
  };
}

export function findConfigFile(root: string): string | undefined {
  for (const name of CONFIG_FILES) {
    const file = join(root, name);
    if (existsSync(file)) return file;
  }
  return undefined;
}

const fileCache = new Map<string, { mtime: number; config: TailcloakConfig }>();

export async function loadConfigFile(root: string): Promise<TailcloakConfig> {
  const file = findConfigFile(root);
  if (!file) return {};
  const mtime = statSync(file).mtimeMs;
  const cached = fileCache.get(file);
  if (cached?.mtime === mtime) return cached.config;

  const { createJiti } = await import("jiti");
  const jiti = createJiti(import.meta.url, { moduleCache: false, fsCache: false });
  const mod = await jiti.import<TailcloakConfig | (() => TailcloakConfig)>(file, { default: true });
  const config = typeof mod === "function" ? mod() : mod;
  if (!config || typeof config !== "object") {
    throw new Error(`[tailcloak] ${file} must default-export a config object.`);
  }
  fileCache.set(file, { mtime, config });
  return config;
}

export async function loadConfig(
  inline: TailcloakConfig = {},
  defaults: TailcloakConfig = {},
): Promise<ResolvedConfig> {
  const root = inline.root ?? defaults.root ?? process.cwd();
  const fromFile = await loadConfigFile(root);
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
