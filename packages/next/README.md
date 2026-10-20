# @tailcloak/next

Obfuscates Tailwind CSS v4 class names in Next.js production builds, with Turbopack or webpack.

Requires Next.js 15.3+, Tailwind CSS v4.1+ and Node.js 20.19+.

## Setup

```bash
npm i -D @tailcloak/next
npx tailcloak init
```

`init` writes a `tailcloak.config.ts` with a secret seed at your repository root. Commit it.

```ts
// next.config.ts
import { withTailcloak } from "@tailcloak/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default withTailcloak(nextConfig);
```

Keep your `postcss.config.mjs` as it is. `next build` obfuscates, `next dev` does not.

## Options

Set them in `tailcloak.config.ts`, or pass them as the second argument: `withTailcloak(nextConfig, { prefix: "tc_" })`. See the [option reference](https://github.com/klynglabs/tailcloak/tree/main/packages/tailcloak#readme).

## License

MIT
