import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import postcss from "postcss";
import { createNamer, obfuscateJs, resolveConfig, type TailcloakConfig } from "tailcloak";

import tailcloak from "../src/index.ts";

const FIXTURE = join(import.meta.dir, "../../tailcloak/test/fixtures/app");
const file = join(FIXTURE, "styles.css");
const source = readFileSync(file, "utf8");

async function build(options: TailcloakConfig = {}) {
  const plugin = tailcloak({
    root: FIXTURE,
    enabled: true,
    tailwind: { base: FIXTURE },
    ...options,
  });
  const result = await postcss([plugin]).process(source, { from: file });
  return result;
}

describe("@tailcloak/postcss", () => {
  test("obfuscates utilities and keeps everything else", async () => {
    const n = createNamer(resolveConfig({}));
    const { css } = await build({ combine: false });
    expect(css).not.toMatch(/\.flex\s*\{/);
    expect(css).toContain(`.${n("flex")}`);
    expect(css).toContain(`.${n("hover:bg-red-500")}:hover`);
    expect(css).toContain(`.${n("btn")}`);
    expect(css).toContain(".not-tailwind");
  });

  test("CSS and JS agree on every name, including the prefix", async () => {
    const options = { root: FIXTURE, enabled: true, prefix: "tc_" };
    const { css, messages } = await build(options);
    const page = join(FIXTURE, "page.tsx");
    const code = readFileSync(page, "utf8");
    const js = (await obfuscateJs(code, page, resolveConfig(options))).result!.code;
    const used = [...js.matchAll(/tc_[A-Za-z0-9]+/g)].map((m) => m[0]);
    expect(used.length).toBeGreaterThan(0);
    for (const cls of used) expect(css).toContain(`.${cls}`);
    expect(messages).toContainEqual(expect.objectContaining({ type: "dependency", file: page }));
  });

  test("is a no-op when disabled", async () => {
    expect((await build({ enabled: false })).css).toMatch(/\.flex\s*\{/);
  });
});
