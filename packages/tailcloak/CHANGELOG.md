# tailcloak

## 0.4.0

### Minor Changes

- 4b1afc1: Tailwind stylesheets are now found through the app's imports, so a stylesheet in a shared workspace package works without setting `css`, whether the app imports it from JS (`import "@acme/ui/globals.css"`) or from its own stylesheet (`@import "@acme/ui/globals.css"`). Imports resolve through the package's `exports`, including the `style` condition.
  
  A production build without any Tailwind stylesheet, or with a `css` path that doesn't exist, now fails at startup with one message instead of warning and shipping unobfuscated class names. A successful build prints one line naming the stylesheets it uses, e.g. `[tailcloak] Obfuscating Tailwind classes from app/globals.css`. Every message, including errors, starts with `[tailcloak]` and prints without internal stack frames.
  
  `npx tailcloak init` now writes a typed config (`import type` with `satisfies TailcloakConfig`), which loads even where `tailcloak` isn't installed.

### Patch Changes

- 55328d8: Clean up the READMEs: add badges, put requirements first, and keep the option reference in one place.

## 0.3.0

### Minor Changes

- 750238a: A `seed` of at least 16 characters is now required whenever obfuscation is on. A production build without one fails with a ready-to-paste random seed, and `npx tailcloak init` writes a `tailcloak.config.ts` with a random seed at your repository root.
  
  Config files now stack: every `tailcloak.config.ts` from the workspace root down to the app is read, and the closest file wins option by option. The app's `package.json` name is now mixed into every hash, so apps sharing a seed get different names. This changes all generated names once.

## 0.2.0

### Minor Changes

- fee2156: Monorepo support without per-app config: folders listed with `@source` in the Tailwind stylesheet are combined automatically (no more `sources`), and `tailcloak.config.ts` is looked up in parent folders up to the repository or workspace root.

## 0.1.1

### Patch Changes

- 55b4f46: Publish with npm provenance.

## 0.1.0

### Minor Changes

- 86fd169: Initial release: Tailwind CSS v4 class obfuscation with one name per class string. `@tailcloak/next` (Turbopack and webpack), `@tailcloak/vite`, `@tailcloak/postcss`, and the framework-agnostic `tailcloak` core.
