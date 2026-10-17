# @tailcloak/next

Obfuscates Tailwind CSS v4 class names in Next.js production builds, with Turbopack and webpack. Each class string becomes one short, prefixed name.

```bash
npm i -D @tailcloak/next
```

```ts
// next.config.ts
import { withTailcloak } from "@tailcloak/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default withTailcloak(nextConfig);
```

That's the whole setup. Keep your stock `postcss.config.mjs` with `@tailwindcss/postcss`. Run `next build` and inspect the output; `next dev` is left untouched.

Options go in `tailcloak.config.ts`, or as the second argument: `withTailcloak(nextConfig, { prefix: "tc_" })`.

```ts
// tailcloak.config.ts
import { defineConfig } from "@tailcloak/next";

export default defineConfig({ prefix: "tc_" });
```

## How it works

`withTailcloak` adds two loaders, for both Turbopack and webpack:

- **Tailwind entry stylesheets** (non-module `.css` files that import `tailwindcss`) are compiled by Tailwind and obfuscated before Next's PostCSS runs. `@tailwindcss/postcss` then finds no Tailwind at-rules left and returns at once, so nothing is compiled twice.
- **JS/TS/JSX modules** outside `node_modules` get their class names renamed to match.

Requires Next.js 15.3+, Tailwind CSS v4.1+ and Node.js 20.19+. See [`tailcloak`](https://www.npmjs.com/package/tailcloak) for every option, what gets rewritten, and the limitations.

## License

MIT
