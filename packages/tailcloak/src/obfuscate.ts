import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { Root } from "postcss";

import type { ResolvedConfig } from "./config.ts";
import { transformCss } from "./css.ts";
import { createNamer, type Namer } from "./hash.ts";
import { createPrefilter, transformJs, type JsTransformResult } from "./js.ts";
import { collectCombinations, isProjectSource } from "./sources.ts";
import { getClassifier } from "./tailwind.ts";

interface Helpers {
  name: Namer;
  prefilter: RegExp;
}

const helpers = new Map<string, Helpers>();

function getHelpers(config: ResolvedConfig): Helpers {
  const key = JSON.stringify([
    config.prefix,
    config.length,
    config.seed,
    config.attributes,
    config.functions,
  ]);
  let entry = helpers.get(key);
  if (!entry) {
    entry = { name: createNamer(config), prefilter: createPrefilter(config) };
    helpers.set(key, entry);
  }
  return entry;
}

export interface ObfuscateResult<T> {
  result: T | null;
  dependencies: string[];
}

export async function obfuscateJs(
  code: string,
  file: string,
  config: ResolvedConfig,
  options: { sourceMap?: boolean } = {},
): Promise<ObfuscateResult<JsTransformResult>> {
  const { name, prefilter } = getHelpers(config);
  if (!config.enabled || !prefilter.test(code)) return { result: null, dependencies: [] };
  const classifier = await getClassifier(config);
  const result = transformJs(code, file, {
    classifier,
    name,
    config,
    sourceMap: options.sourceMap,
    combine: config.combine && isProjectSource(config, file),
  });
  return { result, dependencies: [...classifier.entries] };
}

export async function obfuscateCss(
  root: Root,
  config: ResolvedConfig,
): Promise<ObfuscateResult<Root>> {
  if (!config.enabled) return { result: null, dependencies: [] };
  const classifier = await getClassifier(config);
  const { name } = getHelpers(config);
  const combinations = config.combine ? collectCombinations(config, classifier, name) : undefined;
  const { renamed } = transformCss(root, { classifier, name, combinations });
  if (config.manifest) {
    const entries = new Map<string, string>();
    for (const [original, names] of renamed) entries.set(names[0]!, original);
    for (const [combined, classes] of combinations?.owners ?? []) entries.set(combined, classes);
    writeManifest(config.manifest, entries);
  }
  return {
    result: renamed.size > 0 ? root : null,
    dependencies: [...classifier.entries, ...(combinations?.files ?? [])],
  };
}

const manifests = new Map<string, Map<string, string>>();

function writeManifest(file: string, entries: Map<string, string>) {
  let all = manifests.get(file);
  if (!all) manifests.set(file, (all = new Map()));
  for (const [key, value] of entries) all.set(key, value);
  const sorted = [...all].toSorted(([a], [b]) => (a < b ? -1 : 1));
  const json = `${JSON.stringify(Object.fromEntries(sorted), null, 2)}\n`;
  let current: string | undefined;
  try {
    current = readFileSync(file, "utf8");
  } catch {}
  if (current === json) return;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, json);
}
