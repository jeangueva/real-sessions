---
name: Inset
level: atom
status: stable
---

# Inset

The darker well inside a `Widget`. It groups one piece of the widget's
content — a numbered row of _El producto_, the price of a tier, the number
and title of a step — and recedes where the widget rises.

## Anatomy

1. **Well** — `rounded-2xl` (1rem), `bg-surface-lift`, `p-4`. No edge, no
   shadow.
2. **Content** — one group, laid out by the caller's `className`
   (`flex items-center gap-3 p-3` for a row with an `IconTile`,
   `flex items-baseline justify-between px-4 py-3` for a row with a meta).

`surface-lift` is a wash, not a colour: 7% white over the card on the dark
theme, 6% ink on the light one. That is what makes it a recess — and why it
needs a card behind it.

## When to use it

- Rows of a list inside a widget: the product's three points, the six
  degrees with their minutes and questions.
- The figure of a pricing tier, apart from its list.
- The head of a step: its `IconTile` and title, with the body below on the
  card.

## When not to use it

- **On the page ground** → `Widget` (landing) or `Panel` (app). With no card
  behind it, the wash reads as nothing.
- **A row someone presses or picks** → a link or a button with its own
  states; a choice of one among a few is `Segmented`.
- **A message** → `Notice`.

## Interaction

None. Not focusable, no hover, no motion: it moves with its widget. It does
not clip, so a focus ring inside it shows whole.

## Writing

- One line per row, sentence case, no period in a list: _Deliberación y acta
  con la escala de tu país_.
- A meta beside it in mono caps and `cream-dim`: _15 min · 12 preguntas_.
- One group per inset. A row past two lines is body copy, not a row.

## Accessibility

- A plain `<div>`, read as its content. A list of insets is a real
  `<ul>`/`<ol>` with one `Inset` per `<li>`.
- Contrast on the well: `cream-bright` 11.6:1 dark and 13.9:1 light,
  `cream-dim` 8.1:1 and 8.4:1. The well's edge against the card is
  decoration.

## Do and don't

- ✅ Inside a `Widget` or a `Panel`.
- ✅ Tighter padding for a row through `className`.
- ✅ A real list around a list of insets.
- ❌ An Inset inside an Inset.
- ❌ A border or a shadow on it.
- ❌ An Inset on the page ground.
