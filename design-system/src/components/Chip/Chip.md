---
name: Chip
level: atom
status: stable
---

# Chip

A fact in mono caps on an amber wash. The countries whose jury format the
panel follows, in the band under the landing's hero; the _Recomendado_ over
the featured pricing tier. A chip is never a control: it does not press,
toggle or close.

## Anatomy

1. **Fill** — by `tone`: `soft` is `bg-accent-soft` (a dark amber wash on
   the dark theme, a pale peach on the light one); `accent` is `bg-accent`.
2. **Text** — `font-mono text-xs` medium, `uppercase`, `0.06em` tracking, in
   the tone's ink (`text-cream` on soft, `text-accent-ink` on accent).
3. **Shape** — `rounded-lg` (8px), `px-3 py-1.5`, `inline-flex` with `gap-2`
   for an optional leading icon.

## When to use it

- A row of facts on the landing, after a `MonoLabel` lead-in: _Con el formato
  de jurado de_ → _Perú_, _Brasil_, _Colombia_…
- The one chip that marks the recommended tier: `tone="accent"`, in the
  featured `Widget`'s header.

## When not to use it

- **Something pressed, toggled or dismissed** → `Action`; a choice of one
  among a few → `Segmented`.
- **The status of the screen or call** → `Badge`.
- **The name of a card or a section** → `MonoLabel`.
- **A ticked item of what a plan includes** → `CheckItem`.

## Interaction

None. A `<span>`, not focusable, no hover, no motion. Don't give it an
`onClick`: a keyboard cannot reach it and a screen reader does not know it
does anything.

## Writing

- A noun or a short noun phrase in sentence case, no period: _Perú_,
  _Recomendado_. The style uppercases it.
- A fact the reader can check — not a pitch, not an instruction.
- 1–3 words, about 20 characters. A chip that wraps is a sentence.

## Accessibility

- Read as its words, in sentence case (the uppercase is CSS). A row of chips
  is a `<ul>`, so it is announced as a list with its count.
- Contrast: `soft` is 11.0:1 on dark and 13.3:1 on light; `accent` is 7.7:1
  in both. The fill's edge against the page is decoration.

## Do and don't

- ✅ A `<ul>` with one `<li>` per chip.
- ✅ Sentence case in the source.
- ✅ One `tone="accent"` chip per view.
- ❌ `onClick` or a hover on a chip.
- ❌ `bg-*`, `text-*` or a hex value through `className` — pick the tone.
- ❌ A sentence in a chip.
