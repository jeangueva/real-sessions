# Working in the Mockio design system

Instructions for AI agents: Claude Code, Claude Code inside Lunagraph, Codex,
any assistant editing this folder or building screens from it. Humans: the
same rules, longer, are in `docs/guides/contributing.md`.

This folder is a self-contained Vite + React 18 + Tailwind 3 project. It is
the source of Mockio's tokens and components; each component comes with a
contract (what it promises), previews (what it looks like in every state) and
guidance (how to use it and how to write for it).

## Before you change anything

1. Read the contract of every component you will touch or use:
   `src/components/<Name>/<Name>.contract.ts`. The `usage`, `content` and
   `accessibility` fields are rules, not suggestions.
2. Read its guidance: `src/components/<Name>/<Name>.md`.
3. For anything system-wide (colour, type, motion, voice), read
   `docs/foundations/`.
4. Run `npm install` if `node_modules` is missing.

## The five files

Every component lives in `src/components/<Name>/` and has exactly:

| File | Holds |
| --- | --- |
| `<Name>.tsx` | The component. What ships. |
| `<Name>.contract.ts` | `export const <Name>Contract = defineContract({...})`: props, states, events, motion, accessibility, content, usage, tokens, related, i18n, responsive, designTool, appCounterpart, version, changelog |
| `<Name>.previews.tsx` | `export const <Name>Previews = definePreviews([...])`: default, every state, edge cases, in-context, misuse |
| `<Name>.md` | Frontmatter (`name`, `level`, `status`), then Anatomy, When to use it, When not to use it, Interaction, Writing, Accessibility, Do and don't |
| `index.ts` | Exports the component, its types, the contract and the previews |

Helpers and assets may sit beside them (`Mascot/assets/`). Nothing is
registered by hand: `src/catalog.ts` finds folders, and the tests fail until
all five files exist and `src/index.ts` exports the folder.

## The rules

1. **One solid `Action` per view.** It is the next step. Everything else is
   `neutral`, `ghost` or, over imagery, `glass`.
2. **Tokens only.** Colours, radii, shadows and curves come from the Tailwind
   preset (`bg-surface-card`, `text-cream`, `text-cream-dim`, `border-line`,
   `bg-accent`, `rounded-card`, `shadow-lift`, `ease-press`, `text-title`).
   No hex, no `rgb()`, no arbitrary values for anything a token covers. Never
   red: nothing in this product marks a person wrong.
3. **No app imports.** Nothing from `@/…`, nothing from `../web`, no `useT`,
   `useLocale` or `useThesisT`. Imports inside the package are relative
   (`../Action`). Default strings are props with Spanish defaults.
4. **Contracts stay true.** Change the code and you change the contract, the
   previews and the guidance in the same edit. A new or removed prop or state
   means a `version` bump and a `changelog` entry (major for breaking, minor
   for additions, patch for fixes); the newest changelog entry equals
   `version`.
5. **Real copy.** Spanish first, tú (never vos or usted, outside the simulated
   jury), sentence case, actions start with a verb, no exclamation marks,
   gender-neutral, calm. Example copy is quoted from the product
   (`web/src/lib/thesis-copy.ts`, `web/src/lib/i18n.ts`), never invented:
   "Ensayar mi sustentación", "Sube tu tesis", "Ver planes", "Ahora no".
6. **Generated files are generated.** Do not edit `src/tokens/tokens.json`,
   `src/tokens/theme.css` or `registry.json`. Edit `src/tokens/tokens.css`
   or the preset and run `npm run tokens`; change components and run
   `npm run registry`.
7. **Run `npm run check` before you finish.** It checks generated files,
   types, contracts, previews (rendered and run through axe) and tokens. Do
   not report work as done while it fails.
8. **Nothing with a redistribution-restricted licence** (React Bits and
   similar). The registry hands these files to other tools.

Code comments, contract descriptions and Markdown guidance are in English.
Strings a person reads are in Spanish.

## Composing a screen

Build screens only from components in `src/components/`. Look at the
folders for what exists; each contract's `summary`, `usage.when` and
`usage.whenNot` (with `instead`) tell you which one fits.

1. Start from the job and the real copy, not a layout. Write down the one
   next step: it is the solid `Action`.
2. Pick components by their contracts. If none fits, say so: do not restyle a
   `div` to look like one, and do not invent a component inside a screen.
3. Use the previews as the reference for composition: the `in-context`
   previews are real product fragments.
4. Respect each contract's `designTool.placement` (where it may go) and
   `responsive.minWidth`.

A fragment, with shipped copy:

```tsx
import { Action, CheckItem, Eyebrow, Panel } from "./src";

export function PackSustentacion() {
  return (
    <Panel className="p-6 sm:p-8">
      <Eyebrow>Pack Sustentación</Eyebrow>
      <h2 className="mt-2 text-title text-cream">Ensaya con el panel de 3 jurados</h2>
      <ul className="mt-5 flex flex-col gap-3">
        <CheckItem>5 sustentaciones con el panel de 3 · válido 6 meses</CheckItem>
      </ul>
      <div className="mt-6 flex flex-wrap gap-3">
        <Action tone="solid" withArrow>Ensayar mi sustentación</Action>
        <Action tone="ghost">Ahora no</Action>
      </div>
    </Panel>
  );
}
```

## Adding or changing a component

1. Create or edit the five files (see above, and `docs/guides/contributing.md`).
2. Export a new folder from `src/index.ts`.
3. If the contract has an `appCounterpart`, the product keeps a copy in
   `web/src`; change it too, or record the difference in `differences`.
4. `npm run registry`, then `npm run check`.

## Commands

| Command | Does |
| --- | --- |
| `npm run dev` | The documentation site, with hot reload |
| `npm run check` | Everything CI runs |
| `npm run tokens` | Regenerates `tokens.json` and `theme.css` |
| `npm run registry` | Regenerates `registry.json` |
| `npm run build` | The static site, in `dist/` |
