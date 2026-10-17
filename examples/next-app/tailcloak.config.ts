import { defineConfig } from "@tailcloak/next";

export default defineConfig({
  prefix: "tc_",
  sources: ["../ui/src"],
  manifest: ".next/tailcloak-manifest.json",
});
