import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import { withTailcloak } from "../src/index.ts";

const FIXTURE = join(import.meta.dir, "../../tailcloak/test/fixtures/app");
const context = { defaultConfig: {} };

describe("withTailcloak", () => {
  test("adds JS and CSS rules for Turbopack and webpack", async () => {
    const config = await withTailcloak(
      { reactStrictMode: true, turbopack: { rules: { "*.svg": { loaders: ["svgr"] } } } },
      { root: FIXTURE, enabled: true },
    )("phase-production-build", context);

    expect(config.reactStrictMode).toBe(true);
    const rules = config.turbopack!.rules as Record<string, any>;
    expect(rules["*.svg"]).toEqual({ loaders: ["svgr"] });
    expect(rules["*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}"].loaders[0].loader).toBe(
      "@tailcloak/next/loader",
    );
    expect(rules["*.css"].loaders[0].loader).toBe("@tailcloak/next/css-loader");
    const options = rules["*.css"].loaders[0].options;
    expect(JSON.parse(JSON.stringify(options))).toEqual(options);

    const webpack = config.webpack!({ module: { rules: [] } }, {} as never) as any;
    expect(webpack.module.rules.map((r: any) => r.use[0].loader)).toEqual([
      "@tailcloak/next/loader",
      "@tailcloak/next/css-loader",
    ]);
  });

  test("returns the config untouched when disabled", async () => {
    const base = { reactStrictMode: true };
    const config = await withTailcloak(base, { root: FIXTURE, enabled: false })("x", context);
    expect(config).toBe(base);
  });

  test("calls the user's webpack function", async () => {
    let called = false;
    const config = await withTailcloak(
      () => ({
        webpack: (c: any) => {
          called = true;
          return c;
        },
      }),
      { root: FIXTURE, enabled: true },
    )("x", context);
    config.webpack!({}, {} as never);
    expect(called).toBe(true);
  });
});
