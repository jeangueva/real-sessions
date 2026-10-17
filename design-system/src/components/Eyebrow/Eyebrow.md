---
name: Eyebrow
level: atom
status: stable
---

# Eyebrow

The short line in the accent above a heading. It tells the reader where they
are — _Precios_, _Acceso anticipado_, _Acta simulada_ — so the heading under
it can spend its words saying something. The system sets it apart with
colour and weight, never with spaced capitals.

## Anatomy

1. **Line** — one `<p>`, 16px semibold (`text-sm` in this scale), in
   `accent-text`. No icon, no container.
2. **What follows it** _(the caller's)_ — a heading on the landing, a value or
   a group of controls in the platform. The eyebrow is never the last thing
   in its block.

## When to use it

- Above a landing section's heading: _Precios_ over _Gratis para conseguir el
  trabajo. Después, al precio de tu país._
- Above a value in a platform card: _Nivel_ over the level, _Acta simulada_
  over the grade.
- As the label of a group of settings inside a card that already sits under
  the page's heading: _Apariencia_, _Cuenta_.

## When not to use it

- **The name of a section or a page** → a heading: the `h2` inside `Section`,
  or `PageHeader`'s title. The eyebrow goes above it, never in its place.
- **A status or a mode on one item** → `Badge`.
- **The label of a form field** → `Field`, whose label is tied to its input.
- **A sentence of explanation** → body text in `cream-dim` under the heading.

## Interaction

None. It is not focusable and does not respond to the pointer. It does not
animate on its own either: when a block enters with `FadeRise`, the eyebrow
enters with it.

## Writing

- A noun phrase of 1–4 words: _Precios_, _Qué esperar_, _Diapositiva por
  diapositiva_.
- It places; the heading says something. If the eyebrow needs a verb, it is
  the heading.
- Sentence case. No final period, no colon, no exclamation mark.
- About 32 characters keeps it on one line in a phone's column. Translations
  that run longer wrap, and that is fine — never truncate it.

## Internationalization

- Nothing mirrors. It follows the alignment of the text around it: the start
  edge in Arabic and Hebrew, centred in a centred landing header.
- Native attributes are spread onto the paragraph, so `lang` can mark an
  eyebrow written in another language from the page.

## Accessibility

- A paragraph, read just before the heading. Someone moving through the page
  by headings skips it, so the heading must stand on its own.
- Do not give it `role="heading"`: the section would have two names in the
  headings list, and the first would be the vaguer one.
- Contrast: `accent-text` is ≥ 4.94:1 on every dark page and card surface and
  ≥ 5.19:1 on the light ones. On a `surface-lift` row inside a dark card it
  drops to 4.05:1, so keep eyebrows off lifted rows.

## Do and don't

- ✅ Pair it with a heading that says something.
- ✅ One eyebrow per block; use `className` for spacing and grid spans.
- ❌ An eyebrow as the only title of a section.
- ❌ Spaced capitals, another colour, or a final period.
