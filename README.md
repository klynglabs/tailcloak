# tailcloak

[![npm](https://img.shields.io/npm/v/tailcloak?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/tailcloak)
[![downloads](https://img.shields.io/npm/dm/tailcloak?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/tailcloak)
[![CI](https://img.shields.io/github/actions/workflow/status/klynglabs/tailcloak/ci.yml?branch=main&style=flat&colorA=000000&colorB=000000)](https://github.com/klynglabs/tailcloak/actions/workflows/ci.yml)

Obfuscates Tailwind CSS v4 class names at build time. Each class string becomes one short, prefixed name:

```html
<!-- before -->
<main class="mx-auto flex max-w-2xl flex-col gap-6 p-8 md:p-16"></main>
<!-- after -->
<main class="tc_UwcxCM"></main>
```

## Packages

| Package                                  | For                                                      |
| ---------------------------------------- | -------------------------------------------------------- |
| [`@tailcloak/next`](packages/next)       | Next.js 15.3+, with Turbopack or webpack                 |
| [`@tailcloak/vite`](packages/vite)       | Vite 6+                                                  |
| [`@tailcloak/postcss`](packages/postcss) | Other PostCSS setups, where you rename the JS too        |
| [`tailcloak`](packages/tailcloak)        | The core: every option, what gets rewritten, limitations |

## Development

| Command         | What it does                                                                            |
| --------------- | --------------------------------------------------------------------------------------- |
| `bun install`   | Install dependencies.                                                                   |
| `bun run build` | Build every package and example. `build:packages` builds only the npm packages.         |
| `bun run start` | Serve the built examples: Next on http://localhost:3000, Vite on http://localhost:4173. |
| `bun run check` | oxfmt, oxlint, then `typecheck` and `test` in every package.                            |
| `bun run e2e`   | Build the examples and check that every class is obfuscated and defined in the CSS.     |

`examples/` holds a Next 16 app, a Vite 8 + React app, and a shared `ui` package both import (to test `@source`). Both get their Tailwind stylesheet from `ui`: the Vite app imports it directly, like a shadcn monorepo, and the Next app through an `@import` in its own `globals.css`.

## License

MIT
