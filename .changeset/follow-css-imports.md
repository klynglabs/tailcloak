---
"tailcloak": minor
"@tailcloak/next": minor
"@tailcloak/vite": minor
---

Tailwind stylesheets are now found through the app's imports, so a stylesheet in a shared workspace package works without setting `css`, whether the app imports it from JS (`import "@acme/ui/globals.css"`) or from its own stylesheet (`@import "@acme/ui/globals.css"`). Imports resolve through the package's `exports`, including the `style` condition.

A production build without any Tailwind stylesheet, or with a `css` path that doesn't exist, now fails at startup with one message instead of warning and shipping unobfuscated class names. A successful build prints one line naming the stylesheets it uses, e.g. `[tailcloak] Obfuscating Tailwind classes from app/globals.css`. Every message, including errors, starts with `[tailcloak]` and prints without internal stack frames.

`npx tailcloak init` now writes a typed config (`import type` with `satisfies TailcloakConfig`), which loads even where `tailcloak` isn't installed.
