---
name: ds-figma-sync
description: Bring the Mockio Figma library in step with design-system/ — measure drift between the code's tokens, styles and component docs and the Figma file, decide what wins, push, and measure again. Use after any change to tokens.css, the preset, figma-map.js or a component contract, or when someone says Figma and the code disagree.
---

# Sync the Figma library with the code

The code is the source. Figma is a view of it. This skill makes the view match,
and turns a change that started in Figma into a proposal for the code instead
of overwriting it.

Library: https://www.figma.com/design/jmdQwNqGso3sQoUpcME5g8
Guide: `design-system/docs/guides/figma.md`

## Before you start

1. Load the Figma MCP's `figma-use` skill (mandatory before `use_figma`).
2. `cd design-system && npm run tokens && npm run figma:docs` — regenerate
   `src/tokens/figma.json` and `src/tokens/figma-components.json` from the code.
3. `npm run check` must pass. If it fails, fix the code first: never push a
   broken source into Figma.

## Steps

1. **Measure.** `npm run -s figma:drift` prints a read-only script. Run it with
   `use_figma` in the library file. It returns `drift` (tokens, styles,
   component properties, descriptions, doc links, preferred instances).
2. **Decide, per entry:**
   - The code changed and Figma has not → push.
   - Figma changed first (a designer's edit) → do **not** push over it. Ask
     the person whether it should become the code. If yes, change
     `tokens.css` *and* `web/src/index.css` (the tests keep them equal) or the
     contract, open a PR, then push.
   - `fontFallbacks` is not drift: the family is not installed in that Figma.
3. **Push.** `npm run -s figma:push` prints the script that writes figma.json
   and figma-components.json into the file. It aliases semantic colours to the
   primitive holding the exact value; anything it had to invent appears under
   `unmatched` — tell the person, never leave it silently.
4. **Measure again.** `drift` must come back empty. Then run the
   `ds-library-audit` skill.

## Output

Report, in this order: what drifted and why, what you pushed, what you
created under `unmatched/`, what you left for a person to decide, and the
final drift (must be `[]`).

## Rules

- Generated files are generated: never edit `figma.json`,
  `figma-components.json`, `tokens.json`, `theme.css` or `registry.json`.
- Never parallelise `use_figma` calls, and pass `sessionId` on every call.
- The scripts are the procedure. If one is wrong, fix `scripts/figma-script.mjs`
  in the same PR rather than hand-editing the file around it.
