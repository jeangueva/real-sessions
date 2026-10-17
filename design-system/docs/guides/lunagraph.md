---
title: Lunagraph
group: Guides
order: 2
summary: How to bring the system into Lunagraph — as a project or through the registry — what the canvas will see, what to tell Claude Code there, a checklist, and what is still unverified.
---

# Bringing the system into Lunagraph

Lunagraph is a design canvas that runs on Claude Code. It opens a React +
Tailwind project with shadcn-style components and puts its components and
styles on the canvas. This folder is built to be that project.

> **Read the last section first.** The vendor's site could not be reached when
> this guide was written, so how Lunagraph opens a project is described from
> second-hand summaries. Everything below that depends on Lunagraph's
> behaviour is marked, and the checklist is how you confirm it.

## Two ways in

### 1. Open the folder as the project (recommended)

`design-system/` is a self-contained Vite + React 18 + Tailwind 3 project:

- `package.json` with its own lockfile and `.npmrc`
- `tailwind.config.js` using the system's own preset
- `src/styles.css` with the Tailwind layers and the tokens
- `components.json` in the shadcn format, so a shadcn-aware tool knows where
  things live: components in `src/components`, the `cn` helper in
  `src/lib/utils.ts`, the stylesheet in `src/styles.css`, the alias `@ds/*`
  for `src/*`
- `CLAUDE.md`, which loads `AGENTS.md`, so Claude Code knows the rules

Point Lunagraph at the `design-system/` folder of a local clone, or at the
design system's own repository if it has been split out (see
[Separate repository](./separate-repo.md)). If it asks for the project root,
it is the folder that contains `components.json`, not the monorepo root: the
monorepo root is a Node server with no Tailwind config, and a tool that opens
it will find no components.

Run `npm install` in the folder first if Lunagraph does not do it for you.

### 2. Install items from the registry into another project

If the canvas works on a different project (the product, a prototype), install
the system into it from `registry.json`:

```sh
cd design-system && npx shadcn@latest build     # writes public/r/<name>.json
# then, in the other project, with "@mockio" mapped in its components.json:
npx shadcn@latest add @mockio/action
```

`mockio-theme` brings the tokens and both Tailwind setups, each component item
brings its whole folder (code, contract, previews, guidance, assets) and pulls
`mockio-theme` and anything it composes, and `mockio-guidelines` brings the
Markdown guidance. Details in [The registry](./registry.md).

## Tailwind v3 or v4

| The project uses | Use | How |
| --- | --- | --- |
| Tailwind 3 (this folder) | `src/tokens/tailwind-preset.js` | `presets: [preset]` in `tailwind.config.js`, and import `src/styles.css` |
| Tailwind 4 | `src/tokens/theme.css` | `@import "tailwindcss";` then `@import ".../theme.css";`, plus an `@source` for the components |
| shadcn `cssVars` only | the `mockio-theme` item | the CLI writes the variables into the project's CSS; add `class="dark"` to `<html>` for Mockio's default look |

All three are generated from `src/tokens/tokens.css`, so they cannot disagree.
The class names are the same under v3 and v4 (`bg-surface-card`,
`text-cream-dim`, `border-line`, `rounded-card`, `shadow-lift`, `ease-press`),
so a component reads the same under either.

One gap: `src/styles.css` (the component classes `focus-ring`,
`liquid-glass`, `field-control`, `on-media`) is written for Tailwind 3. In a
v4 project, components that use those classes lose their focus ring and glass
until the classes are ported. Use v3 for the canvas unless Lunagraph requires
v4.

## What the canvas will see

If Lunagraph reads the project the way a shadcn-aware tool does:

- **Components**: every folder in `src/components/`. The component is
  `<Name>.tsx`; the other four files in the folder are not components.
  `index.ts` re-exports the component together with its contract and previews.
- **Tokens**: the colours, radii, shadows, curves and type scale from the
  Tailwind preset; the variables themselves in `src/tokens/tokens.css`;
  `tokens.json` for a tool that reads the W3C format.
