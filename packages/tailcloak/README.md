# tailcloak

Obfuscates Tailwind CSS v4 class names at build time. Each class string becomes one short name.

```html
<!-- before -->
<main class="mx-auto flex max-w-2xl flex-col gap-6 p-8 md:p-16"></main>
<!-- after -->
<main class="tc_UwcxCM"></main>
```

This is the core package and the option reference. To use tailcloak, install [`@tailcloak/next`](https://www.npmjs.com/package/@tailcloak/next), [`@tailcloak/vite`](https://www.npmjs.com/package/@tailcloak/vite) or [`@tailcloak/postcss`](https://www.npmjs.com/package/@tailcloak/postcss).

Requires Tailwind CSS v4.1+ and Node.js 20.19+.

## Configuration

```sh
npx tailcloak init
```

This writes a `tailcloak.config.ts` with a random secret seed at your repository root. Commit it. A production build without a seed fails and prints one you can paste in.

```ts
// tailcloak.config.ts
import type { TailcloakConfig } from "tailcloak";

export default {
  seed: "56a7f08edca7918eb4a618e92e183ded",
  prefix: "tc_",
} satisfies TailcloakConfig;
```

Any `tailcloak.config.{ts,mts,cts,js,mjs,cjs}` works, and it works without `tailcloak` installed next to it. Options passed to the plugin win over the file.

## Options

- `seed` (required): secret salt for the hash, 16+ characters. Change it to reshuffle every name.
- `prefix` (default `""`): prepended to every name, e.g. `tc_`. Must be a valid CSS identifier start.
- `length` (default `6`): hash characters after the prefix, 3 to 16. A collision fails the build.
- `combine` (default `true`): one name per class string. Set `false` to rename each class on its own.
- `enabled` (default: production builds): dev servers are left alone so DevTools stay readable.
- `css` (default: found automatically): Tailwind entry stylesheets, relative to `root`. See [Finding the stylesheet](#finding-the-stylesheet).
- `attributes` (default `["class", "className"]`): JSX attributes and object keys that hold classes. `*ClassName` attributes are always included.
- `functions` (default `cn`, `clsx`, `cx`, `classnames`, `classNames`, `twMerge`, `twJoin`, `tw`): helpers whose arguments are classes. `cva` and `tv` are always supported.
- `exclude` (default `[]`): strings or RegExps for classes that keep their names, e.g. classes toggled by third-party scripts.
- `sources` (default `[]`): extra folders whose class strings are combined like your own. `@source` folders are already included.
- `manifest` (default: none): path of a JSON file mapping every name back to its classes, for debugging. Keep it out of your public folder.
- `root` (default: project root): where to look for the config, stylesheets and sources.

## Finding the stylesheet

Without `css`, tailcloak uses every stylesheet that imports `tailwindcss` (directly or through `@import`) and is either a `.css` file under `root` or imported by a source file under `root`. Stylesheets in workspace packages, like `import "@acme/ui/globals.css"`, are found too.

The build prints what it found:

```
[tailcloak] Obfuscating Tailwind classes from app/globals.css
```

Set `css` for anything else, e.g. a stylesheet linked only from HTML.

## What gets rewritten

In JS/TS/JSX files outside `node_modules`:

```tsx
<div className="flex p-4" />; // class / className / *ClassName attributes
cn("flex", active && "ring-2", { "opacity-50": off }); // clsx-style calls, including object keys
cva("rounded", { variants: { size: { sm: "text-sm" } } }); // cva / tv
tw`flex p-4`; // tagged templates
const base = "flex gap-2";
<div className={base} />; // same-file constants
const sizes = { sm: "text-sm" };
<p className={sizes[size]} />; // lookup maps
`flex ${gap} p-4`; // template literals (static parts only)
```

Only tokens Tailwind recognises are renamed, so `"flex"` in `title="flex"` and your own non-Tailwind classes stay as they are.

In CSS, only Tailwind utilities (including your `@utility` definitions) are renamed. Preflight, plain CSS, CSS modules and third-party stylesheets are left alone.

## How `combine` works

The build collects every class string in your sources and gives each one a single name. Each utility rule then also matches the combined names that use it:

```css
:is(.tc_YsG1s8, .tc_UwcxCM) {
  display: flex;
}
```

`:is()` keeps single-class specificity and no rule moves, so the cascade is exactly Tailwind's. Strings joined at runtime, like `cn("px-4", variants[variant], className)`, get one name per string.

## Monorepos

Config files stack: files in parent folders up to the repository root are read too, and the closest one wins per option. `npx tailcloak init` always writes the seed to the root file, so most apps need no config of their own. Each app's `package.json` name is mixed into the hash, so apps sharing a seed still get different names.

Components in a workspace package are combined like the app's own when Tailwind scans them with `@source` and your bundler compiles them from source:

```css
/* packages/ui/src/globals.css */
@import "tailwindcss";
@source ".";
```

That package needs `tailwindcss` in its own `dependencies` or `devDependencies`. With Turborepo, add the root config to `globalDependencies` so changing it rebuilds the apps:

```json
{ "globalDependencies": ["tailcloak.config.ts"] }
```

## Limitations

Anything the build can't see statically is not renamed:

- **Dynamic names** like `` `bg-${color}-500` ``. Tailwind can't generate these either, so write them out in full.
- **Classes in other places**, like `querySelector`, `classList.add` or props not named `*className`. Add the helper to `functions`, or the classes to `exclude`.
- **Prebuilt `node_modules` components.** If they use Tailwind classes, add those to `exclude`.
- **Your own `.group` / `.peer` styles** get renamed with Tailwind's markers. Add them to `exclude`.
- **`tailwind-merge` conflicts.** `twMerge("p-2", "p-4")` keeps both, and CSS order decides.

It hides class names, not styles: DevTools still shows computed styles.

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

`dependencies` lists the files the output depends on, for watch mode.

## License

MIT
