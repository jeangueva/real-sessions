---
name: Chip
level: atom
status: stable
---

# Chip

A peach chip in mono caps: a fact, never a control. The instrument voice in
a warm wash — the name of a region, the three things a product does, the
price of a plan. It has no focus, no hover and no press, so it never looks
like something to tap.

## Anatomy

1. **Pill** — a `span`, the peach wash, rounded at 9px.
2. **Padding** — 12px on each side, 6px above and below.
3. **Voice** — mono, 12px, medium, uppercase, 0.06em of tracking.
4. **Ink** — the dark ink on the peach, the same in both themes.

## When to use it

- A fact about a product or a plan, next to the words it belongs to.
- A row of what a plan includes, one line each.

## When not to use it

- **A status of the current screen** → a `Badge`: the words carry the
  status, in the system's own voice.
- **Something the person can press** → an `Action`: a chip is a fact, never
  a control.
- **A label of a block** → a `MonoLabel`: the label is above the block, in
  the same voice.

## Interaction

None. A fact is read, not reached: no focus, no hover, no press. A chip that
moved would look pressable.

## Writing

- A fact in the instrument voice: caps, mono, 1–4 words.
- It names something the reader can verify: a region, a plan, a list of what
  is included.
- It never instructs. "Recomendado" names a plan; "Compra ahora" asks for
  something, and that is an `Action`.

## Accessibility

- The dark ink on the peach wash: over 12:1 in both themes, and the wash
  itself clears 3:1 against the card behind it.
- The chip is a `span`: the words inside are read like any other text.

## Do and don't

- ✅ Put it next to the words it qualifies.
- ✅ Keep it to a fact the reader can verify.
- ❌ A price in it: the price is a sentence.
- ❌ A border, a shadow or a hover: then it looks like a control.
