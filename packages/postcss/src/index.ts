import tailwindcss, { type PluginOptions as TailwindOptions } from "@tailwindcss/postcss";
import type { AcceptedPlugin, Plugin, PluginCreator } from "postcss";
import type { TailcloakConfig } from "tailcloak";

import obfuscate from "./obfuscate.ts";

export interface TailcloakPostcssOptions extends TailcloakConfig {
  tailwind?: TailwindOptions;
}

const tailcloak: PluginCreator<TailcloakPostcssOptions> = (options = {}) => {
  const { tailwind: tailwindOptions, ...config } = options;
  const tw = tailwindcss(tailwindOptions) as Plugin & { plugins?: AcceptedPlugin[] };
  return {
    postcssPlugin: "tailcloak",
    plugins: [...(tw.plugins ?? [tw]), obfuscate(config)],
  } as Plugin;
};
tailcloak.postcss = true;

export default tailcloak;
