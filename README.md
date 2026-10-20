# tailcloak

[![npm](https://img.shields.io/npm/v/tailcloak?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/tailcloak)
[![CI](https://img.shields.io/github/actions/workflow/status/klynglabs/tailcloak/ci.yml?branch=main&style=flat&colorA=000000&colorB=000000)](https://github.com/klynglabs/tailcloak/actions/workflows/ci.yml)

Obfuscates Tailwind CSS v4 class names at build time. Each class string becomes one short name.

```html
<!-- before -->
<main class="mx-auto flex max-w-2xl flex-col gap-6 p-8 md:p-16"></main>
<!-- after -->
<main class="tc_UwcxCM"></main>
```

Pre-1.0: options can still change between minor versions.

## Install

Pick the package for your bundler:

- [`@tailcloak/next`](packages/next): Next.js 15.3+
- [`@tailcloak/vite`](packages/vite): Vite 6+ with React, Preact, Solid or Qwik
- [`@tailcloak/postcss`](packages/postcss): other PostCSS setups

Options, what gets rewritten and limitations are in [`tailcloak`](packages/tailcloak).

## Development

```sh
bun install
bun run check
bun run e2e
```

`check` runs formatting, lint, typecheck and tests. `e2e` builds the apps in `examples/` and verifies every class is obfuscated.

## License

MIT
