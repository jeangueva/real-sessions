---
name: Widget
level: molecule
status: stable
---

# Widget

The card of the landing's widget kit — the trail-dashboard look of every
section below the hero. A card-coloured surface floating on the page with no
shadow and only a hairline ring, padding of its own, its content stacked with
one gap, and an optional `::LABEL` naming it at the top. _El producto_, the
three steps of _Cómo funciona_, each pricing tier and the small facts under
_Además_ are all Widgets.

## Anatomy

1. **Surface** — `bg-surface-card`, `rounded-card` (1.25rem), no shadow.
2. **Edge** — `ring-1 ring-line`, a hairline; `featured` swaps it for
   `ring-2 ring-accent`.
3. **Label** (optional) — a `MonoLabel` drawn from the `label` prop.
4. **Content** — the caller's children, in a column with `gap-4`, inside
   `p-5` (`p-6` from `sm`).

Groups inside it are `Inset`s; a step number or icon at the head of a group
is an `IconTile`; a fact in mono caps is a `Chip`. The four read as one kit.

## When to use it

- A card on the landing or a marketing page: a feature beside its screen, a
  step, a pricing tier, a small fact in a grid.
- A grid of equal cards — all Widgets, all `h-full`, `gap-3`.
- The recommended tier of a set — `featured`, with a `Chip tone="accent"`
  saying _Recomendado_.

## When not to use it

- **A block on a signed-in app screen** → `Panel`, which carries the card
  shadow and leaves the padding to you.
- **A group inside a widget** → `Inset`. Never a Widget in a Widget.
- **A card pressed as a whole** → a link styled with the card tokens, with
  its own focus ring. Widget has no hover, focus or pressed state.
- **Content over footage** → `Panel variant="glass"` inside `.on-media`.
- **The page band, its gutters and width** → `Section`.

## Interaction

None. A Widget is not focusable and does not respond to the pointer, and it
has no motion of its own: on the landing it enters with its block
(`FadeRise`), staggered across a grid. Links and Actions inside keep their own
states; the widget does not clip, so their focus rings show whole.

Don't add a hover lift or a shadow: the kit is flat on purpose, and a lift
promises a press that never comes.

## Writing

- The label names the widget, sentence case, no period: _El producto_,
  _La videollamada_, _Escenarios_. 1–4 words.
- The heading under it makes the claim: _Un jurado que leyó tu tesis.
  Completa._ Use an `h3` inside a landing section whose title is the `h2`.
- Body in the tú form, up to three short lines, no exclamation marks.
- One solid `Action` across a whole set of widgets — in pricing, only the
  featured tier's.

## Accessibility

- A plain `<div>`; nothing is announced for the surface. The label is read as
  a paragraph, without its colons.
- Native `<div>` attributes pass through, so a widget can be a named
  `region` (with `aria-labelledby`) or a `<dl>` group wrapper.
- Contrast: `cream-dim` on `surface-card` is 9.8:1 dark and 9.1:1 light. The
  hairline is decoration (the card is 1.21:1 against the page on dark,
  1.05:1 on light), so nothing may rely on seeing the edge.
- `featured` is not announced, and its accent ring is only 1.57:1 against the
  card on the light theme — so the recommendation is always said in words, by
  the accent `Chip`.

## Do and don't

- ✅ `label` for the widget's name, a real heading under it for the claim.
- ✅ `h-full` on widgets in a grid.
- ✅ `featured` plus `<Chip tone="accent">Recomendado</Chip>`.
- ✅ `Inset` for each group inside.
- ❌ A Widget inside a Widget.
- ❌ A shadow or `hover:shadow-lift`.
- ❌ `ring-*` or `bg-*` through `className` — `ring-line` wins over an added
  ring colour; use `featured`.
- ❌ Colons typed into `label`.