- **Specimens**: `<Name>.previews.tsx` exports an array of previews, each with
  a `render()` function, the code it shows, a theme and a width. They are
  ready-made frames: the default, each state, edge cases, the component in
  context and misuses (marked `kind: "misuse"`; never copy those).
- **Properties**: each contract's `designTool.canvasProps` lists the props a
  designer should edit from a properties panel, in order of importance, and
  `designTool.placement` says where the component may be dropped.

Unverified: whether Lunagraph discovers components by folder, by
`components.json`, by `index.ts` exports or by some other rule, and whether it
renders the preview arrays. If it shows only top-level files, point it at
`src/index.ts`, which exports everything.

## What to tell Claude Code there

Lunagraph runs Claude Code, which reads `CLAUDE.md` in the project root. Ours
contains `@AGENTS.md`, so the rules load on their own. When you start, say it
anyway:

> Read AGENTS.md. Build the screen only from the components in
> src/components, with the tokens from the Tailwind preset. One solid Action
> per view. Copy in Spanish, tú, sentence case, no exclamation marks. Run
> `npm run check` before you finish.

For a new screen, give it the job and the real copy, not the layout:

> Una pantalla para elegir el plan: título "Elige tu plan", un Panel por
> plan ("Pack Sustentación": "5 sustentaciones con el panel de 3 · válido 6
> meses"; "Pase Intensivo": "20 sustentaciones y todos los modos · 30 días"),
> y un solo Action sólido: "Ensayar mi sustentación".

(Every string in that prompt is shipped copy, from `web/src/lib/thesis-copy.ts`.
Give Claude Code real strings: it will otherwise invent them.)

For a change to a component, ask for the contract, the previews and the
guidance to change with the code: the checks fail otherwise.

## Verification checklist

Do these once, the first time the system is opened in Lunagraph, and note the
answers in this guide.

1. [ ] The project opens without errors and `npm run dev` (or Lunagraph's own
   preview) shows the documentation site.
2. [ ] The canvas lists the components from `src/components`, by their names
   (`Action`, `Panel`, `Badge`…), and not the contract or preview files.
3. [ ] A dropped `Action` looks like it does on the site: the accent pill,
   40px tall, the darker edge underneath.
4. [ ] The theme is right: dark by default; `data-theme="light"` on the root
   turns it light. Check `bg-surface-card` and `text-cream-dim` in both.
5. [ ] The focus ring shows on keyboard focus (it comes from `src/styles.css`;
   if it is missing, the stylesheet is not loaded).
6. [ ] The `Mascot` images load (they are files in `src/components/Mascot/assets/`).
7. [ ] `framer-motion` 11 and `lucide-react` 0.468 resolve in the canvas
   runtime (they are peer dependencies).
8. [ ] Claude Code inside Lunagraph has read `AGENTS.md`: ask it for the rules
   of this folder and check it names the five files and `npm run check`.
9. [ ] A screen Claude Code builds there passes `npm run check` when you run it
   in a terminal.
10. [ ] Changes made on the canvas land as edits to files in this folder, and
    show up in `git diff`.

## Unverified

Lunagraph's site (lunagraph.com) did not resolve from the environment this was
written in, so nothing here comes from its documentation. What is assumed,
from search summaries only, and not confirmed:

- That it opens a local folder or a GitHub repository as the project, and
  which of the two.
- That it reads `components.json`, and which fields it uses.
- How it discovers components (folder, exports, `components.json` aliases).
- Which Tailwind version its runtime expects; if v4 only, the preset is
  ignored and `src/styles.css` (v3 directives) breaks, so use `theme.css`.
- Whether it can install from a shadcn registry URL, and whether it needs the
  registry hosted or accepts a file.
- Whether it renders preview arrays or only components.
- That its Claude Code reads `CLAUDE.md` from the opened folder, as Claude
  Code does elsewhere.
- That its runtime accepts the peer versions above.

One limit that is not a guess: components derived from React Bits in the
product (under the Commons Clause) must not be added to this folder or its
registry, because handing them to a third-party tool is the redistribution
that licence forbids. Only clean-room components live here.
