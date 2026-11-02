---
name: MonoLabel
level: atom
status: stable
---

# MonoLabel

The "::LABEL" that names a card or a section in the landing's instrument
voice: two tight colons, then the name in mono caps, in `cream-dim`. It is
the trail-dashboard look of the marketing pages — _Cómo funciona_ over a
section title, _Pack Sustentación_ at the top of a pricing card.

## Anatomy

1. **Colons** — `::`, tracked tight (`-0.1em`), drawn by the component and
   hidden from assistive technology.
2. **Name** — `font-mono` (JetBrains Mono), `text-xs`, medium, `uppercase`,
   `0.06em` tracking, `cream-dim`. Written in sentence case in the source.

It is a `<p>` with no surface, padding or margin of its own; the caller
places it.

## When to use it

- The name of a card on the landing: a pricing tier (_Pack Sustentación_,
  _Pase Intensivo_), a widget.
- A section's label above its title: _Cómo funciona_ over _De tu PDF a tu
  acta en una tarde._
- A short lead-in at the start of a row of chips: _Con el formato de jurado
  de_ before the countries, with `className="shrink-0"`.

## When not to use it

- **The kicker above a heading inside the signed-in product** → `Eyebrow`.
- **The block's entry in the list of headings** → a real heading under the
  label; the label is a paragraph.
- **A status of the current screen** → `Badge`.
- **A sentence or a message** → body text, or `Notice`.

## Interaction

None. Not focusable, no hover, no press, no motion of its own. An entrance
belongs to the block it names (`FadeRise` in the product).

## Writing

- A noun phrase that names the block, sentence case, no period: _Cómo
  funciona_, _Precios_, _Además_. The style uppercases it.
- The name of a thing, not a pitch: the heading under it makes the claim.
- 1–4 words, about 28 characters. Spaced mono caps run wide; a label that
  wraps is a sentence that wants to be body text.
- Don't type the colons. The component draws them.

## Accessibility

- Read as its text, as a paragraph. The colons are `aria-hidden`, so a
  screen reader does not say "colon colon" before every card.
- The uppercase is `text-transform`, so the source stays in sentence case and
  is read as words, not spelled out letter by letter.
- Pass `lang` when the label's language differs from the page's.
- Contrast: `cream-dim` is ≥ 9.8:1 on every page and card surface in both
  themes, ≥ 9.2:1 on a lifted inset.

## Do and don't

- ✅ Sentence case in the source; the style does the caps.
- ✅ A real heading under a section label.
- ✅ One label per card, at its top.
- ❌ Typed colons on top of the drawn ones.
- ❌ A sentence in spaced caps.
- ❌ MonoLabel as the kicker inside the signed-in product.
