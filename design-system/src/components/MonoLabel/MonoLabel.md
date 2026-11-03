---
name: MonoLabel
level: atom
status: stable
---

# MonoLabel

The name of a block, in the instrument voice: mono, capitals, a tight `::` in
front. It is the label on a card, not the heading under it.

## Anatomy

1. **Colons** — a tight `::` before the name, hidden from screen readers.
2. **Name** — 14px mono, medium weight, uppercase, tracking 0.06em, in
   cream-dim.

## When to use it

- On a card, naming what the card holds: `::GENERAL`, `::TU CUENTA`.
- On a dashboard panel, in the voice the panels are written in.
- Anywhere the product needs a marker rather than a heading.

## When not to use it

- **The title of a screen or a section** → a heading: the title of
  `PageHeader`, an `h2` inside a `Section`.
- **A status on one item** → `Badge`.
- **The kicker above a landing page's heading** → `Eyebrow`.

## Interaction

None. The label is a paragraph: it has no focus, no hover and no press, so it
never looks like something to tap.

## Writing

- A noun phrase, not a sentence: "general", "tu cuenta", "Qué funcionó".
- Write the words in the case you want them read; the component sets the
  capitals.
- No final period, no colon of your own, no exclamation mark.

## Accessibility

- The `::` is `aria-hidden`: the label is read as "GENERAL", not as "colon
  colon GENERAL".
- It is a paragraph on purpose. Do not give it a heading role — the block it
  names has its own heading, and two names make the headings list lie.
- cream-dim on every surface it sits on: 13.0:1 dark, 9.9:1 light.

## Do and don't

- ✅ Keep one label per block, at its top-left.
- ✅ Shorten the name rather than wrapping it.
- ❌ Use it as the only name of a block.
- ❌ Give it a heading role.
- ❌ Set the colour or the case through `className`.
