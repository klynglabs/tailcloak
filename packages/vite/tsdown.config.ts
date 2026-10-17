import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: "esm",
  platform: "node",
  target: "node20.19",
  dts: true,
  exports: true,
  publint: true,
});
