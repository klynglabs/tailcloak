# tailcloak

[![npm](https://img.shields.io/npm/v/tailcloak?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/tailcloak)
[![downloads](https://img.shields.io/npm/dm/tailcloak?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/tailcloak)
[![CI](https://img.shields.io/github/actions/workflow/status/klynglabs/tailcloak/ci.yml?branch=main&style=flat&colorA=000000&colorB=000000)](https://github.com/klynglabs/tailcloak/actions/workflows/ci.yml)

Obfuscates Tailwind CSS v4 class names at build time. Each class string becomes one short, prefixed name.

```html
<!-- before -->
<main class="mx-auto flex max-w-2xl flex-col gap-6 p-8 md:p-16"></main>
<!-- after -->
<main class="tc_UwcxCM"></main>
```

This is the framework-agnostic core, and the reference for every option. Install the package for your bundler:

| Package                                                                  | For                                      |
| ------------------------------------------------------------------------ | ---------------------------------------- |
| [`@tailcloak/next`](https://www.npmjs.com/package/@tailcloak/next)       | Next.js 15.3+ (Turbopack and webpack)    |
| [`@tailcloak/vite`](https://www.npmjs.com/package/@tailcloak/vite)       | Vite 6+ (React, Preact, Solid, Qwik, …)  |
| [`@tailcloak/postcss`](https://www.npmjs.com/package/@tailcloak/postcss) | Building blocks for other PostCSS setups |
| `tailcloak`                                                              | The core API, for writing an integration |

- **Drop-in.** One line in your bundler config. No extra build step, and no class map files to commit.
- **One class per element.** Every class string (`"flex p-4 text-sm"`) becomes a single name, without duplicating any CSS.
- **Exact.** Tailwind's own design system decides what counts as a class, so `flex` in `className="flex"` is renamed but `"flex"` in `title="flex"` and your non-Tailwind classes are not.
- **Cheap.** Names are stateless hashes, so the CSS and JS sides need no coordination. Files without class syntax are never parsed, and parsed files are cached until they change.

Requires Tailwind CSS v4.1+ and Node.js 20.19+.

## Configuration

The only required option is a secret `seed`. Create it once:

```sh
npx tailcloak init
```

This writes a `tailcloak.config.ts` with a random seed at your repository root. Commit it. A production build without a seed fails and prints one you can paste in. Add other options to the same file:

```ts
// tailcloak.config.ts
import type { TailcloakConfig } from "tailcloak";

export default {
  seed: "56a7f08edca7918eb4a618e92e183ded",
  prefix: "tc_",
} satisfies TailcloakConfig;
```

`import type` is removed when the config loads, so the file works even where `tailcloak` isn't installed. For type checking, add `tailcloak` to the `devDependencies` next to it. In an app folder, `defineConfig` from `@tailcloak/next` or `@tailcloak/vite` works too.

Every integration reads this file, so tools that build the same project (say Next and Storybook) share it. `tailcloak.config.{ts,mts,cts,js,mjs,cjs}` are all picked up. Config files in parent folders, up to the repository or workspace root, are read too, and the closest file wins option by option (see [Monorepos](#monorepos)). Options passed to the plugin, e.g. `tailcloak({ prefix: "tc_" })`, win over every file.

| Option       | Default                                              | Description                                                                                                                   |
| ------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `enabled`    | production builds                                    | Turn obfuscation on or off. Dev servers are left alone by default, so DevTools stay readable.                                 |
| `prefix`     | `""`                                                 | Prepended to every name. Must be a valid CSS identifier start (`tc_`, `x-`, `_`).                                             |
| `length`     | `6`                                                  | Hash characters after the prefix (3–16). Longer means fewer collisions; a collision fails the build with a clear error.       |
| `seed`       | required                                             | Secret salt for the hash, 16+ characters. `npx tailcloak init` creates one. Change it to reshuffle every name.                |
| `combine`    | `true`                                               | Collapse each class string into one name. Set `false` to rename each class on its own.                                        |
| `css`        | auto                                                 | Tailwind entry stylesheet(s), relative to `root`. Found automatically: see [Finding the stylesheet](#finding-the-stylesheet). |
| `attributes` | `["class", "className"]`                             | JSX attributes / object keys holding classes. Any `*ClassName` attribute (e.g. `iconClassName`) is always included.           |
| `functions`  | `cn clsx cx classnames classNames twMerge twJoin tw` | clsx-style helpers whose arguments are classes. `cva` and `tv` are supported natively.                                        |
| `exclude`    | `[]`                                                 | Strings or RegExps for classes that must keep their names, e.g. classes toggled by third-party scripts.                       |
| `sources`    | `@source` folders                                    | Extra folders, relative to `root`, whose class strings are combined like your own. See [Monorepos](#monorepos).               |
| `manifest`   | none                                                 | Path, relative to `root`, of a JSON file mapping every obfuscated name back to its classes. For debugging production markup.  |
| `root`       | project root                                         | Where to look for the config file, stylesheets and sources.                                                                   |

## Finding the stylesheet

Tailcloak needs your Tailwind entry stylesheet to know which tokens are Tailwind classes. Without `css`, it uses every stylesheet that imports `tailwindcss`, directly or through other `@import`s, and is either:

- a non-module `.css` file under `root`, or
- imported by a source file under `root`, e.g. `import "@acme/ui/globals.css"`. Package imports resolve through the package's `exports`, so a stylesheet in a shared workspace package is found too.

So all of these work without config:

```tsx
// app/layout.tsx imports the package's stylesheet directly
import "@acme/ui/globals.css";
```

```css
/* app/globals.css, imported by app/layout.tsx, adds to the package's stylesheet */
@import "@acme/ui/globals.css";
```

The production build checks this once at startup and prints the stylesheets it uses:

```
[tailcloak] Obfuscating Tailwind classes from app/globals.css
```

If no stylesheet is found, or a path in `css` doesn't exist, it stops with one message instead. Set `css` for anything else, e.g. a stylesheet only linked from HTML outside `root`.

## What gets rewritten

In JS/TS/JSX files outside `node_modules`:

```tsx
<div className="flex p-4" />; // class / className / *ClassName attributes
cn("flex", active && "ring-2", { "opacity-50": off }); // clsx-style calls, including object keys
cva("rounded", { variants: { size: { sm: "text-sm" } } }); // cva / tv: base, slots, variants, compound*
tw`flex p-4`; // tagged templates
const base = "flex gap-2";
<div className={base} />; // same-file constants
const sizes = { sm: "text-sm" };
<p className={sizes[size]} />; // lookup maps
`flex ${gap} p-4`; // template literals (static parts only)
```

In CSS, only Tailwind-generated utilities (`@layer utilities`, including your own `@utility` definitions) are renamed. Preflight, plain CSS, CSS modules and third-party stylesheets are left alone.

## How `combine` works

Each Tailwind utility is its own CSS rule, so plain renaming gives one name per utility: `class="tc_a tc_b tc_c"`. With `combine`, the build first reads every source file and collects the class strings it will rewrite. Each string gets one name, a hash of its sorted classes, and every utility rule also matches the combined names that use it:

```css
:is(.tc_YsG1s8, .tc_UwcxCM) {
  display: flex;
}
```

`:is()` has the specificity of a single class and no rule moves, so the cascade is exactly Tailwind's. A string is one combination wherever it appears, in any order.

Strings joined at runtime still get one name each: `cn("px-4 py-2", variants[variant], className)` renders as three names, because the build can't know which ones meet. Files outside the project (e.g. `node_modules`) keep one name per class.

## Monorepos

Config files stack. `npx tailcloak init` puts the seed in a `tailcloak.config.ts` at the repository root, even when run from an app folder. Add shared options there, and only what differs in an app's own `tailcloak.config.ts`. Most apps need no file at all:

```ts
// tailcloak.config.ts (repository root)
import type { TailcloakConfig } from "tailcloak";

export default {
  seed: "56a7f08edca7918eb4a618e92e183ded",
  prefix: "tc_",
} satisfies TailcloakConfig;
```

```ts
// apps/web/next.config.ts
export default withTailcloak(nextConfig);
```

Each app's `package.json` name is mixed into the hash, so apps sharing a seed still get different names.

The Tailwind stylesheet can live in the app or in a shared package, as in shadcn's monorepo template. Either way, components from a workspace package (say `packages/ui`) are combined like the app's own as long as Tailwind scans them with `@source`, which it needs anyway, and your bundler compiles them from source:

```css
/* packages/ui/src/globals.css, imported by apps/web as "@acme/ui/globals.css" */
@import "tailwindcss";
@source ".";
```

A stylesheet in `packages/ui` needs `tailwindcss` in that package's own `dependencies` or `devDependencies`, so `@import "tailwindcss"` resolves from there.

With Turborepo, list the root config so changing it rebuilds the apps:

```json
// turbo.json
{ "globalDependencies": ["tailcloak.config.ts"] }
```

Packages loaded prebuilt from `node_modules` are never rewritten. See the limitations below.

## Limitations

Obfuscation is static, so anything the build can't see is a problem:

- **Dynamically built names** such as `` `bg-${color}-500` `` aren't renamed. Tailwind can't generate them either, so write them out in full.
- **Classes in other places**, for example strings passed to `querySelector`, `classList.add`, or props not named `*className`, aren't renamed. Add the helper to `functions`, or the classes to `exclude`.
- **`tailwind-merge` conflict resolution** can't recognise obfuscated names at runtime. `twMerge` still joins classes, but `twMerge("p-2", "p-4")` keeps both and the CSS order decides.
- **Your own `.group` / `.peer` styles** would be renamed along with Tailwind's markers. Add them to `exclude`.
- **Classes from `node_modules` components** aren't rewritten. If they use Tailwind classes that appear in your CSS, add them to `exclude`.
- **It hides names, not styles.** DevTools still shows computed styles.

## Writing an integration

A bundler plugin needs two transforms:

```ts
import { loadConfig, obfuscateCss, obfuscateJs } from "tailcloak";

const config = await loadConfig(userOptions, { root, enabled: isProductionBuild });

// JS/TS/JSX modules, before JSX is compiled:
const { result, dependencies } = await obfuscateJs(code, file, config, { sourceMap: true });

// The compiled Tailwind stylesheet, as a PostCSS root:
const { result, dependencies } = await obfuscateCss(postcssRoot, config);
```

`dependencies` lists the files the output depends on, for watch mode. `transformJs`, `transformCss`, `collectCombinations`, `createNamer` and `getClassifier` are exported for lower-level use.

## License

MIT
