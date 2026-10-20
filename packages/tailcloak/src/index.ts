export {
  defineConfig,
  deserializeConfig,
  loadConfig,
  resolveConfig,
  serializeConfig,
  type ClassMatcher,
  type ResolvedConfig,
  type TailcloakConfig,
} from "./config.ts";
export { transformCss, type CssTransformOptions, type CssTransformResult } from "./css.ts";
export { combinedName, createNamer, type Namer } from "./hash.ts";
export {
  collectClassSets,
  createPrefilter,
  findClassTargets,
  transformJs,
  type ClassTarget,
  type JsTransformOptions,
  type JsTransformResult,
} from "./js.ts";
export { obfuscateCss, obfuscateJs, type ObfuscateResult } from "./obfuscate.ts";
export {
  collectCombinations,
  findProjectSources,
  isProjectSource,
  type Combinations,
} from "./sources.ts";
export {
  checkTailwind,
  createClassifier,
  findTailwindEntries,
  getClassifier,
  isTailwindStylesheet,
  TAILWIND_IMPORT_RE,
  tailwindEntries,
  type Classifier,
} from "./tailwind.ts";
export { formatMessage } from "./log.ts";
