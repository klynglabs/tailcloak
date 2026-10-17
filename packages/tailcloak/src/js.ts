import { MagicString, type SourceMap } from "magic-string";
import { parseSync, Visitor } from "oxc-parser";

import type { ResolvedConfig } from "./config.ts";
import { combinedName, type Namer } from "./hash.ts";
import type { Classifier } from "./tailwind.ts";

interface Node {
  type: string;
  start: number;
  end: number;
  [key: string]: any;
}

export interface JsTransformOptions {
  classifier: Classifier;
  name: Namer;
  config: Pick<ResolvedConfig, "attributes" | "functions">;
  sourceMap?: boolean;
  combine?: boolean;
}

export interface JsTransformResult {
  code: string;
  map?: SourceMap;
}

const CVA_FUNCTIONS = new Set(["cva"]);
const TV_FUNCTIONS = new Set(["tv"]);
const CLASS_KEYS = new Set(["class", "className"]);
const WRAPPERS = new Set([
  "ParenthesizedExpression",
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
  "ChainExpression",
]);
const WS_RE = /\s/;

export function createPrefilter(config: Pick<ResolvedConfig, "attributes" | "functions">): RegExp {
  const words = [
    ...config.attributes,
    "ClassName",
    ...config.functions,
    ...CVA_FUNCTIONS,
    ...TV_FUNCTIONS,
  ].map((w) => w.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&"));
  return new RegExp(`(?:${[...new Set(words)].join("|")})`);
}

function unwrap(node: Node | null | undefined): Node | null | undefined {
  while (node && WRAPPERS.has(node.type)) node = node.expression;
  return node;
}

function propertyKeyName(prop: Node): string | undefined {
  if (prop.computed) return undefined;
  const key = prop.key as Node;
  if (key.type === "Identifier") return key.name;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return undefined;
}

function calleeName(callee: Node): string | undefined {
  const node = unwrap(callee);
  if (!node) return undefined;
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression" && !node.computed && node.property.type === "Identifier") {
    return node.property.name;
  }
  return undefined;
}

export type ClassTarget =
  | { kind: "range"; start: number; end: number; openStart: boolean; openEnd: boolean }
  | { kind: "key"; start: number; end: number; name: string; shorthand: boolean };

interface Token {
  start: number;
  end: number;
  value: string;
  tailwind: boolean;
}

function tokenize(
  code: string,
  target: ClassTarget & { kind: "range" },
  classifier: Classifier,
): Token[] {
  const raw = code.slice(target.start, target.end);
  const tokens: Token[] = [];
  const re = /\S+/g;
  for (let m = re.exec(raw); m; m = re.exec(raw)) {
    const start = m.index;
    const end = m.index + m[0].length;
    const partial = (target.openStart && start === 0) || (target.openEnd && end === raw.length);
    const value = m[0];
    tokens.push({
      start: target.start + start,
      end: target.start + end,
      value,
      tailwind: !partial && !value.includes("\\") && classifier.test(value),
    });
  }
  return tokens;
}

export function transformJs(
  code: string,
  filename: string,
  options: JsTransformOptions,
): JsTransformResult | null {
  const { classifier, name } = options;
  const targets = findClassTargets(code, filename, options.config);
  if (!targets) return null;

  const s = new MagicString(code);
  for (const target of targets) {
    if (target.kind === "key") {
      if (!classifier.test(target.name)) continue;
      const quoted = JSON.stringify(name(target.name));
      s.overwrite(
        target.start,
        target.end,
        target.shorthand ? `${quoted}: ${target.name}` : quoted,
      );
      continue;
    }
    const tokens = tokenize(code, target, classifier);
    const classes = tokens.filter((t) => t.tailwind);
    if (classes.length === 0) continue;
    if (!options.combine || classes.length === 1) {
      for (const t of classes) s.overwrite(t.start, t.end, name(t.value));
      continue;
    }
    const [first] = classes;
    s.overwrite(
      first!.start,
      first!.end,
      combinedName(
        name,
        classes.map((t) => t.value),
      ),
    );
    for (let i = 1; i < tokens.length; i++) {
      const t = tokens[i]!;
      if (t.tailwind && t !== first) s.remove(tokens[i - 1]!.end, t.end);
    }
  }

  if (!s.hasChanged()) return null;
  return {
    code: s.toString(),
    map: options.sourceMap
      ? s.generateMap({ source: filename, includeContent: true, hires: "boundary" })
      : undefined,
  };
}

