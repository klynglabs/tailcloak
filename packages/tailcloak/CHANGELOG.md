# tailcloak

## 0.2.0

### Minor Changes

- fee2156: Monorepo support without per-app config: folders listed with `@source` in the Tailwind stylesheet are combined automatically (no more `sources`), and `tailcloak.config.ts` is looked up in parent folders up to the repository or workspace root.

## 0.1.1

### Patch Changes

- 55b4f46: Publish with npm provenance.

## 0.1.0

### Minor Changes

- 86fd169: Initial release: Tailwind CSS v4 class obfuscation with one name per class string. `@tailcloak/next` (Turbopack and webpack), `@tailcloak/vite`, `@tailcloak/postcss`, and the framework-agnostic `tailcloak` core.
