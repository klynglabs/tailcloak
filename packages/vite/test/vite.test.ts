import { describe, expect, test } from "bun:test";
import { join } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { build, type Rolldown } from "vite";

import tailcloak from "../src/index.ts";

const root = join(import.meta.dir, "fixture");

async function run(options: Parameters<typeof tailcloak>[0] = {}) {
  const output = (await build({
    root,
    logLevel: "silent",
    configFile: false,
    build: { write: false, minify: false },
    plugins: [tailwindcss(), tailcloak({ prefix: "tc_", ...options })],
  })) as Rolldown.RolldownOutput;
  const files = output.output;
  const js = files.flatMap((f) => (f.type === "chunk" ? [f.code] : [])).join("\n");
  const css = files
    .flatMap((f) => (f.type === "asset" && f.fileName.endsWith(".css") ? [String(f.source)] : []))
    .join("\n");
  return { js, css };
}

describe("@tailcloak/vite", () => {
  test("combines class strings in JS and defines them in CSS", async () => {
    const { js, css } = await run();
    const combined = js.match(/"(tc_\w+) custom"/)?.[1];
    expect(combined).toBeDefined();
    expect(css).toContain(`.${combined}`);
    const single = js.match(/cn\("(tc_\w+)"\)/)?.[1];
    expect(single).toBeDefined();
    expect(css).toContain(`.${single}`);
    expect(css).not.toMatch(/\.flex\s*\{/);
  });

  test("does nothing when disabled", async () => {
    const { js, css } = await run({ enabled: false });
    expect(js).toContain(`"flex p-4 custom text-sm"`);
    expect(css).toMatch(/\.flex\s*\{/);
  });
});
