---
name: IconTile
level: atom
status: stable
---

# IconTile

The small amber-tint square of the widget kit. It holds a step number —
_01_, _02_, _03_ in _Cómo funciona_ and _El producto_ — or one icon, at the
head of an `Inset` row or a step. It is drawing: hidden from assistive
technology, it shows what the words beside it already say.

## Anatomy

1. **Tile** — 40px square (`h-10 w-10`), `rounded-xl`, `bg-accent-soft`,
   `shrink-0`.
2. **Content** — two digits in `font-mono text-sm` medium, or an icon at
   `h-5 w-5`, centred, in `accent-text`.

## When to use it

- The number of a step or a point in an ordered list on the landing.
- An icon at the head of an `Inset` row, repeating its words.

## When not to use it

- **An icon that is the only label of something** → words, or an icon with
  an accessible name in the control. The tile is always `aria-hidden`.
- **A tick on what a plan includes** → `CheckItem`.
- **A status or an amount someone has to read** → `Badge`, `Meter`.
- **The brand** → `Mark`.

## Interaction

None. Not focusable, no motion; it moves with its row.

## Writing

- Numbers in two digits with the leading zero: _01_, _02_, _03_. Western
  digits in every locale; numbers do not mirror.
- One icon that repeats the words beside it — never instead of them.
- No words inside the tile.

## Accessibility

- Always `aria-hidden`, and the component applies it after any props, so it
  cannot be switched off. A screen reader hears the list position from the
  `<ol>` and the row's words, never "zero one".
- Contrast of the figure on its fill: `accent-text` on `accent-soft` is 8.9:1
  dark, 4.8:1 light. The tile's fill against the card is decoration.

## Do and don't

- ✅ Tiles inside an `<ol>` when they number things.
- ✅ The words beside every tile.
- ✅ _01_, _02_, _03_.
- ❌ A word inside the tile.
- ❌ A row of tiles with nothing beside them.
- ❌ A different colour per row.
