---
name: Panel
level: atom
status: stable
---

# Panel

The surface. Every card, block and sheet in Mockio — the upload step on
_Mi tesis_, a pricing tier, the sign-out row in Settings, the wait while a
thesis is read — sits on a `Panel`. It is a rounded fill with the card shadow
and nothing else: no padding, no hover, no press. That is why the same
component can hold all of them.

## Anatomy

1. **Surface** — `rounded-card` (1.25rem), `overflow-hidden`, and the
   variant's fill.
2. **Edge** — the `shadow-card` token, which carries its own hairline. There
   is no border: the shadow separates the panel from a white page and from
   `#F5F5F7` alike.
3. **Content** — whatever the caller puts in, with the caller's padding
   (`p-6 sm:p-8` for a block, `p-5` for a row).

## Variants

| Variant | Fill | Use it for |
| --- | --- | --- |
| `card` (default) | `surface-card` + `shadow-card` | Siblings in a grid: tiers, settings sections, list rows |
| `raised` | `surface-raised` + `shadow-card` | One block on the page ground: an upload step, an empty state, a wait |
| `glass` | `.liquid-glass` | Over video or imagery, inside `.on-media`; on a plain page, an error message or a tabbed sheet |

On the light theme `card` and `raised` are the same white; the difference
only shows on the dark theme, where `raised` is a step darker.

## When to use it

- A block of content that belongs together: a step, a form section, an empty
  state, a wait, a tier.
- A grid of equal items — all `card`, all `h-full`, so the row lines up.
- Content over footage — `glass` inside `.on-media`.
- The message of a screen that failed to load — `glass`, with
  `role="alert"` on the sentence.

## When not to use it

- **A card you press as a whole** (a session row, a nav tile) → a link or a
  button styled with the card tokens itself:
  `focus-ring rounded-2xl bg-surface-card shadow-card hover:shadow-lift`.
  Panel has no hover, focus or pressed state.
- **A group inside a panel** → an inset well,
  `rounded-2xl bg-surface-lift p-4`. Never a Panel in a Panel.
- **A one-line message about the screen's state** → `Notice`.
- **A card that opens and closes** → `Disclosure`.
- **Page gutters and width** → `PageBody` in the app, `Section` on a
  marketing page.

## Interaction

None. A Panel is not focusable and does not respond to the pointer. Whatever
inside it is interactive — an `Action`, a field, a link — brings its own
states.

Keep at least `p-5` between a control and the panel's edge: `overflow-hidden`
clips anything past the rounded corner, including a focus ring's 2px offset.

## Composition

- **Heading level** — an `h2` on an app screen (under `PageHeader`'s `h1`),
  an `h3` inside a landing `Section` whose own heading is the `h2`.
- **One primary per panel** — at most one solid `Action`.
- **Selection** — mark the recommended item of a set with
  `ring-2 ring-accent`, not a glow or a second colour.
- **Entrance** — a panel enters with the block around it (`FadeRise` on the
  caller), never on its own.

## Writing

- The first line says what the panel is for, as a heading or a plain
  sentence: _Sube tu tesis_, _Sesión iniciada en este dispositivo._
- A wait says what is happening and how long:
  _Leyendo tu tesis… puede tardar hasta dos minutos._
- An empty state says what the list is for and gives the first step:
  _Agrega el puesto para el que te estás preparando._
- One idea per panel: a heading, up to three short lines, one action. Body
  text at `max-w-prose` inside wide panels.

## Accessibility

- A plain `<div>`: nothing is announced for the surface itself.
- Every other `<div>` attribute is passed through, so the panel can carry the
  role it means:
  - `role="status"` around a wait, so the sentence is announced politely;
  - `role="alert"` on (or around) a failure;
  - `role="tabpanel"` with `id` and `aria-labelledby` under a tablist;
  - `role="region"` with `aria-labelledby` for a named block that belongs in
    the landmarks list. A region without a name is not a landmark.
- Contrast: every ink token clears AA on every surface in both themes — the
  tightest is `accent-text` on `card` in the dark theme, 4.94:1. The panel's
  own edge is decoration (1.15:1 dark, 1.09:1 light), so nothing may rely on
  seeing it.
- Over footage the picture sets the contrast: `.on-media` pins the ink to
  cream and the caller darkens the footage.

## Do and don't

- ✅ `card` for siblings in a grid, `raised` for one block on the page.
- ✅ Padding through `className`: `p-6 sm:p-8`.
- ✅ `role="status"` on a wait, `role="alert"` on a failure.
- ✅ `ring-2 ring-accent` on the recommended tier.
- ❌ `hover:shadow-lift` on a panel nothing happens on — it promises a press.
- ❌ A Panel inside a Panel.
- ❌ Recolouring with `bg-*` or `border-*` — pick the variant.
- ❌ `glass` for a grid of ordinary cards on a plain page — on the dark theme
  it reads as empty.