export function collectClassSets(
  code: string,
  filename: string,
  options: Pick<JsTransformOptions, "classifier" | "config">,
): string[][] {
  const sets: string[][] = [];
  for (const target of findClassTargets(code, filename, options.config) ?? []) {
    if (target.kind !== "range") continue;
    const classes = new Set<string>();
    for (const t of tokenize(code, target, options.classifier)) {
      if (t.tailwind) classes.add(t.value);
    }
    if (classes.size > 1) sets.push([...classes].toSorted());
  }
  return sets;
}

export function findClassTargets(
  code: string,
  filename: string,
  config: JsTransformOptions["config"],
): ClassTarget[] | null {
  const parsed = parseSync(filename, code);
  if (parsed.errors.some((e) => e.severity === "Error")) return null;

  const targets: ClassTarget[] = [];
  const seen = new Set<number>();
  const attributes = new Set(config.attributes);
  const clsxFunctions = new Set(config.functions);
  const constants = new Map<string, Node>();
  const pendingIdentifiers: { name: string; lookup: boolean }[] = [];

  const isClassAttribute = (attr: string) => attributes.has(attr) || attr.endsWith("ClassName");

  const addRange = (start: number, end: number, openStart: boolean, openEnd: boolean) => {
    targets.push({ kind: "range", start, end, openStart, openEnd });
  };

  const visitString = (node: Node, openStart = false, openEnd = false) => {
    if (seen.has(node.start)) return;
    seen.add(node.start);
    addRange(node.start + 1, node.end - 1, openStart, openEnd);
  };

  const visitTemplate = (node: Node, openStart = false, openEnd = false) => {
    if (seen.has(node.start)) return;
    seen.add(node.start);
    const quasis = node.quasis as Node[];
    quasis.forEach((quasi, i) => {
      const lead = code[quasi.start] === "`" || code[quasi.start] === "}" ? 1 : 0;
      const start = quasi.start + lead;
      const raw: string = quasi.value.raw;
      const first = i === 0;
      const last = i === quasis.length - 1;
      addRange(
        start,
        start + raw.length,
        first ? openStart : !WS_RE.test(raw[0] ?? " "),
        last ? openEnd : !WS_RE.test(raw.at(-1) ?? " "),
      );
    });
    for (const expr of node.expressions as Node[]) visitClassExpression(expr);
  };

  function visitClassExpression(
    input: Node | null | undefined,
    openStart = false,
    openEnd = false,
  ) {
    const node = unwrap(input);
    if (!node) return;
    switch (node.type) {
      case "Literal":
        if (typeof node.value === "string") visitString(node, openStart, openEnd);
        return;
      case "TemplateLiteral":
        visitTemplate(node, openStart, openEnd);
        return;
      case "TaggedTemplateExpression":
        visitTemplate(node.quasi, openStart, openEnd);
        return;
      case "ConditionalExpression":
        visitClassExpression(node.consequent, openStart, openEnd);
        visitClassExpression(node.alternate, openStart, openEnd);
        return;
      case "LogicalExpression":
        if (node.operator !== "&&") visitClassExpression(node.left, openStart, openEnd);
        visitClassExpression(node.right, openStart, openEnd);
        return;
      case "BinaryExpression":
        if (node.operator === "+") {
          visitClassExpression(node.left, openStart, true);
          visitClassExpression(node.right, true, openEnd);
        }
        return;
      case "ArrayExpression":
        for (const el of node.elements as (Node | null)[]) {
          visitClassExpression(el?.type === "SpreadElement" ? el.argument : el);
        }
        return;
      case "ObjectExpression":
        for (const prop of node.properties as Node[]) {
          if (prop.type === "SpreadElement") visitClassExpression(prop.argument);
          else visitObjectKey(prop);
        }
        return;
      case "CallExpression":
        visitCall(node);
        return;
      case "Identifier":
        pendingIdentifiers.push({ name: node.name, lookup: false });
        return;
      case "MemberExpression": {
        let base = unwrap(node);
        while (base?.type === "MemberExpression") base = unwrap(base.object);
        if (base?.type === "Identifier") pendingIdentifiers.push({ name: base.name, lookup: true });
        return;
      }
      case "JSXExpressionContainer":
        visitClassExpression(node.expression);
        return;
    }
  }

  function visitLookupTable(input: Node | null | undefined) {
    const node = unwrap(input);
    if (node?.type === "ObjectExpression") {
      for (const prop of node.properties as Node[]) {
        if (prop.type === "Property") visitLookupTable(prop.value);
      }
    } else if (node?.type === "ArrayExpression") {
      for (const el of node.elements as (Node | null)[]) visitLookupTable(el);
    } else if (node?.type === "Identifier") {
      pendingIdentifiers.push({ name: node.name, lookup: true });
    } else {
      visitClassExpression(node);
    }
  }

  function visitObjectKey(prop: Node) {
    if (prop.type !== "Property" || prop.computed) return;
    const key = prop.key as Node;
    if (key.type === "Literal" && typeof key.value === "string") {
      visitString(key);
    } else if (key.type === "Identifier" && !seen.has(key.start)) {
      seen.add(key.start);
      targets.push({
        kind: "key",
        start: key.start,
        end: key.end,
        name: key.name,
        shorthand: Boolean(prop.shorthand),
      });
    }
  }

  function visitClassProperties(input: Node | null | undefined) {
    const node = unwrap(input);
    if (node?.type !== "ObjectExpression") return;
    for (const prop of node.properties as Node[]) {
      if (prop.type === "Property" && CLASS_KEYS.has(propertyKeyName(prop) ?? "")) {
        visitSlotValue(prop.value);
      }
    }
  }

  function visitSlotValue(input: Node | null | undefined) {
    const node = unwrap(input);
    if (node?.type === "ObjectExpression") {
      for (const prop of node.properties as Node[]) {
        if (prop.type === "Property") visitClassExpression(prop.value);
      }
    } else {
      visitClassExpression(node);
    }
  }

  function visitVariants(input: Node | null | undefined) {
    const node = unwrap(input);
    if (node?.type !== "ObjectExpression") return;
    for (const variant of node.properties as Node[]) {
      const choices = variant.type === "Property" ? unwrap(variant.value) : null;
      if (choices?.type !== "ObjectExpression") continue;
      for (const option of choices.properties as Node[]) {
        if (option.type === "Property") visitSlotValue(option.value);
      }
    }
  }

  function visitArrayOf(input: Node | null | undefined, fn: (node: Node) => void) {
    const node = unwrap(input);
    if (node?.type !== "ArrayExpression") return;
    for (const el of node.elements as (Node | null)[]) if (el) fn(el);
  }

  function visitVariantConfig(input: Node | null | undefined, kind: "cva" | "tv") {
    const node = unwrap(input);
    if (node?.type !== "ObjectExpression") return;
    for (const prop of node.properties as Node[]) {
      if (prop.type !== "Property") continue;
      switch (propertyKeyName(prop)) {
        case "base":
          if (kind === "tv") visitClassExpression(prop.value);
          break;
        case "slots":
          visitSlotValue(prop.value);
          break;
        case "variants":
          visitVariants(prop.value);
          break;
        case "compoundVariants":
        case "compoundSlots":
          visitArrayOf(prop.value, visitClassProperties);
          break;
      }
    }
  }

  function visitCall(node: Node) {
    const fn = calleeName(node.callee);
    if (!fn) return;
    const args = node.arguments as Node[];
    if (clsxFunctions.has(fn)) {
      for (const arg of args) {
        visitClassExpression(arg.type === "SpreadElement" ? arg.argument : arg);
      }
    } else if (CVA_FUNCTIONS.has(fn)) {
      visitClassExpression(args[0]);
      visitVariantConfig(args[1], "cva");
    } else if (TV_FUNCTIONS.has(fn)) {
      visitVariantConfig(args[0], "tv");
    }
  }

  const visitor = new Visitor({
    VariableDeclarator(node: Node) {
      if (node.id.type === "Identifier" && node.init) constants.set(node.id.name, node.init);
    },
    JSXAttribute(node: Node) {
      const attr = node.name.type === "JSXIdentifier" ? node.name.name : undefined;
      if (!attr || !isClassAttribute(attr) || !node.value) return;
      visitClassExpression(node.value);
    },
    Property(node: Node) {
      const key = propertyKeyName(node);
      if (key && isClassAttribute(key) && !node.method && node.kind === "init") {
        visitClassExpression(node.value);
      }
    },
    CallExpression(node: Node) {
      visitCall(node);
    },
    TaggedTemplateExpression(node: Node) {
      const fn = calleeName(node.tag);
      if (fn && clsxFunctions.has(fn)) visitTemplate(node.quasi);
    },
  } as never);
  visitor.visit(parsed.program);

  const resolved = new Set<string>();
  while (pendingIdentifiers.length > 0) {
    const { name: id, lookup } = pendingIdentifiers.pop()!;
    const key = `${lookup}:${id}`;
    if (resolved.has(key)) continue;
    resolved.add(key);
    const init = constants.get(id);
    if (init) (lookup ? visitLookupTable : visitClassExpression)(init);
  }

  return targets;
}
