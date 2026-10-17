import { beforeAll, describe, expect, test } from "bun:test";

import { combinedName } from "../src/hash.ts";
import { collectClassSets, transformJs } from "../src/js.ts";
import { setup } from "./helpers.ts";

let ctx: Awaited<ReturnType<typeof setup>>;
let n: (cls: string) => string;
beforeAll(async () => {
  ctx = await setup();
  n = ctx.name;
});

const run = (code: string, file = "x.tsx") => transformJs(code, file, ctx)?.code ?? code;

describe("transformJs", () => {
  test("className string attributes", () => {
    expect(run(`<div className="flex p-4 custom" />`)).toBe(
      `<div className="${n("flex")} ${n("p-4")} custom" />`,
    );
  });

  test("variants, arbitrary values and custom @utility", () => {
    expect(run(`<a className="hover:bg-red-500 sm:p-[3px] btn" />`)).toBe(
      `<a className="${n("hover:bg-red-500")} ${n("sm:p-[3px]")} ${n("btn")}" />`,
    );
  });

  test("group/peer markers", () => {
    expect(run(`<div className="group peer/x"><p className="group-hover:underline" /></div>`)).toBe(
      `<div className="${n("group")} ${n("peer/x")}"><p className="${n("group-hover:underline")}" /></div>`,
    );
  });

  test("leaves non-Tailwind classes and unrelated strings alone", () => {
    const code = `const label = "flex"; <div className="not-tailwind" title="flex" />`;
    expect(transformJs(code, "x.tsx", ctx)).toBeNull();
  });

  test("cn/clsx arguments, conditionals and object keys", () => {
    const out = run(`cn("flex", ok && "p-4", ok ? "text-sm" : "md:grid", { "p-4": a, flex: b })`);
    expect(out).toBe(
      `cn("${n("flex")}", ok && "${n("p-4")}", ok ? "${n("text-sm")}" : "${n("md:grid")}", { "${n("p-4")}": a, "${n("flex")}": b })`,
    );
  });

  test("object shorthand keys keep their value", () => {
    expect(run(`clsx({ flex })`)).toBe(`clsx({ "${n("flex")}": flex })`);
  });

  test("template literals skip partial tokens at interpolations", () => {
    const out = run("<div className={`flex bg-${color} p-4 ${x}`} />");
    expect(out).toBe("<div className={`" + n("flex") + " bg-${color} " + n("p-4") + " ${x}`} />");
  });

  test("string concatenation skips partial tokens", () => {
    expect(run(`<div className={"flex text-" + size} />`)).toBe(
      `<div className={"${n("flex")} text-" + size} />`,
    );
  });

  test("same-file constants", () => {
    expect(run(`const base = "flex p-4"; <div className={base} />`)).toBe(
      `const base = "${n("flex")} ${n("p-4")}"; <div className={base} />`,
    );
  });

  test("lookup maps read by key", () => {
    const out = run(`const sizes = { sm: "text-sm", lg: { pad: "p-4" } } as const;
      const list = ["flex"];
      <div className={cn(sizes[size], sizes.lg.pad, list[0])} />`);
    expect(out).toContain(`sm: "${n("text-sm")}"`);
    expect(out).toContain(`pad: "${n("p-4")}"`);
    expect(out).toContain(`["${n("flex")}"]`);
    expect(out).toContain("sm:");
  });

  test("cva: base, variants and compoundVariants, but not variant keys", () => {
    const out = run(`cva("flex", {
      variants: { size: { sm: "text-sm", lg: ["p-4"] } },
      compoundVariants: [{ size: "sm", class: "md:grid" }],
      defaultVariants: { size: "sm" },
    })`);
    expect(out).toContain(`cva("${n("flex")}"`);
    expect(out).toContain(`sm: "${n("text-sm")}"`);
    expect(out).toContain(`lg: ["${n("p-4")}"]`);
    expect(out).toContain(`{ size: "sm", class: "${n("md:grid")}" }`);
    expect(out).toContain(`defaultVariants: { size: "sm" }`);
  });

  test("tv: base, slots and slot variants", () => {
    const out = run(`tv({
      base: "flex",
      slots: { icon: "p-4" },
      variants: { size: { sm: { icon: "text-sm" } } },
    })`);
    expect(out).toContain(`base: "${n("flex")}"`);
    expect(out).toContain(`icon: "${n("p-4")}"`);
    expect(out).toContain(`icon: "${n("text-sm")}"`);
  });

  test("tagged templates and *ClassName props", () => {
    expect(run('const a = tw`flex p-4`; <X iconClassName="text-sm" />')).toBe(
      "const a = tw`" +
        n("flex") +
        " " +
        n("p-4") +
        '`; <X iconClassName="' +
        n("text-sm") +
        '" />',
    );
  });

  test("offsets stay correct after non-ASCII text", () => {
    expect(run(`const t = "héllo 👋 世界"; <div className="flex">👋</div>`)).toBe(
      `const t = "héllo 👋 世界"; <div className="${n("flex")}">👋</div>`,
    );
  });

  test("respects exclude", async () => {
    const excluded = await setup({ exclude: ["flex", /^p-/] });
    const out = transformJs(`<div className="flex p-4 text-sm" />`, "x.tsx", excluded)?.code;
    expect(out).toBe(`<div className="flex p-4 ${excluded.name("text-sm")}" />`);
  });

  test("emits source maps", () => {
    const result = transformJs(`<div className="flex" />`, "x.tsx", { ...ctx, sourceMap: true });
    expect(result?.map?.mappings).toBeTruthy();
  });

  test("ignores files that fail to parse", () => {
    expect(transformJs(`<div className="flex"`, "x.tsx", ctx)).toBeNull();
  });
});

describe("transformJs with combine", () => {
  const c = (classes: string[]) => combinedName(n, classes);
  const runCombined = (code: string) =>
    transformJs(code, "x.tsx", { ...ctx, combine: true })?.code ?? code;

  test("collapses a class string into one name, keeping non-Tailwind classes", () => {
    expect(runCombined(`<div className="p-4 custom flex" />`)).toBe(
      `<div className="${c(["flex", "p-4"])} custom" />`,
    );
  });

  test("order and duplicates do not change the name", () => {
    expect(c(["p-4", "flex", "flex"])).toBe(c(["flex", "p-4"]));
  });

  test("a single class keeps its own name", () => {
    expect(runCombined(`<div className="flex" />`)).toBe(`<div className="${n("flex")}" />`);
  });

  test("template literals combine each static part, skipping partial tokens", () => {
    expect(runCombined("<div className={`flex p-4 ${x} text-sm b${y}`} />")).toBe(
      `<div className={\`${c(["flex", "p-4"])} \${x} ${n("text-sm")} b\${y}\`} />`,
    );
  });

  test("object keys stay atomic", () => {
    expect(runCombined(`cn({ "flex p-4": a })`)).toBe(`cn({ "${c(["flex", "p-4"])}": a })`);
    expect(runCombined(`cn({ flex: a })`)).toBe(`cn({ "${n("flex")}": a })`);
  });

  test("collectClassSets lists the multi-class strings", () => {
    const sets = collectClassSets(
      `<div className="p-4 flex custom"><p className="flex" /></div>`,
      "x.tsx",
      ctx,
    );
    expect(sets).toEqual([["flex", "p-4"]]);
  });
});
