---
name: Segmented
level: molecule
status: stable
---

# Segmented

A pill of two to five options where exactly one is chosen: the theme
(_Sistema_, _Oscuro_, _Claro_), a filter on the interview history (_Todas_,
_Con informe_), the length of the exposition (_15 min_, _20 min_, _30 min_).
A thumb in the card colour sits under the choice and slides to the next one,
so the eye follows the change instead of hunting for it. To assistive
technology it is a radio group.

## Anatomy

1. **Track** — a fully rounded pill on the lifted surface (`bg-surface-lift`),
   44px tall, as wide as its options need and never wider than its container.
2. **Thumb** — a `surface-card` pill under the chosen option, inset 4px from
   the track. Decorative, `aria-hidden`.
3. **Options** — equal slots, each the full height of the track (the hit
   target is 44px tall, at least 48px wide). Labels are 14px semibold
   (`text-xs` in this scale), `cream-dim` at rest and `cream-bright` when
   chosen.

## When to use it

- Choosing one of two to five mutually exclusive values whose effect is
  immediate: the theme, a list filter, _Tiempo de exposición_.
- Switching between two or three views of the same content in place: _Hoja de
  defensa_ and _Tarjetas_ in the study material.

## When not to use it

- **Six or more options, or options that need a sentence each** → a radio list
  or a select.
- **Sections of a page, each with its own panel** → a tablist
  (`role="tab"` + `tabpanel`), as the settings screen does for _Cuenta_,
  _Sustentación_, _Asesor e institución_, _Apariencia_ and _Plan_.
- **Running an action** — copy, download, send → `Action`, one per action.
- **One setting that is on or off** → a checkbox.
- **A status the person is not changing** → `Badge`.

## Interaction

- **Pointer**: press an option to choose it. Pressing the one already chosen
  does nothing, and `onChange` does not fire.
- **Keyboard**: one tab stop — Tab lands on the chosen option. ArrowRight or
  ArrowDown moves to the next option and chooses it; ArrowLeft or ArrowUp the
  previous one. Both wrap at the ends. Home and End jump to the first and the
  last. In a right-to-left document ArrowLeft and ArrowRight swap, so the
  arrow you press is the way the thumb moves.
- **Controlled**: the component never holds the value. Store what `onChange`
  gives you and pass it back as `value`. Apply it at once — a Segmented never
  waits for a Save.
- **Hover** brightens an unselected label, only on devices that can hover.

## Motion

- The thumb slides with `transform` only, 200ms on the press curve
  (`ease-press`). The slots are equal widths, so it moves by whole slots:
  nothing is measured, nothing reflows, and the thumb is in place on the first
  paint.
- The label colour crossfades on the same curve.
- Under `prefers-reduced-motion: reduce` the thumb appears under the new
  option without sliding (`motion-safe:` in the class itself); the colour
  change still acknowledges the choice.

## Writing

- Labels are values, not actions: nouns or short phrases — _Oscuro_, _Con
  informe_, _20 min_. A verb in a label means it wanted to be an `Action`.
- Parallel across the set: _Hoja de defensa_ / _Tarjetas_.
- Sentence case, no period, no exclamation mark. 1–3 words, about 20
  characters — every slot is as wide as the longest label.
- Numbers as digits, formatted by the caller: _15 min_.
- The `label` prop is the field's name, the same words a sighted person reads
  beside it: _Tema_, _Tiempo de exposición_.

## Accessibility

- `role="radiogroup"` named by `label`; each option is a `role="radio"` button
  with `aria-checked`. A screen reader announces "radio button, checked, 2 of
  3".
- Roving tabindex: only the chosen option is in the tab order (the first one
  when `value` matches nothing).
- Focus uses the system's `focus-ring`: 2px accent, offset in the page colour,
  keyboard only.
- The chosen option is marked twice — the thumb and a brighter label — and
  `aria-checked` says it to assistive technology, so colour is never the only
  signal.
- Contrast: `cream-dim` on the lifted track and `cream-bright` on the card
  thumb both clear 4.5:1 in both themes.

## Do and don't

- ✅ Short, parallel labels, two to five of them.
- ✅ A `label` that matches the visible field name.
- ✅ Apply the choice immediately.
- ❌ Actions as options (_Copiar enlace_, _Descargar imagen_).
- ❌ Six options, or a Segmented standing in for page tabs.
- ❌ Recolouring the thumb to mark one option as the recommended one.
