import type { AtRule, Container, Root } from "postcss";
import selectorParser from "postcss-selector-parser";

import type { Namer } from "./hash.ts";
import { collision, type Combinations } from "./sources.ts";
import type { Classifier } from "./tailwind.ts";

export interface CssTransformOptions {
  classifier: Classifier;
  name: Namer;
  combinations?: Combinations;
}

export interface CssTransformResult {
  renamed: Map<string, string[]>;
}

function isUtilitiesLayer(node: AtRule): boolean {
  return node.name === "layer" && node.params.trim() === "utilities";
}

function insideUtilitiesLayer(node: Container): boolean {
  for (let p = node.parent; p; p = p.parent) {
    if (p.type === "atrule" && isUtilitiesLayer(p as AtRule)) return true;
  }
  return false;
}

export function transformCss(root: Root, options: CssTransformOptions): CssTransformResult {
  const { classifier, name, combinations } = options;
  const renamed = new Map<string, string[]>();
  const owners = new Map(combinations?.owners);

  const namesFor = (original: string): string[] => {
    let names = renamed.get(original);
    if (names) return names;
    const own = name(original);
    const owner = owners.get(own);
    if (owner !== undefined && owner !== original) throw collision(owner, original, own);
    owners.set(own, original);
    names = [own, ...(combinations?.byClass.get(original) ?? [])];
    renamed.set(original, names);
    return names;
  };

  const processor = selectorParser((selectors) => {
    selectors.walkClasses((node) => {
      if (!classifier.test(node.value)) return;
      const names = namesFor(node.value);
      if (names.length === 1) {
        node.value = names[0]!;
        return;
      }
      const is = selectorParser.pseudo({ value: ":is" });
      for (const n of names) {
        is.append(
          selectorParser.selector({ value: "", nodes: [selectorParser.className({ value: n })] }),
        );
      }
      node.replaceWith(is);
    });
  });

  const selectorCache = new Map<string, string>();
  let scoped = false;
  root.walkAtRules("layer", (node) => {
    if (isUtilitiesLayer(node) && node.nodes) scoped = true;
  });

  root.walkRules((rule) => {
    if (!rule.selector.includes(".")) return;
    if (scoped && !insideUtilitiesLayer(rule)) return;
    let next = selectorCache.get(rule.selector);
    if (next === undefined) {
      next = processor.processSync(rule.selector, { lossless: true });
      selectorCache.set(rule.selector, next);
    }
    rule.selector = next;
  });

  return { renamed };
}
