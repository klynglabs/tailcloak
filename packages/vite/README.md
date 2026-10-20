# @tailcloak/vite

Obfuscates Tailwind CSS v4 class names in Vite production builds.

Requires Vite 6+, `@tailwindcss/vite` 4.1+ and Node.js 20.19+. Works with React, Preact, Solid, Qwik and other frameworks that compile to JS. `.vue`, `.svelte` and `.astro` templates are not supported yet.

## Setup

```bash
npm i -D @tailcloak/vite
npx tailcloak init
```

`init` writes a `tailcloak.config.ts` with a secret seed at your repository root. Commit it.

```ts
// vite.config.ts
import tailcloak from "@tailcloak/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), tailcloak()],
});
```

`vite build` obfuscates, `vite dev` does not.

## Options

Set them in `tailcloak.config.ts`, or inline: `tailcloak({ prefix: "tc_" })`. See the [option reference](https://github.com/klynglabs/tailcloak/tree/main/packages/tailcloak#readme).

## License

MIT
