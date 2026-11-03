---
name: IconTile
level: atom
status: stable
---

# IconTile

A small amber-tint square holding an icon or a number. The trail-dashboard
way of numbering things: the number is in the tile and the tile is in the
accent, so a row of three reads as three steps before the reader has read a
word.

## Anatomy

1. **Square** — 40px on a side, with the accent's soft wash behind it.
2. **Corners** — 12px.
3. **Content** — an icon, or a figure in the instrument voice: `01`.
4. **Ink** — the accent's text colour.

## When to use it

- A numbered row: the tile holds the number and the words beside it hold
  the step.
- A row of icons that mark what a card is about.

## When not to use it

- **A number the reader has to read** → the number as text: the tile is a
  decoration next to words that already say it.
- **A status the reader has to know** → a `Badge`: the words carry the
  status.
- **An icon that is the only content** → nothing: a tile without words says
  nothing.

## Interaction

None. The tile is a decoration: no focus, no hover, no press.

## Writing

- A figure in the instrument voice: `01`, `02`, `03`.
- An icon at 16px, with no words of its own.

## Accessibility

- The tile is `aria-hidden`: it holds a figure or an icon that the words
  beside it already carry.
- The accent's text colour on its soft wash: over 4.5:1 in both themes.

## Do and don't

- ✅ Put the words beside it, not in it.
- ✅ Number the steps of a row with it.
- ❌ A number the reader has to count: the tile is hidden from them.
- ❌ An avatar: that is the mascot's job.
