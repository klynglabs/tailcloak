# @tailcloak/postcss

PostCSS plugins for [tailcloak](https://www.npmjs.com/package/tailcloak), for building your own integration. Next.js and Vite users want [`@tailcloak/next`](https://www.npmjs.com/package/@tailcloak/next) or [`@tailcloak/vite`](https://www.npmjs.com/package/@tailcloak/vite) instead: obfuscating the CSS alone breaks your site unless the JS is renamed to match.

```bash
npm i -D @tailcloak/postcss
```

- `@tailcloak/postcss` runs `@tailwindcss/postcss`, then obfuscates its utilities. Use it in place of `@tailwindcss/postcss`. It takes every tailcloak option, plus `tailwind: { ... }`, which is forwarded to `@tailwindcss/postcss`.
- `@tailcloak/postcss/obfuscate` only obfuscates. Put it after `@tailwindcss/postcss`.

```js
// postcss.config.mjs
export default {
  plugins: {
    "@tailcloak/postcss": {},
  },
};
```

Pair it with `obfuscateJs` from `tailcloak` in your bundler's JS transform, reading the same `tailcloak.config.ts`.

## License

MIT
