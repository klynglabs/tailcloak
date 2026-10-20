import { describe, expect, test } from "bun:test";
import { mkdirSync, realpathSync, symlinkSync } from "node:fs";
import { join } from "node:path";

import { resolveConfig } from "../src/config.ts";
import {
  findTailwindEntries,
  getClassifier,
  isTailwindStylesheet,
  tailwindEntries,
} from "../src/tailwind.ts";
import { SEED, tree } from "./helpers.ts";

const UI_PACKAGE = JSON.stringify({
  name: "@acme/ui",
  exports: {
    ".": "./src/index.ts",
    "./globals.css": "./src/globals.css",
    "./themes/*.css": { style: "./src/themes/*.css", default: "./dist/themes/*.js" },
  },
});

function monorepo(files: Record<string, string>) {
  const dir = tree({
    "package.json": `{ "workspaces": ["apps/*", "packages/*"] }`,
    "packages/ui/package.json": UI_PACKAGE,
    "packages/ui/src/globals.css": `@import "tailwindcss";`,
    "packages/ui/src/themes/dark.css": `@import "tailwindcss";`,
    "packages/ui/src/plain.css": `.card { color: red; }`,
    "apps/web/package.json": `{ "name": "web" }`,
    ...files,
  });
  mkdirSync(join(dir, "apps/web/node_modules/@acme"), { recursive: true });
  symlinkSync(join(dir, "packages/ui"), join(dir, "apps/web/node_modules/@acme/ui"), "junction");
  const real = (path: string) => realpathSync(join(dir, path));
  return { web: join(dir, "apps/web"), real };
}

describe("findTailwindEntries", () => {
  test("finds a stylesheet imported from a workspace package", () => {
    const { web, real } = monorepo({
      "apps/web/src/app/layout.tsx": `import "@acme/ui/globals.css";\nimport { Button } from "@acme/ui";`,
    });
    expect(findTailwindEntries(web)).toEqual([real("packages/ui/src/globals.css")]);
  });

  test("resolves export patterns with the style condition", () => {
    const { web, real } = monorepo({
      "apps/web/src/main.tsx": `import styles from '@acme/ui/themes/dark.css';`,
    });
    expect(findTailwindEntries(web)).toEqual([real("packages/ui/src/themes/dark.css")]);
  });

  test("skips stylesheets that don't import Tailwind, and CSS modules", () => {
    const { web } = monorepo({
      "apps/web/src/main.tsx": `import "../../../packages/ui/src/plain.css";\nimport s from "./a.module.css";`,
      "apps/web/src/a.module.css": `@import "tailwindcss";`,
    });
    expect(findTailwindEntries(web)).toEqual([]);
  });

  test("lists a stylesheet in the app once, whether found or imported", () => {
    const { web } = monorepo({
      "apps/web/app/layout.tsx": `import "./globals.css";`,
      "apps/web/app/globals.css": `@import "tailwindcss";`,
    });
    expect(findTailwindEntries(web)).toEqual([join(web, "app/globals.css")]);
  });

  test("finds an app stylesheet that imports Tailwind through another stylesheet", () => {
    const { web } = monorepo({
      "apps/web/app/layout.tsx": `import "./globals.css";`,
      "apps/web/app/globals.css": `@import "@acme/ui/globals.css";
.extra { color: red; }`,
    });
    expect(findTailwindEntries(web)).toEqual([join(web, "app/globals.css")]);
  });

  test("lists only the outermost stylesheet of an @import chain", () => {
    const { web } = monorepo({
      "apps/web/app/globals.css": `@import "theme.css";`,
      "apps/web/app/theme.css": `@import url("./base.css") layer(base);`,
      "apps/web/app/base.css": `@import "tailwindcss";
@import "./theme.css";`,
    });
    expect(findTailwindEntries(web)).toEqual([join(web, "app/globals.css")]);
  });

  test("follows imports with a query", () => {
    const { web, real } = monorepo({
      "apps/web/src/main.tsx": `import href from "@acme/ui/globals.css?url";`,
    });
    expect(findTailwindEntries(web)).toEqual([real("packages/ui/src/globals.css")]);
  });

  test("a build without any Tailwind stylesheet fails", async () => {
    const { web } = monorepo({ "apps/web/src/main.tsx": `export {};` });
    const config = resolveConfig({ root: web, enabled: true, seed: SEED });
    await expect(getClassifier(config)).rejects.toThrow("No Tailwind stylesheet found");
  });

  test("a missing css path fails without a stack trace", () => {
    const { web } = monorepo({});
    const config = resolveConfig({ root: web, enabled: true, seed: SEED, css: "app/nope.css" });
    expect(() => tailwindEntries(config)).toThrow(`"css" lists a stylesheet that doesn't exist`);
    try {
      tailwindEntries(config);
    } catch (error) {
      expect((error as Error).stack).not.toContain("    at ");
    }
  });
});

describe("isTailwindStylesheet", () => {
  test("checks the given source, following its imports", () => {
    const { web } = monorepo({ "apps/web/app/globals.css": "" });
    const file = join(web, "app/globals.css");
    expect(isTailwindStylesheet(file, `@import "@acme/ui/globals.css";`)).toBe(true);
    expect(isTailwindStylesheet(file, `@import "tailwindcss" source(none);`)).toBe(true);
    expect(isTailwindStylesheet(file, `@import "@acme/ui/src/plain.css";`)).toBe(false);
    expect(isTailwindStylesheet(file, `@import "./missing.css";`)).toBe(false);
    expect(isTailwindStylesheet(join(web, "app/a.module.css"), `@import "tailwindcss";`)).toBe(
      false,
    );
  });
});
