---
title: Getting started
group: Guides
order: 1
summary: What the package is, the five files every component owns, how to run the site and how to use the components inside and outside the monorepo.
---

# Getting started

`@mockio/design-system` is Mockio's design system as one self-contained
folder: the tokens, the components, a contract for each component that says
what it promises, previews that show every state, and the guidance for
writing and composing screens. It is a Vite + React 18 + Tailwind 3 project
with a `components.json`, so the same folder is the documentation site, the
test suite, a shadcn registry and a project a design tool can open.

It does not import anything from the product (`web/`). The product keeps its
own copy of most components today, and the drift guard (see
[Contributing](./contributing.md)) fails when the two stop matching.

## What is in the folder

| Path | What it is |
| --- | --- |
| `src/components/<Name>/` | One folder per component, with the five files below |
| `src/tokens/tokens.css` | The palette, shadows and curves as CSS variables, both themes. The source of every token |
| `src/tokens/tailwind-preset.js` | The Tailwind v3 preset: the utility names (`bg-surface-card`, `text-cream-dim`, `rounded-card`) |
| `src/tokens/theme.css` | Generated. The same theme for Tailwind v4 (`@theme inline`) and shadcn-style tools |
| `src/tokens/tokens.json` | Generated. The tokens in the W3C Design Tokens format, for tools that do not read CSS |
| `src/styles.css` | The base stylesheet: Tailwind layers, tokens and the few component classes (`focus-ring`, `liquid-glass`, `field-control`, `on-media`) |
| `src/contract.ts`, `src/preview.ts` | The types every contract and preview file follows |
| `src/catalog.ts` | Finds every component by folder; the site and the tests read it |
| `docs/foundations/`, `docs/guides/` | System-level guidance: colour, type, motion, voice, and these guides |
| `app/`, `index.html` | The documentation site |
| `registry.json` | Generated. Every item in the shadcn registry format, contracts included |
| `components.json` | Tells shadcn-aware tools where components, utils and styles live |
| `AGENTS.md` | The rules for an AI agent working in this folder |

## The five files

Every component lives in `src/components/<Name>/` and owns exactly these:

| File | What it holds |
| --- | --- |
| `<Name>.tsx` | The code: what ships |
| `<Name>.contract.ts` | The promises: props, states, events, motion, accessibility, content, usage, i18n, responsive behaviour, the design-tool mapping, the product counterpart, version and changelog |
| `<Name>.previews.tsx` | The specimens: the default, every state the contract names, edge cases, the component in context and, where it teaches something, a misuse |
| `<Name>.md` | The guidance: anatomy, when to use it and when not, interaction, writing, accessibility, do and don't |
| `index.ts` | The public exports: the component, its types, its contract and its previews |

A folder can also hold helpers and assets (the `Mascot` folder has
`assets/level-1.png` to `level-6.png`). The registry ships them with the
component.

Nothing is registered by hand. `src/catalog.ts` reads the folders, so a new
folder appears on the site and in the tests as soon as it exists, and
`test/contracts.test.ts` fails until all five files are there.

## Run it

```sh
cd design-system
npm install          # .npmrc sets legacy-peer-deps, which this tree needs
npm run dev          # the documentation site, with hot reload
npm run check        # everything CI runs: tokens, registry, types, tests
npm run build        # the static site, in dist/
```

The other scripts:

| Script | What it does |
| --- | --- |
| `npm run tokens` | Regenerates `tokens.json` and `theme.css` from `tokens.css` and the preset |
| `npm run registry` | Regenerates `registry.json` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | `vitest run`: contracts, previews (rendered and checked with axe), tokens |

The built site is also published inside the company at `/ds/` on the admin
service (`mockio-admin`), behind the admin sign-in. The admin's build command
builds it; there is nothing to deploy by hand.

## Use the components in this monorepo

Inside the package, imports are relative (`../Action`), and the site and the
tests use the `@ds/*` alias for `src/*`.

The product (`web/`) cannot import the package today: the Docker image builds
the client from `web/` alone, and `web/test/package-boundary.test.ts` fails on
any import outside `web/`. So the product keeps its own copy of each
component, the contract's `appCounterpart` names that copy, and the tests
check it still exists. Until that architecture call changes, treat the package
as the reference and port changes across by hand, in the same pull request.

Other code in the monorepo that is not `web/` (an internal tool) can import the
source directly, as long as its toolchain compiles TSX and runs Tailwind with
the preset:

```tsx
import { Action } from "../design-system/src";
import "../design-system/src/styles.css";
```

## Use the components outside the monorepo

There are three ways in, from the most to the least coupled.

**1. As source, from the package.** It is published as TypeScript source
(`"main": "src/index.ts"`), so the consumer's bundler compiles it. Add the
package as a dependency (a `file:` path, a git URL or an internal registry),
install the peers (`react`, `react-dom`, `framer-motion`, `lucide-react`), then:

```js
// tailwind.config.js (Tailwind v3)
import mockio from "@mockio/design-system/tailwind-preset";
export default {
  presets: [mockio],
  content: ["./src/**/*.{ts,tsx}", "./node_modules/@mockio/design-system/src/**/*.{ts,tsx}"],
};
```

```css
/* Tailwind v4 */
@import "tailwindcss";
@import "@mockio/design-system/theme.css";
@source "../node_modules/@mockio/design-system/src";
```

```tsx
import "@mockio/design-system/styles.css"; // v3 only: it uses @tailwind directives
import { Action } from "@mockio/design-system";

export function Siguiente() {
  return (
    <Action tone="solid" withArrow>
      Ensayar mi sustentación
    </Action>
  );
}
```

The exports are `.`, `./tokens.css`, `./theme.css`, `./styles.css`,
`./tailwind-preset`, `./tokens.json` and `./registry.json`.

**2. File by file, through the registry.** The shadcn CLI, or any tool that
reads the shadcn registry format, copies the files into the consumer's project
and installs the theme. See [The registry](./registry.md).

**3. As a project, in a design tool.** Open this folder (or its repository) as
the project. See [Lunagraph](./lunagraph.md).

## Themes

Dark is the default and lives on `:root`. Light applies with
`data-theme="light"` on `<html>` or on any subtree. `theme.css` also accepts
`.dark` / `data-theme="dark"` and `.light`, for tools that toggle a class.
Components never pick a colour themselves: they read tokens, so the same
markup themes without a class changing.
