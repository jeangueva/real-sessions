# The Figma library

The library lives at
[Mockio Design System](https://www.figma.com/design/jmdQwNqGso3sQoUpcME5g8).
It is a view of this package, not a second source: the code decides, Figma
follows, and a script says when they disagree.

## What pairs with what

| Code | Figma |
| --- | --- |
| A colour variable in `src/tokens/tokens.css` (`--surface-card`) | A variable in the **Color** collection (`background/surface`), Light and Dark modes, aliased to a **Primitives** scale |
| `rounded-*` in the preset | **Radius** collection (`radius/card`) |
| Tailwind spacing steps | **Spacing** collection (`space/24`) |
| `text-*` sizes in the preset, plus the weights set at the call site | Text styles (`Desktop/Title`, `Label`) |
| `--shadow-*` | Effect styles (`Elevation/Lift/Light`, `…/Dark`) |
| Lucide icons the product imports | Components `icon/<name>` on the Iconografía page |

`src/tokens/figma-map.js` is the only hand-written pairing. From it,
`npm run tokens` writes `src/tokens/figma.json`: every Figma token with the
value it must hold in each theme. `npm run check` fails while figma.json is
stale, and `test/tokens.test.ts` fails when a colour variable has no Figma
pairing or a pairing names a variable that is gone.

The Primitives scales (`amber/50…950`, `neutral/0…1000`) exist only in Figma.
They are anchored on the product's exact values; semantic variables alias
them. They are not tokens the code knows about.

## Keeping them in step

An agent with the Figma MCP (`use_figma`) does this; a person reviews it.

1. **Measure.** `node scripts/figma-script.mjs drift` prints a read-only
   script with figma.json inlined. Run it with `use_figma` in the file above.
   It returns `drift`: every token whose Figma value differs from the code,
   with both values. Empty means in step.
2. **Decide.** Drift has two causes. The code changed and Figma has not
   caught up — push. Or a designer changed Figma first — that is a proposal:
   change `tokens.css` (and `web/src/index.css`, which the tests keep equal)
   in a PR, then push. Never push over a designer's change without asking.
3. **Push.** `node scripts/figma-script.mjs push` prints the script that
   makes Figma hold figma.json. A semantic variable is aliased to the
   primitive that already holds its exact value; when none does, it creates
   `unmatched/…` and reports it, for a person to name or fold into a scale.
4. **Measure again.** `drift` must come back empty. `fontFallbacks` lists
   families the file cannot load (Inter Tight, until it is installed there);
   those styles use Inter and say so in their description.

## When a token is added or renamed

Add it to `tokens.css` and `web/src/index.css`, pair it in `figma-map.js`,
run `npm run tokens`, then push. A colour without a pairing fails the tests,
so it cannot be forgotten.
