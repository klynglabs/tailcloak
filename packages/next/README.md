# @tailcloak/next

[![npm](https://img.shields.io/npm/v/@tailcloak/next?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@tailcloak/next)
[![downloads](https://img.shields.io/npm/dm/@tailcloak/next?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@tailcloak/next)
[![CI](https://img.shields.io/github/actions/workflow/status/klynglabs/tailcloak/ci.yml?branch=main&style=flat&colorA=000000&colorB=000000)](https://github.com/klynglabs/tailcloak/actions/workflows/ci.yml)

Obfuscates Tailwind CSS v4 class names in Next.js production builds, with Turbopack or webpack. Each class string becomes one short, prefixed name.

Requires Next.js 15.3+, Tailwind CSS v4.1+ and Node.js 20.19+.

## Setup

```bash
npm i -D @tailcloak/next
npx tailcloak init
```

`init` writes a `tailcloak.config.ts` with a random secret seed at your repository root. Commit it. Production builds fail without a seed.

```ts
// next.config.ts
import { withTailcloak } from "@tailcloak/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default withTailcloak(nextConfig);
```

Keep your stock `postcss.config.mjs` with `@tailwindcss/postcss`. `next build` obfuscates; `next dev` is left untouched.

## Options

Set options in `tailcloak.config.ts`, or pass them as the second argument: `withTailcloak(nextConfig, { prefix: "tc_" })`.

See [`tailcloak`](https://github.com/klynglabs/tailcloak/tree/main/packages/tailcloak#readme) for every option, what gets rewritten, and the limitations.

## How it works

`withTailcloak` adds two loaders, for both Turbopack and webpack:

- **Tailwind entry stylesheets** (non-module `.css` files that import `tailwindcss`) are compiled by Tailwind and obfuscated before Next's PostCSS runs. `@tailwindcss/postcss` then finds no Tailwind at-rules left, so nothing is compiled twice.
- **JS/TS/JSX modules** outside `node_modules` get their class names renamed to match.

## License

MIT
