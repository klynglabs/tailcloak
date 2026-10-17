import type { NextConfig } from "next";
import {
  createPrefilter,
  loadConfig,
  serializeConfig,
  TAILWIND_IMPORT_RE,
  type TailcloakConfig,
} from "tailcloak";

export { defineConfig, type TailcloakConfig } from "tailcloak";

type NextConfigContext = { defaultConfig: NextConfig; [key: string]: unknown };
type NextConfigFunction = (
  phase: string,
  context: NextConfigContext,
) => NextConfig | Promise<NextConfig>;
type NextConfigInput = NextConfig | NextConfigFunction | Promise<NextConfig>;

const JS_LOADER = "@tailcloak/next/loader";
const CSS_LOADER = "@tailcloak/next/css-loader";
const SOURCE_GLOB = "*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}";
const SOURCE_RE = /\.[cm]?[jt]sx?$/;
const CSS_GLOB = "*.css";

type WebpackConfig = { module?: { rules?: unknown[] } };
type WebpackFn = (config: WebpackConfig, context: unknown) => WebpackConfig;
type TurbopackRules = Record<string, unknown>;

function addRule(rules: TurbopackRules, glob: string, rule: unknown) {
  const existing = rules[glob];
  rules[glob] = existing ? [existing, rule].flat() : rule;
}

export function withTailcloak(
  nextConfig: NextConfigInput = {},
  options: TailcloakConfig = {},
): NextConfigFunction {
  return async (phase, context) => {
    const base =
      typeof nextConfig === "function" ? await nextConfig(phase, context) : await nextConfig;
    const config = await loadConfig(options);
    if (!config.enabled) return base;

    const loaderOptions = serializeConfig({ ...options, root: config.root });
    const jsLoader = { loader: JS_LOADER, options: loaderOptions };
    const cssLoader = { loader: CSS_LOADER, options: loaderOptions };

    const rules = { ...base.turbopack?.rules } as TurbopackRules;
    addRule(rules, SOURCE_GLOB, {
      condition: { all: [{ not: "foreign" }, { content: createPrefilter(config) }] },
      loaders: [jsLoader],
    });
    addRule(rules, CSS_GLOB, {
      condition: { all: [{ not: "foreign" }, { content: TAILWIND_IMPORT_RE }] },
      loaders: [cssLoader],
    });

    const userWebpack = base.webpack as WebpackFn | undefined | null;
    return {
      ...base,
      turbopack: { ...base.turbopack, rules: rules as never },
      webpack(webpackConfig: WebpackConfig, ctx: unknown) {
        webpackConfig.module ??= {};
        webpackConfig.module.rules ??= [];
        webpackConfig.module.rules.push(
          { test: SOURCE_RE, exclude: /node_modules/, enforce: "pre", use: [jsLoader] },
          {
            // Next disables its built-in CSS support if a rule's `test` or `include` matches `.css`.
            resource: { and: [/\.css$/], not: [/node_modules/, /\.module\.css$/] },
            enforce: "pre",
            use: [cssLoader],
          },
        );
        return userWebpack ? userWebpack(webpackConfig, ctx) : webpackConfig;
      },
    };
  };
}
