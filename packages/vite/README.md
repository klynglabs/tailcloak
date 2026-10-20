# @tailcloak/vite

[![npm](https://img.shields.io/npm/v/@tailcloak/vite?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@tailcloak/vite)
[![downloads](https://img.shields.io/npm/dm/@tailcloak/vite?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@tailcloak/vite)
[![CI](https://img.shields.io/github/actions/workflow/status/klynglabs/tailcloak/ci.yml?branch=main&style=flat&colorA=000000&colorB=000000)](https://github.com/klynglabs/tailcloak/actions/workflows/ci.yml)

Vite plugin that obfuscates Tailwind CSS v4 class names in production builds. Each class string becomes one short, prefixed name.

Requires Vite 6+, `@tailwindcss/vite` 4.1+ and Node.js 20.19+. Works with any framework whose components compile to JS (React, Preact, Solid, Qwik, …). Templates in `.vue`, `.svelte` and `.astro` files are not rewritten yet.

## Setup

```bash
npm i -D @tailcloak/vite
npx tailcloak init
```

`init` writes a `tailcloak.config.ts` with a random secret seed at your repository root. Commit it. Production builds fail without a seed.

```ts
// vite.config.ts
import tailcloak from "@tailcloak/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), tailcloak()],
});
```

`vite build` obfuscates; `vite dev` is left untouched unless you pass `enabled: true`.

## Options

Set options in `tailcloak.config.ts`, or inline: `tailcloak({ prefix: "tc_" })`.

See [`tailcloak`](https://github.com/klynglabs/tailcloak/tree/main/packages/tailcloak#readme) for every option, what gets rewritten, and the limitations.

## How it works

- A `pre` transform renames classes in JS/TS/JSX modules outside `node_modules`, before JSX and TypeScript are compiled.
- A normal-phase transform renames the utilities in the stylesheet `@tailwindcss/vite` generated, before Vite bundles and minifies it.

## License

MIT
