import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  deserializeConfig,
  findConfigFile,
  loadConfig,
  resolveConfig,
  serializeConfig,
} from "../src/config.ts";

function tree(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "tailcloak-"));
  for (const [path, content] of Object.entries(files)) {
    const file = join(dir, path);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, content);
  }
  return dir;
}

describe("loadConfig", () => {
  test("finds a config file in a parent folder", async () => {
    const dir = tree({
      "package.json": `{ "workspaces": ["apps/*"] }`,
      "tailcloak.config.mjs": `export default { prefix: "tc_" };`,
      "apps/web/package.json": `{}`,
    });
    const root = join(dir, "apps/web");
    const config = await loadConfig({}, { root });
    expect(config.prefix).toBe("tc_");
    expect(config.root).toBe(root);
  });

  test("prefers the nearest config file", () => {
    const dir = tree({
      "pnpm-workspace.yaml": "",
      "tailcloak.config.mjs": `export default {};`,
      "apps/web/tailcloak.config.ts": `export default {};`,
    });
    expect(findConfigFile(join(dir, "apps/web"))).toBe(join(dir, "apps/web/tailcloak.config.ts"));
  });

  test("stops at the repository root", () => {
    const dir = tree({
      "tailcloak.config.mjs": `export default {};`,
      "repo/.git/HEAD": "",
      "repo/apps/web/package.json": `{}`,
    });
    expect(findConfigFile(join(dir, "repo/apps/web"))).toBeUndefined();
  });
});

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
