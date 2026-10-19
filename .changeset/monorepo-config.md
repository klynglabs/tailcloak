---
"tailcloak": minor
---

Monorepo support without per-app config: folders listed with `@source` in the Tailwind stylesheet are combined automatically (no more `sources`), and `tailcloak.config.ts` is looked up in parent folders up to the repository or workspace root.
