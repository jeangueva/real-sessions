---
name: Widget
level: molecule
status: stable
---

# Widget

A cream card floating on the page: no shadow, a hairline at most, and an
optional label above its content in the instrument voice. The public site's
own block, and the one the signed-in product borrows for its training
screens.

## Anatomy

1. **Card** — a `div`, the card surface, with a hairline around it.
2. **Corners** — 22px, between the card's 20px and the inset's 28px.
3. **Padding** — 20px on a phone, 24px from `sm` up.
4. **Label** — a `MonoLabel`, when the block is named: `::CÓMO FUNCIONA`.
5. **Content** — the block's own content, in a flex column with 16px
   between the parts.

## When to use it

- The public site: a block of the page with a label above it, side by side
  with other blocks.
- The signed-in product: the training screens, where a block of the
  conversation sits in a card.

## When not to use it

- **A card inside the signed-in app** → `Panel`: it is the app's surface,
  with a shadow and no padding of its own.
- **A page band** → a `Section`: the band owns the vertical rhythm of the
  page.
- **A card the person presses** → a link or a button styled with the card
  tokens: a widget has no press.

## Interaction

None. The widget is a card: no focus, no hover, no press. A block that is
pressable is a link or a button.

## Writing

- The label names the block in the instrument voice, in caps, 1–3 words:
  `::CÓMO FUNCIONA`.
- The content inside is the product's own copy, not the widget's.

## Accessibility

- A generic `div`: no role, no name.
- The label is a paragraph, so a screen reader hears it before the content
  it names.
- Nothing is trapped at the widget's edge: focus moves through the content.

## Do and don't

- ✅ Give it a label when the block's purpose is not obvious from its
  content.
- ✅ Let the blocks in a row share the same height with `h-full`.
- ❌ A widget inside a widget: the hairline doubles and the radius fights
  itself.
- ❌ An `Action` in the label: the label is a name, not a control.
