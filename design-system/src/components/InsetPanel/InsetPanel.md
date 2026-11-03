---
name: InsetPanel
level: atom
status: stable
---

# InsetPanel

The recessed panel inside a widget: a step of the widget's own surface, so a
row inside a card reads as belonging to it rather than floating next to it.

## Anatomy

1. **Well** — a `div`, one step of the surface it sits on.
2. **Corners** — 16px.
3. **Padding** — 16px on every side.
4. **Content** — a row, a list, a short piece of copy.

## When to use it

- A row inside a widget that belongs to it rather than to the page: a step,
  a case, a fact.
- A list of short items inside a card, when the card's own padding would
  leave them floating.

## When not to use it

- **A card of its own** → a `Widget`: the inset is inside one.
- **A group of blocks side by side** → a row of `Widget`s in a grid.
- **The window a public page sits in** → an `InsetFrame`: that one is the
  page's own frame.

## Interaction

None. The inset is layout: it does not scroll, it does not move and it
takes no pointer.

## Writing

None. The inset holds content and never writes a word of its own.

## Accessibility

- A generic `div`: no role, no name.
- Focus moves through the content inside it; nothing is trapped at the edge.

## Do and don't

- ✅ Keep the inset inside the widget it belongs to.
- ✅ Use it for the rows that are content, not for a second layer of
  decoration.
- ❌ One inset inside another: the steps of the surface multiply.
- ❌ The whole card: that is the widget's own job.
