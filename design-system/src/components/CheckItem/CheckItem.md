---
name: CheckItem
level: atom
status: stable
---

# CheckItem

One row of a checklist of what you get: a check in the accent, then the
words. The pricing cards and the early-access offer list what they include
with it — _Entrevistas ilimitadas_, _Tu CV en manos del entrevistador_ — so a
reader can scan a plan in a second.

## Anatomy

1. **Row** — an `<li>`, flex, 10px gap; text 16px (`text-sm` in this scale)
   in `cream-dim`.
2. **Check** — 16px lucide `Check`, stroke 2.5, in `accent-text`, aligned to
   the first line of text and never shrunk. `aria-hidden`.
3. **Words** — one span, so a bold phrase or a link stays in the sentence.

## Composition

The caller owns the list, and the words that say what the checks mean:

```tsx
<dl>
  <dt>Qué incluye</dt>
  <dd>
    <ul className="mt-4 flex flex-col gap-3">
      <CheckItem>Entrevistas ilimitadas</CheckItem>
      <CheckItem>Todo lo del plan gratis</CheckItem>
    </ul>
  </dd>
</dl>
```

A heading or a paragraph before the list works as well, or `aria-label` /
`aria-labelledby` on the `<ul>`. Spacing between rows is the list's
(`gap-3`), never the item's.

## When to use it

- Listing what a plan or an offer includes: the free and Premium cards, the
  early-access offer.
- Any short list where every row is a yes — something the reader gets.

## When not to use it

- **Something the user ticks** → `Checkbox`.
- **Steps in order** → an ordered list with numbers. A check says _included_
  or _done_, not _next_.
- **What one plan has and another lacks** → a table with a column per plan,
  so a missing feature is stated rather than implied by a missing row.
- **Plain bullets** → a `<ul>` with a small dot, as the journey cards use.

## Interaction

None. A row is not focusable and does not respond to the pointer. A link
inside the words is a normal link with its own focus ring.

## Writing

- A noun phrase that names what you get: _Historial y progreso completos_,
  _Entrevistadores en español y portugués_.
- Concrete beats abstract: _Tu CV en manos del entrevistador_, not
  _Personalización_.
- Sentence case, no final period, no exclamation mark.
- Rows of one list share a shape and a length, so they scan as one list.
- One line where possible (about 48 characters), two at most.

## Accessibility

- Announced as a list item inside "list, N items", then its words. The check
  is hidden, so the label before the list must say what the rows share.
- Outside a `<ul>` or `<ol>` the `<li>` is invalid and no list is announced.
- Contrast: text ≥ 9.8:1 on every page and card surface in both themes; the
  check ≥ 4.94:1, above the 3:1 asked of a graphic.
- Right-to-left: the check stays at the start of the row (the right edge);
  the glyph is not mirrored.

## Do and don't

- ✅ A `<ul>` with a label before it, rows in `flex-col gap-3`.
- ✅ Rows of the same shape and length.
- ❌ CheckItems outside a list.
- ❌ A check on something that is not included.
