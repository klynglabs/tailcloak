import tailcloak from "@tailcloak/postcss";
import postcss, { type Processor } from "postcss";
import { deserializeConfig, TAILWIND_IMPORT_RE } from "tailcloak";

import { toError, type LoaderContext } from "./loader-context.ts";

const processors = new Map<string, Processor>();

function getProcessor(rawOptions: Record<string, unknown>): Processor {
  const key = JSON.stringify(rawOptions);
  let processor = processors.get(key);
  if (!processor) {
    processor = postcss([tailcloak(deserializeConfig(rawOptions))]);
    processors.set(key, processor);
  }
  return processor;
}

export default function tailcloakCssLoader(this: LoaderContext, source: string, map?: unknown) {
  const callback = this.async();
  if (!TAILWIND_IMPORT_RE.test(source)) return callback(null, source, map);

  getProcessor(this.getOptions())
    .process(source, {
      from: this.resourcePath,
      to: this.resourcePath,
      map: this.sourceMap ? { inline: false, annotation: false, prev: map as never } : false,
    })
    .then((result) => {
      for (const message of result.messages) {
        if (message.type === "dependency") this.addDependency(message.file);
        else if (message.type === "dir-dependency") this.addContextDependency?.(message.dir);
      }
      callback(null, result.css, result.map?.toJSON());
    })
    .catch((error: unknown) => callback(toError(error)));
}
