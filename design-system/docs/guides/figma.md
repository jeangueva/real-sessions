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

## Components

`COMPONENTS` in `figma-map.js` lists every component folder with the node of
its component (set) on the **04 · Componentes** page, or `figma: null` and the
reason it is not drawn (animation, layout, brand art waiting on the code). A
new folder fails `test/contracts.test.ts` until it has an entry.

Figma properties mirror the contract's `designTool.canvasProps`, in the four
kinds Figma has:

| Kind | Example |
| --- | --- |
| Text | Action → `Label`, PageHeader → `Title`, `Meta` |
| Boolean | Action → `With arrow`, PageHeader → `Show meta`, `Show actions` |
| Instance swap | Action → `Icon` (any `icon/*`), Panel → `Content` |
| Nested instance | PageHeader → its `Actions` is an exposed Action |

Variants are the contract's unions and states: Action is `Tone × State`,
Panel is `Variant`, PageHeader is `Size × Compact`. Each component's
description carries its import line and the path of its contract.

`drift` checks that each listed node exists and has exactly the properties
the map names. It does not compare pixels: a component is drawn and reviewed
by a person, not pushed. When a contract gains or loses a prop, update the
component in Figma and its `properties` here in the same PR.

Brand art is the exception to "bind everything": Mark draws with its four
fixed colours, as `Mark.tsx` does, and Mascot holds the package's own six
PNGs. The contracts test compares both with the product's copies, so a
recolour in `web/` fails until the system and then the library follow.

A Panel has no padding of its own; its `Content` slot swaps in a component
you build for the content (see `Ejemplo/Pack Sustentación`, the fragment
from AGENTS.md made only of instances).

## When a token is added or renamed

Add it to `tokens.css` and `web/src/index.css`, pair it in `figma-map.js`,
run `npm run tokens`, then push. A colour without a pairing fails the tests,
so it cannot be forgotten.
