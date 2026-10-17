import { defineConfig } from "tsdown";

export default defineConfig({
  entry: { index: "src/index.ts", loader: "src/loader.ts", "css-loader": "src/css-loader.ts" },
  format: ["esm", "cjs"],
  platform: "node",
  target: "node20.19",
  dts: true,
  exports: true,
  publint: true,
});
