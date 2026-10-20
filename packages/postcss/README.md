# @tailcloak/postcss

[![npm](https://img.shields.io/npm/v/@tailcloak/postcss?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@tailcloak/postcss)
[![downloads](https://img.shields.io/npm/dm/@tailcloak/postcss?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@tailcloak/postcss)
[![CI](https://img.shields.io/github/actions/workflow/status/klynglabs/tailcloak/ci.yml?branch=main&style=flat&colorA=000000&colorB=000000)](https://github.com/klynglabs/tailcloak/actions/workflows/ci.yml)

PostCSS plugins for [tailcloak](https://github.com/klynglabs/tailcloak/tree/main/packages/tailcloak#readme), for building your own integration.

On Next.js or Vite, use [`@tailcloak/next`](https://www.npmjs.com/package/@tailcloak/next) or [`@tailcloak/vite`](https://www.npmjs.com/package/@tailcloak/vite) instead. Obfuscating the CSS alone breaks your site unless the JS is renamed to match.

## Setup

```bash
npm i -D @tailcloak/postcss
```

```js
// postcss.config.mjs
export default {
  plugins: {
    "@tailcloak/postcss": {},
  },
};
```

Pair it with `obfuscateJs` from `tailcloak` in your bundler's JS transform, reading the same `tailcloak.config.ts`.

## Plugins

- `@tailcloak/postcss` runs `@tailwindcss/postcss`, then obfuscates its utilities. Use it in place of `@tailwindcss/postcss`. It takes every tailcloak option, plus `tailwind: { ... }`, which is forwarded to `@tailwindcss/postcss`.
- `@tailcloak/postcss/obfuscate` only obfuscates. Put it after `@tailwindcss/postcss`.

## License

MIT
