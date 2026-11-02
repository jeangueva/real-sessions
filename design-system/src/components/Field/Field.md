---
name: Field
level: molecule
status: stable
---

# Field

A form control with its label above it and, when it needs one, a hint
below: _Email_, _Contraseña_ with _Al menos 8 caracteres. Una frase funciona
bien._, _Modo por defecto_ with what the choice changes. Every form in the
product, from sign-in to settings, uses the same column, so labels and hints
sit at the same distance everywhere.

Field draws no box of its own. The well, its border and the focus halo
belong to the control's `field-control` class, so an input, a select and a
textarea look like one family.

## Anatomy

1. **Column**: `flex flex-col gap-2`, full width of its container.
2. **Label**: a native `<label>`, `text-xs font-medium` in `cream`, tied to
   the control by `htmlFor`.
3. **Control** _(children)_: an `<input>`, `<select>` or `<textarea>` with
   `field-control text-sm text-cream-bright` (and
   `placeholder:text-cream-faint`, `resize-none` on a textarea): the
   `surface-card` well, a `line-strong` border, `rounded-xl`.
4. **Hint** _(optional)_: `text-xs` in `cream-faint`, under the control.

## When to use it

- Any control that needs a visible label: sign-in, reset password, the
  early-access form, settings.
- A setting whose effect needs a sentence: the hint says what it changes
  (_Se usa para precargar las sesiones nuevas._).
- A control that names itself, such as the language radiogroup or the theme
  Segmented in settings, when it should still get the label and hint layout.
  Leave `htmlFor` off and give the control its own `aria-label`.

## When not to use it

- **What happened after a submit** → `Notice`, below the fields and above
  the Action.
- **A heading over a group of fields** → `Eyebrow`, with the Fields under
  it.
- **A checkbox or toggle labelled beside it** → a native `<label>` wrapping
  it; Field stacks the label above.
- **A list of what a plan includes** → `CheckItem`.

## Interaction

Field has none of its own. A click on the label focuses the control. When the
control takes keyboard focus, `field-control` turns its border to the accent
and spreads a soft accent halo around the well, over 200ms on the UI
ease-out. The transition only recolours, so it runs the same under reduced
motion.

## Writing

- **Label**: a noun phrase, sentence case, no colon: _Tu nombre_, _Rol al
  que apuntas_. 1–5 words; it should not wrap at 320px.
- **Hint**: full sentences with a period, about what the value is for or the
  rule it must meet. Two sentences at most.
- An optional field says so first: _Opcional. Nos dice qué empleador
  construir después._
- Tú, never usted: _Empresa que tienes en mente_.
- The placeholder is an example (_you@example.com_, _Nubank_), never the
  label.

## Accessibility

- Always pass `htmlFor` and the same `id` on a native control. Without it the
  label names nothing and the control is announced unnamed.
- The hint is not linked on its own. When it carries a rule the person needs
  while typing, pass `hintId` and set `aria-describedby` on the control to the
  same value, so it is read on focus.
- A self-naming control placed without `htmlFor` carries its own
  `aria-label`.
- Contrast: the label is ≥ 12.9:1 on every surface; the hint ≥ 4.6:1 (light
  theme on `surface-deep`, the tightest); the control's border ≥ 3.5:1
  against its own fill in both themes.

## Do and don't

- ✅ `htmlFor` on the Field, the matching `id` on the control.
- ✅ The rule in the hint, before anyone types, wired with `hintId`.
- ✅ `field-control` on every native control.
- ❌ A placeholder standing in for the label.
- ❌ An error swapped into the hint; say what happened in a `Notice`.
- ❌ A border or box drawn around the Field.
