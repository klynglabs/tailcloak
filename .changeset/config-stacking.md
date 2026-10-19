---
"tailcloak": minor
---

A `seed` of at least 16 characters is now required whenever obfuscation is on. A production build without one fails with a ready-to-paste random seed, and `npx tailcloak init` writes a `tailcloak.config.ts` with a random seed at your repository root.

Config files now stack: every `tailcloak.config.ts` from the workspace root down to the app is read, and the closest file wins option by option. The app's `package.json` name is now mixed into every hash, so apps sharing a seed get different names. This changes all generated names once.
