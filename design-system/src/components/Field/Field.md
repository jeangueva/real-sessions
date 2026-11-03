---
name: Field
level: molecule
status: stable
---

# Field

A labelled form control: the name above it, the control, a hint below it. The
component owns the spacing and the label's voice; the caller owns the control.

## Anatomy

1. **Label** — the name of the control, at 14px, medium weight, in cream.
2. **Control** — whatever the caller passes: an input, a select, a textarea.
3. **Hint** _(optional)_ — one line under the control, in cream-faint.

## When to use it

- Every control in a form that has a name.
- A control that needs a hint: what it wants goes under it, where the eye
  already is.

## When not to use it

- **A control with no name** → the bare control, with its own placeholder.
- **A choice between two or three options** → a radio group with its own
  labels.
- **Instructions about the form as a whole** → a `Notice` above the form.

## Interaction

The field does not interact. The control inside it keeps its own focus ring,
its own keyboard behaviour and its own states — the `Field` only puts the
name and the hint where they belong.

Give the control an `id` and pass it as `htmlFor`, so the label names it for a
screen reader too.

## Writing

- The label names the control in the person's own words: _Tu nombre_, _Correo_,
  _Título de tu tesis_. Never "Campo" or "Input".
- The hint says what the control wants, not what it is: _El jurado la lee
  antes de cada ensayo._
- Sentence case, no final period, no exclamation marks.

## Accessibility

- The label is a real `<label>`; with `htmlFor` it is the control's accessible
  name.
- The hint is a plain paragraph. When a screen reader has to hear it with the
  control, point the control's `aria-describedby` at the hint's id.
- The label is cream, at least 13:1 on its surface in both themes; the hint is
  cream-faint, the lowest step the palette allows.
- The control inside brings the focus ring: 2px accent, 2px offset.

## Do and don't

- ✅ Give the control an id and pass it as `htmlFor`.
- ✅ Keep the order the same everywhere: label, control, hint.
- ❌ Put instructions about the whole form in a field's hint.
- ❌ Restyle the label with `className`.
