import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import postcss from "postcss";

import { resolveConfig } from "../src/config.ts";
import { combinedName, createNamer } from "../src/hash.ts";
import { obfuscateCss, obfuscateJs } from "../src/obfuscate.ts";
import { FIXTURE } from "./helpers.ts";

const compiled = String.raw`
.flex { color: red }
@layer utilities {
  .flex { display: flex }
  .p-4 { padding: 1rem }
  .text-sm { font-size: .875rem }
  .hover\:bg-red-500:hover { background: red }
  .md\:grid { display: grid }
}`;

async function run(options = {}) {
  const config = resolveConfig({ root: FIXTURE, enabled: true, ...options });
  const root = postcss.parse(compiled);
  const { dependencies } = await obfuscateCss(root, config);
  return { css: root.toString(), config, dependencies, n: createNamer(config) };
}

describe("obfuscateCss", () => {
  test("renames utilities only inside @layer utilities", async () => {
    const { css, n } = await run({ combine: false });
    expect(css).toContain(".flex { color: red }");
    expect(css).toContain(`.${n("flex")} { display: flex }`);
    expect(css).toContain(`.${n("hover:bg-red-500")}:hover`);
  });

  test("combined names match through :is() without moving rules", async () => {
    const { css, n } = await run();
    const fp = combinedName(n, ["flex", "p-4"]);
    const th = combinedName(n, ["hover:bg-red-500", "text-sm"]);
    expect(css).toContain(`:is(.${n("flex")},.${fp}) { display: flex }`);
    expect(css).toContain(`:is(.${n("p-4")},.${fp}) { padding: 1rem }`);
    expect(css).toContain(`:is(.${n("hover:bg-red-500")},.${th}):hover`);
    expect(css).toContain(`.${n("md:grid")} { display: grid }`);
  });

  test("CSS and JS agree on combined names, and sources are dependencies", async () => {
    const { css, config, dependencies } = await run({ prefix: "tc_" });
    const file = join(FIXTURE, "page.tsx");
    const code = await Bun.file(file).text();
    const js = (await obfuscateJs(code, file, config)).result!.code;
    const used = [...js.matchAll(/tc_[A-Za-z0-9]+/g)].map((m) => m[0]);
    expect(used).toHaveLength(3);
    for (const cls of used) expect(css).toContain(`.${cls}`);
    expect(js).toContain(" custom");
    expect(dependencies).toContain(file);
  });

  test("files outside the project are never combined", async () => {
    const config = resolveConfig({ root: FIXTURE, enabled: true });
    const n = createNamer(config);
    const outside = join(FIXTURE, "node_modules/lib/index.js");
    const js = (await obfuscateJs(`cn("flex p-4")`, outside, config)).result!.code;
    expect(js).toBe(`cn("${n("flex")} ${n("p-4")}")`);
  });

  test("sources outside the root are combined too", async () => {
    const shared = join(FIXTURE, "../shared/card.tsx");
    const code = await Bun.file(shared).text();
    const { css, config, n } = await run({ sources: ["../shared"] });
    const combined = combinedName(n, ["md:grid", "p-4"]);
    expect(css).toContain(`:is(.${n("md:grid")},.${combined})`);
    expect((await obfuscateJs(code, shared, config)).result!.code).toContain(`"${combined}"`);

    const plain = resolveConfig({ root: FIXTURE, enabled: true });
    const atomic = (await obfuscateJs(code, shared, plain)).result!.code;
    expect(atomic).toContain(`"${n("md:grid")} ${n("p-4")}"`);
  });

  test("writes a manifest of every name", async () => {
    const manifest = join(mkdtempSync(join(tmpdir(), "tailcloak-")), "out/manifest.json");
    const { n } = await run({ manifest });
    const map = JSON.parse(readFileSync(manifest, "utf8"));
    expect(map[n("flex")]).toBe("flex");
    expect(map[n("hover:bg-red-500")]).toBe("hover:bg-red-500");
    expect(map[combinedName(n, ["flex", "p-4"])]).toBe("flex p-4");
  });
});
