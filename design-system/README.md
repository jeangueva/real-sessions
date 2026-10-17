# Mockio design system

The tokens, components and rules Mockio's interface is built from, in one
self-contained folder. Each component comes with a **contract** (the props,
states, accessibility and usage it promises, checked by tests), **previews**
(every state, rendered and run through axe) and **guidance** (how to use it and
how to write for it).

It is a Vite + React 18 + Tailwind 3 project with a `components.json`, so the
same folder is:

- the internal documentation site (`npm run dev`, hosted at `/ds/` on the
  admin service, behind its sign-in)
- a package other code can import as source (`@mockio/design-system`)
- a shadcn registry (`registry.json`) for the shadcn CLI and AI assistants
- a project a design canvas such as Lunagraph can open

## Quick start

```sh
npm install
npm run dev      # the site
npm run check    # tokens, registry, types and tests: what CI runs
npm run build    # the static site, in dist/
```

## Layout

```
src/components/<Name>/   one folder per component: the five files below
src/tokens/              tokens.css (the source), tailwind-preset.js (v3),
                         theme.css (v4, generated), tokens.json (generated)
src/styles.css           Tailwind layers, tokens and the component classes
src/contract.ts          the contract type
src/preview.ts           the preview type
docs/foundations/        colour, type, motion, voice
docs/guides/             how to use and extend the system
app/                     the documentation site
registry.json            generated, shadcn format, contracts under meta
```

Every component owns five files: `<Name>.tsx` (the code),
`<Name>.contract.ts` (the promises), `<Name>.previews.tsx` (the specimens),
`<Name>.md` (the guidance) and `index.ts` (the exports).

## Use it

```tsx
import "@mockio/design-system/styles.css";
import { Action } from "@mockio/design-system";

<Action tone="solid" withArrow>Ensayar mi sustentación</Action>;
```

On Tailwind 3, `import mockio from "@mockio/design-system/tailwind-preset"`
and `presets: [mockio]` in the config; on Tailwind 4,
`@import "@mockio/design-system/theme.css"` after `@import "tailwindcss"`.
Either way, add the package's `src` to Tailwind's content or `@source`.
Dark is the default; `data-theme="light"` on `<html>` turns it light.

## Guides

| Guide | For |
| --- | --- |
| [Getting started](docs/guides/getting-started.md) | What is here, how to run it, how to use it inside and outside the monorepo |
| [Lunagraph](docs/guides/lunagraph.md) | Bringing the system into the Lunagraph canvas |
| [The registry](docs/guides/registry.md) | `registry.json`, its items and `meta.contract` |
| [Contributing](docs/guides/contributing.md) | Adding or changing a component, versions, checks, review |
| [Separate repository](docs/guides/separate-repo.md) | Moving this folder to its own repository with its history |

AI agents and Claude Code: read [AGENTS.md](AGENTS.md).

## The rules, in short

One solid `Action` per view. Tokens only, never raw values. No imports from
the product. Contracts stay true to the code. Copy in Spanish first, tú,
sentence case, no exclamation marks. `npm run check` passes before anything
merges.
