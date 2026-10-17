import postcss from "postcss";
import {
  loadConfig,
  obfuscateCss,
  obfuscateJs,
  type ResolvedConfig,
  type TailcloakConfig,
} from "tailcloak";
import type { Plugin } from "vite";

export { defineConfig, type TailcloakConfig } from "tailcloak";

const SOURCE_RE = /\.[cm]?[jt]sx?$/;
const CSS_RE = /\.css$/;
const MODULE_CSS_RE = /\.module\.css$/;
const UTILITIES_RE = /@layer\s+utilities\s*\{/;

const cleanId = (id: string) => id.replace(/[?#].*$/, "");

export default function tailcloak(options: TailcloakConfig = {}): Plugin[] {
  let config!: Promise<ResolvedConfig>;

  return [
    {
      name: "tailcloak:js",
      enforce: "pre",
      configResolved(resolved) {
        config = loadConfig(options, {
          root: resolved.root,
          enabled: resolved.command === "build",
        });
      },
      transform: {
        filter: { id: { include: SOURCE_RE, exclude: /\/node_modules\// } },
        async handler(code, id) {
          if (id.startsWith("\0")) return;
          const resolved = await config;
          if (!resolved.enabled) return;
          const file = cleanId(id);
          const { result, dependencies } = await obfuscateJs(code, file, resolved, {
            sourceMap: true,
          });
          for (const dependency of dependencies) this.addWatchFile(dependency);
          return result;
        },
      },
    },
    {
      name: "tailcloak:css",
      transform: {
        filter: { id: { include: /\.css(?:$|\?)/, exclude: /\.module\.css(?:$|\?)/ } },
        async handler(code, id) {
          const file = cleanId(id);
          if (!CSS_RE.test(file) || MODULE_CSS_RE.test(file) || !UTILITIES_RE.test(code)) return;
          const resolved = await config;
          if (!resolved.enabled) return;
          const root = postcss.parse(code, { from: file });
          const { result, dependencies } = await obfuscateCss(root, resolved);
          for (const dependency of dependencies) this.addWatchFile(dependency);
          if (!result) return;
          const output = result.toResult({ map: { inline: false, annotation: false } });
          return { code: output.css, map: output.map.toString() };
        },
      },
    },
  ];
}
