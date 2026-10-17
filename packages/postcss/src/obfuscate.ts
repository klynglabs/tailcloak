import type { PluginCreator } from "postcss";
import { loadConfig, obfuscateCss, type TailcloakConfig } from "tailcloak";

const MODULE_RE = /\.module\.\w+$/;

const obfuscate: PluginCreator<TailcloakConfig> = (options = {}) => ({
  postcssPlugin: "tailcloak",
  async OnceExit(root, { result }) {
    const from = result.opts.from;
    if (from && MODULE_RE.test(from)) return;

    const config = await loadConfig(options);
    const { dependencies } = await obfuscateCss(root, config);
    for (const file of dependencies) {
      if (file !== from) {
        result.messages.push({ type: "dependency", plugin: "tailcloak", file, parent: from });
      }
    }
  },
});
obfuscate.postcss = true;

export default obfuscate;
