# @tailcloak/vite

## 0.4.0

### Minor Changes

- 4b1afc1: Tailwind stylesheets are now found through the app's imports, so a stylesheet in a shared workspace package works without setting `css`, whether the app imports it from JS (`import "@acme/ui/globals.css"`) or from its own stylesheet (`@import "@acme/ui/globals.css"`). Imports resolve through the package's `exports`, including the `style` condition.
  
  A production build without any Tailwind stylesheet, or with a `css` path that doesn't exist, now fails at startup with one message instead of warning and shipping unobfuscated class names. A successful build prints one line naming the stylesheets it uses, e.g. `[tailcloak] Obfuscating Tailwind classes from app/globals.css`. Every message, including errors, starts with `[tailcloak]` and prints without internal stack frames.
  
  `npx tailcloak init` now writes a typed config (`import type` with `satisfies TailcloakConfig`), which loads even where `tailcloak` isn't installed.

### Patch Changes

- 55328d8: Clean up the READMEs: add badges, put requirements first, and keep the option reference in one place.
- Updated dependencies [55328d8]
- Updated dependencies [4b1afc1]
  - tailcloak@0.4.0

## 0.3.0

### Patch Changes

- Updated dependencies [750238a]
  - tailcloak@0.3.0

## 0.2.0

### Patch Changes

- Updated dependencies [fee2156]
  - tailcloak@0.2.0

## 0.1.1

### Patch Changes

- 55b4f46: Publish with npm provenance.
- Updated dependencies [55b4f46]
  - tailcloak@0.1.1

## 0.1.0

### Minor Changes

- 86fd169: Initial release: Tailwind CSS v4 class obfuscation with one name per class string. `@tailcloak/next` (Turbopack and webpack), `@tailcloak/vite`, `@tailcloak/postcss`, and the framework-agnostic `tailcloak` core.

### Patch Changes

- Updated dependencies [86fd169]
  - tailcloak@0.1.0
