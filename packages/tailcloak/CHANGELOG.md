# tailcloak

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
