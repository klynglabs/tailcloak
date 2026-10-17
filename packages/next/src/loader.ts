import { deserializeConfig, loadConfig, obfuscateJs, type ResolvedConfig } from "tailcloak";

import { toError, type LoaderContext } from "./loader-context.ts";

const configs = new Map<string, Promise<ResolvedConfig>>();

function getConfig(rawOptions: Record<string, unknown>): Promise<ResolvedConfig> {
  const key = JSON.stringify(rawOptions);
  let config = configs.get(key);
  if (!config) {
    config = loadConfig(deserializeConfig(rawOptions));
    configs.set(key, config);
    config.catch(() => configs.delete(key));
  }
  return config;
}

export default function tailcloakLoader(this: LoaderContext, source: string, map?: unknown): void {
  const callback = this.async();
  getConfig(this.getOptions())
    .then((config) => obfuscateJs(source, this.resourcePath, config, { sourceMap: this.sourceMap }))
    .then(({ result, dependencies }) => {
      for (const file of dependencies) this.addDependency(file);
      if (!result) return callback(null, source, map);
      callback(null, result.code, result.map ? JSON.parse(result.map.toString()) : map);
    })
    .catch((error: unknown) => callback(toError(error)));
}
