# @tailcloak/vite

Vite plugin that obfuscates Tailwind CSS v4 class names in production builds. Each class string becomes one short, prefixed name. Works with any framework whose components compile to JS (React, Preact, Solid, Qwik, …).

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

That's the whole setup. `vite build` obfuscates, and `vite dev` is left untouched unless you pass `enabled: true`.

Options go in `tailcloak.config.ts`, or inline: `tailcloak({ prefix: "tc_" })`.

```ts
// tailcloak.config.ts
import { defineConfig } from "@tailcloak/vite";

export default defineConfig({
  seed: "56a7f08edca7918eb4a618e92e183ded",
  prefix: "tc_",
});
```

## How it works

- A `pre` transform renames classes in JS/TS/JSX modules outside `node_modules`, before JSX and TypeScript are compiled.
- A normal-phase transform renames the utilities in the stylesheet `@tailwindcss/vite` generated, before Vite bundles and minifies it.

Requires Vite 6+, `@tailwindcss/vite` 4.1+ and Node.js 20.19+. Templates in `.vue`, `.svelte` and `.astro` files are not rewritten yet. See [`tailcloak`](https://www.npmjs.com/package/tailcloak) for every option, what gets rewritten, and the limitations.

## License

MIT
