---
title: The Figma library
group: Guides
order: 6
summary: The Figma library as a view of this package — what pairs with what, the script that checks the two agree, and how to push a change.
---

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
| Instance swap | Action → `Icon` (any `icon/*`, with preferred icons) |
| Slot | Panel → `Content`: free content, with a description and preferred instances |
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

A Panel has no padding of its own; its `Content` is a native slot, so an
instance takes any content, the way `children` does in code (see
`Pack Sustentación_example`).

Descriptions are written from the contracts by `npm run figma:docs`: the
summary, when to use it, what to use instead, **Also known as** (the aliases
in `COMPONENTS`) and the import line; each component also links to its
`.md`. Push writes them; never type a description in Figma.

## Examples and guidelines

- **05 · Examples** holds polished compositions as components named
  `*_example` — the pricing card from AGENTS.md and the rehearse screen at
  1200px and 375px — built only from instances, with product copy. Agents
  use them as references for how the system comes together.
- **00 · Guidelines** shows the rules of AGENTS.md and every contract's
  do / don't, generated by `npm run figma:docs`.

## Audit

`npm run -s figma:audit` prints a read-only script that checks the library
against the agent-readiness checklist: meaningful layer names, resizing
(auto layout or scaling constraints), preferred instances on every swap and
slot, at most 30 variants per set, a description with aliases and a doc link
on every component, every colour, radius and spacing on a variable and every
text on a style (spacing the scale lacks is reported as `off-scale`), an
Examples page with `_example` components, and a Guidelines card per
component. Content placed in a slot is audited; the rest of an instance
belongs to its main component. Brand art (Mark, Mascot, Wordmark) is exempt
from the value rules. The `ds-library-audit` skill runs it until it is empty.

The **Resize check** frame on the Componentes page holds instances with long
and translated copy at several widths; screenshot it after changing a
component and compare with the code's `line-clamp-*` and wrapping.

## When a token is added or renamed

Add it to `tokens.css` and `web/src/index.css`, pair it in `figma-map.js`,
run `npm run tokens`, then push. A colour without a pairing fails the tests,
so it cannot be forgotten.
