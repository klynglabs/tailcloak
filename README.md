# tailcloak

Tailwind CSS v4 class obfuscation as a drop-in bundler plugin. Each class string becomes one short, prefixed name:

```html
<!-- before -->
<main class="mx-auto flex max-w-2xl flex-col gap-6 p-8 md:p-16" />
<!-- after -->
<main class="tc_UwcxCM" />
```

Usage and options: [packages/tailcloak/README.md](packages/tailcloak/README.md).

## Packages

| Path                  | npm                  | What                                                                   |
| --------------------- | -------------------- | ---------------------------------------------------------------------- |
| `packages/tailcloak`  | `tailcloak`          | Framework-agnostic core: config, hashing, JS and CSS transforms.       |
| `packages/next`       | `@tailcloak/next`    | `withTailcloak()` for Next.js (Turbopack and webpack). One-step setup. |
| `packages/vite`       | `@tailcloak/vite`    | Vite plugin, used next to `@tailwindcss/vite`.                         |
| `packages/postcss`    | `@tailcloak/postcss` | PostCSS plugins (Tailwind + obfuscate, or obfuscate only).             |
| `examples/next-app`   | private              | Next 16 app, built with Turbopack and webpack as an end-to-end test.   |
| `examples/vite-react` | private              | Vite 8 + React app, built as an end-to-end test.                       |
| `examples/ui`         | private              | Shared component package both examples import (tests `sources`).       |

## Development

```bash
bun install
```

```bash
bun run build
```

```bash
bun run start
```

`build` builds every package and both examples. `start` serves the built examples: Next on http://localhost:3000 and Vite on http://localhost:4173. Use `bun run build:packages` to build only the npm packages.

```bash
bun run check
```

`check` runs oxfmt, oxlint, then `typecheck` and `test` in every package.

```bash
bun run e2e
```

`e2e` builds both example apps and checks the output: every class in the HTML/JS must be obfuscated and defined in the CSS, and no original utility may remain.
