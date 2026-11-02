---
name: Meter
level: molecule
status: stable
---

# Meter

A measured score: what is being measured, the number, and the bar that fills
to it. The number is always there — the bar is the quick reading, the figure
is the real one.

## Anatomy

1. **Name** — what is measured, at 14px in cream-dim.
2. **Figure** — the number and its unit, at 16px, semibold, tabular figures.
3. **Bar** — 6px tall, in the accent over a lifted surface, growing from the
   left.

## When to use it

- A score the person earned and can see: clarity, turns, answers practised.
- Any value measured against a maximum, where the bar and the number say the
  same thing.

## When not to use it

- **A step in a process** → a `Badge` with the count: _Turno 3 de 7_.
- **A value with no maximum** → the number alone, in the body of the screen.
- **Something that loads** → a progress indicator in the place that waits.

## Interaction

The meter does not take input. It reports a value: `value` against `max`, with
the bar clamped to the ends of the scale so a figure above the maximum cannot
draw more than the whole.

## Writing

- The name says what is measured: _Claridad_, _Tu turno_, _Respuestas
  practicadas_.
- The suffix is short — `%`, or nothing for a count. "Puntos" belongs in the
  name, not in the suffix.
- The figure is printed as it is, without a thousands separator.

## Accessibility

- The bar is a `role="meter"` with its value, its minimum and its maximum, and
  the same name as the text above it: a screen reader hears _Claridad, 72_.
- The number is never left out, and the colour is never the only way to read
  the score.
- The name is cream-dim (13:1 dark, 9.9:1 light); the figure is cream-bright.

## Do and don't

- ✅ Set `max` to the real maximum, so the bar and the number agree.
- ✅ Keep the figure: the bar alone is unreadable for a screen reader.
- ❌ Leave `max` at 100 when the scale ends somewhere else.
- ❌ Use the bar to hide a number the person needs to act on.
