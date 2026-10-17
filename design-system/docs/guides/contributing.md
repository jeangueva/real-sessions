---
title: Contributing
group: Guides
order: 4
summary: How to add or change a component — the five files, contract versions and the changelog, the checks, the drift guard with the product, and the review checklist.
---

# Contributing

A component is done when its five files agree with each other and with the
product. The checks enforce most of that; the review checklist covers the
rest.

## Add a component

1. **Check it is not already here.** Read the catalogue on the site and the
   `related` field of the nearest contracts. A new tone of an existing
   component is a variant, not a new component.
2. **Create the folder**, `src/components/<Name>/`, PascalCase, the name the
   component is exported as.
3. **Write the five files:**
   - `<Name>.tsx`: the component. A typed `<Name>Props` interface, every prop
     with a JSDoc line. Tokens only (`bg-surface-card`, `text-cream-dim`,
     `rounded-card`), never a raw colour, radius or shadow. Relative imports
     inside the package; nothing from `@/…` and no hooks from the product
     (`useT`, `useLocale`). User-facing default strings in Spanish, each one
     overridable by a prop.
   - `<Name>.contract.ts`: `export const <Name>Contract = defineContract({...})`.
     Every field of `ComponentContract` in `src/contract.ts`. Content examples
     are real strings from the product (`web/src/lib/thesis-copy.ts`,
     `web/src/lib/i18n.ts`), quoted, not invented.
   - `<Name>.previews.tsx`: `export const <Name>Previews = definePreviews([...])`.
     A `default`, one `state` preview for every state in the contract (hover,
     pressed and focus-visible excepted), edge cases (long copy, phone width),
     an `in-context` fragment and, where it teaches something, a `misuse`
     with a `why`.
   - `<Name>.md`: frontmatter with `name`, `level`, `status`, then the
     sections Anatomy, When to use it, When not to use it, Interaction,
     Writing, Accessibility, Do and don't.
   - `index.ts`: export the component, its types, `<Name>Contract` and
     `<Name>Previews`.
4. **Export it** from `src/index.ts` (`export * from "./components/<Name>";`).
5. **Regenerate**: `npm run registry`.
6. **Run** `npm run check` until it passes.

Assets go in the component's folder (`src/components/<Name>/assets/`) and are
imported relatively, so the registry ships them with the component.

## Change a component

Change the code, the contract, the previews and the guidance in the same pull
request. A contract that no longer describes the code is a false promise, and
the next person (or assistant) will build on it.

### Contract versions and the changelog

Each contract has a `version` (semver) and a `changelog`, newest first. The
newest entry's version must equal `version`, or the tests fail.

| Change | Bump |
| --- | --- |
| A prop removed or renamed, a default changed, a state removed, a value no longer accepted | Major (`2.0.0`) |
| A new optional prop, a new state, a new variant | Minor (`1.1.0`) |
| A fix that keeps every promise (a contrast fix, a bug, wording in the contract) | Patch (`1.0.1`) |

Write the changelog entry for the person updating a screen: what changed and
what they have to do, not how it was implemented.

A component going away is marked `status: "deprecated"` first, with the
replacement named in `usage.whenNot[].instead`, and removed in a later major.

## The checks

`npm run check` runs, in order:

1. `node scripts/build-tokens.mjs --check`: `tokens.json` and `theme.css`
   match `tokens.css` and the preset.
2. `npx tsx scripts/build-registry.ts --check`: `registry.json` matches the
   folders, and every relative import resolves to a file some item ships.
3. `tsc --noEmit`.
4. `vitest run`:
   - **contracts**: every folder has its five files and is exported; the
     contract names its own file; documented props exist in the source and
     every declared prop is documented; every state has a preview; misuses
     have a reason; `composes` and `related` name components that exist;
     i18n, responsive, design-tool and version fields are filled in; the
     guidance has its sections
   - **previews**: every preview renders, and passes axe
   - **tokens**: dark and light declare the same variables, `tokens.json`
     describes all of them, and they match the product (below)

CI runs the same command (`npm --prefix design-system run check`) and then
builds the site.

Changed a token? Edit `src/tokens/tokens.css` (and the preset if a name
changes), run `npm run tokens`, and make the same change in
`web/src/index.css`.

## The drift guard with the product

The product cannot import this package (the web client builds from `web/`
alone), so it keeps its own copies. Two tests stop the copies from wandering
off:

- **Tokens**: `test/tokens.test.ts` compares the variables in
  `src/tokens/tokens.css` with `web/src/index.css`, both themes, value for
  value.
- **Counterparts**: a contract's `appCounterpart` names the product's copy
  (`file` under `web/src`, `exportName`) and the deliberate `differences`.
  `test/contracts.test.ts` fails if that file is gone or no longer exports the
  name.

Both run only when `../web` exists, so they are skipped in a split-out
repository (see [Separate repository](./separate-repo.md)).

When you change a component that has a counterpart, change the product's copy
in the same pull request, or list the new difference in `differences`.

## Review checklist

- [ ] All five files changed together; the contract describes the code as it
      is now.
- [ ] `version` bumped by the rule above, with a changelog entry a consumer
      can act on.
- [ ] Tokens only: no hex, `rgb()`, pixel radius or raw shadow in a class.
- [ ] No import from the product, no `useT` / `useLocale` / `useThesisT`.
- [ ] One solid `Action` per view, in every preview and example.
- [ ] Copy: Spanish first, tú, sentence case, verbs first on actions, no
      exclamation marks, gender-neutral; examples quoted from the product.
- [ ] Every user-facing default string can be overridden by a prop, and is
      listed in `i18n.strings`.
- [ ] Keyboard, focus ring, target size, reduced motion and contrast in both
      themes, as the contract's `accessibility` says.
- [ ] Works at 320px and in right-to-left (arrows mirror, numbers do not).
- [ ] The product's counterpart updated, or the difference recorded.
- [ ] Nothing derived from React Bits or other code whose licence forbids
      redistribution: the registry hands these files to other tools.
- [ ] `npm run check` passes locally.
