import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["typescript", "unicorn", "import", "oxc", "node"],
  categories: {
    correctness: "error",
    suspicious: "warn",
    perf: "warn",
  },
  env: { node: true, es2024: true },
  ignorePatterns: ["**/dist/**", "**/.next/**", "**/next-env.d.ts"],
  rules: {
    "typescript/no-explicit-any": "off",
    "typescript/no-non-null-assertion": "off",
    "import/no-unassigned-import": "off",
    "no-underscore-dangle": "off",
  },
  overrides: [
    {
      files: ["**/src/*loader.ts"],
      rules: { "oxc/no-this-in-exported-function": "off" },
    },
    {
      files: ["**/test/**", "**/*.test.ts"],
      rules: { "typescript/no-explicit-any": "off" },
    },
  ],
});
