# @tailcloak/postcss

PostCSS plugins for [tailcloak](https://github.com/klynglabs/tailcloak/tree/main/packages/tailcloak#readme), for building your own integration.

On Next.js or Vite, use [`@tailcloak/next`](https://www.npmjs.com/package/@tailcloak/next) or [`@tailcloak/vite`](https://www.npmjs.com/package/@tailcloak/vite) instead. Obfuscating only the CSS breaks your site: the JS has to be renamed too.

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

Then rename the JS with `obfuscateJs` from `tailcloak` in your bundler's transform step.

## Plugins

- `@tailcloak/postcss` replaces `@tailwindcss/postcss`: it runs Tailwind, then obfuscates. Takes every tailcloak option, plus `tailwind: { ... }` for `@tailwindcss/postcss`.
- `@tailcloak/postcss/obfuscate` only obfuscates. Put it after `@tailwindcss/postcss`.

## License

MIT
