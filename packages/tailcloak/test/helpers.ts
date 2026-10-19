import { join } from "node:path";

import { resolveConfig, type TailcloakConfig } from "../src/config.ts";
import { createNamer } from "../src/hash.ts";
import { getClassifier } from "../src/tailwind.ts";

export const SEED = "test-seed-0123456789";

export const FIXTURE = join(import.meta.dir, "fixtures/app");

export async function setup(options: TailcloakConfig = {}) {
  const config = resolveConfig({ root: FIXTURE, enabled: true, seed: SEED, ...options });
  return { config, classifier: await getClassifier(config), name: createNamer(config) };
}
