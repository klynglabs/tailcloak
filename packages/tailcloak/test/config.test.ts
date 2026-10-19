import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  deserializeConfig,
  findConfigFiles,
  loadConfig,
  resolveConfig,
  serializeConfig,
} from "../src/config.ts";
import { createNamer } from "../src/hash.ts";
import { init } from "../src/init.ts";
import { SEED } from "./helpers.ts";

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
  test("stacks config files from the workspace root down to the app", async () => {
    const dir = tree({
      "package.json": `{ "workspaces": ["apps/*"] }`,
      "tailcloak.config.mjs": `export default { prefix: "tc_", length: 8 };`,
      "apps/web/package.json": `{ "name": "web" }`,
      "apps/web/tailcloak.config.ts": `export default { length: 10, manifest: undefined };`,
    });
    const root = join(dir, "apps/web");
    const config = await loadConfig({ length: 12 }, { root });
    expect(config.prefix).toBe("tc_");
    expect(config.length).toBe(12);
    expect((await loadConfig({}, { root })).length).toBe(10);
    expect(config.root).toBe(root);
  });

  test("stops at the repository root", () => {
    const dir = tree({
      "tailcloak.config.mjs": `export default {};`,
      "repo/.git/HEAD": "",
      "repo/tailcloak.config.mjs": `export default {};`,
      "repo/apps/web/package.json": `{}`,
    });
    expect(findConfigFiles(join(dir, "repo/apps/web"))).toEqual([
      join(dir, "repo/tailcloak.config.mjs"),
    ]);
  });

  test("mixes the app's package name into the seed", () => {
    const dir = tree({
      "apps/web/package.json": `{ "name": "web" }`,
      "apps/docs/package.json": `{ "name": "docs" }`,
    });
    const web = createNamer(resolveConfig({ root: join(dir, "apps/web"), seed: "s" }));
    const docs = createNamer(resolveConfig({ root: join(dir, "apps/docs"), seed: "s" }));
    const webAgain = createNamer(resolveConfig({ root: join(dir, "apps/web/src"), seed: "s" }));
    expect(web("flex")).not.toBe(docs("flex"));
    expect(web("flex")).toBe(webAgain("flex"));
  });
});

describe("init", () => {
  test("writes a seeded config at the workspace root once", async () => {
    const dir = tree({ "pnpm-workspace.yaml": "", "apps/web/package.json": `{}` });
    const web = join(dir, "apps/web");
    expect(init(web)).toContain("Created");
    const config = await loadConfig({ enabled: true }, { root: web });
    expect(config.seed.split("\u0000")[0]).toMatch(/^[0-9a-f]{32}$/);
    expect(init(web)).toContain("already sets a seed");
  });

  test("prints a seed line for an existing config without one", () => {
    const dir = tree({
      ".git/HEAD": "",
      "tailcloak.config.ts": `export default { prefix: "tc_" };`,
    });
    expect(init(dir)).toMatch(/Add this line[\s\S]*seed: "[0-9a-f]{32}"/);
  });
});

describe("resolveConfig", () => {
  test("applies defaults", () => {
    const config = resolveConfig({ enabled: true, seed: SEED });
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

  test("requires a seed of 16+ characters when enabled", () => {
    expect(() => resolveConfig({ enabled: true })).toThrow(
      /No "seed" set[\s\S]*seed: "[0-9a-f]{32}"/,
    );
    expect(() => resolveConfig({ enabled: true, seed: "web" })).toThrow(/at least 16/);
    expect(() => resolveConfig({ enabled: false })).not.toThrow();
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
