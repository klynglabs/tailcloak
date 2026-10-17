import { describe, expect, test } from "bun:test";

import { deserializeConfig, resolveConfig, serializeConfig } from "../src/config.ts";

describe("resolveConfig", () => {
  test("applies defaults", () => {
    const config = resolveConfig({ enabled: true });
    expect(config.prefix).toBe("");
    expect(config.length).toBe(6);
    expect(config.css).toBeNull();
    expect(config.attributes).toEqual(["class", "className"]);
  });

  test("rejects invalid prefixes and lengths", () => {
    expect(() => resolveConfig({ prefix: "1x" })).toThrow(/prefix/);
    expect(() => resolveConfig({ prefix: "a.b" })).toThrow(/prefix/);
    expect(() => resolveConfig({ length: 2 })).toThrow(/length/);
    expect(resolveConfig({ prefix: "tc_" }).prefix).toBe("tc_");
    expect(resolveConfig({ prefix: "-x" }).prefix).toBe("-x");
  });

  test("normalizes css to an array", () => {
    expect(resolveConfig({ css: "app/globals.css" }).css).toEqual(["app/globals.css"]);
  });
});

describe("serializeConfig", () => {
  test("round-trips RegExps in exclude through JSON", () => {
    const raw = JSON.parse(JSON.stringify(serializeConfig({ exclude: ["dark", /^js-/i] })));
    const [str, re] = deserializeConfig(raw).exclude!;
    expect(str).toBe("dark");
    expect(re).toBeInstanceOf(RegExp);
    expect((re as RegExp).test("JS-foo")).toBe(true);
  });
});
