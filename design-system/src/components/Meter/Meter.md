---
name: Meter
level: atom
status: stable
---

# Meter

A measured amount on a known scale: the vocabulary score out of ten in the
feedback report (_Vocabulario 7/10_), the XP into the next level on the
progress screen. A label, the number, and under them a bar that fills to the
proportion. The number always carries the meaning; the bar only helps the eye
compare a few scores side by side.

## Anatomy

1. **Label** — 14px (`text-xs` in this scale) in `cream-dim`, at the start
   of the row. What is measured, and the meter's accessible name.
2. **Number** — `text-sm` semibold, `tabular-nums`, `cream-bright`, at the
   end of the row: `value` followed by `suffix` (`%`, `/10`, or nothing).
3. **Track** — 6px tall, `rounded-full`, the lifted surface
   (`bg-surface-lift`), with `role="meter"`.
4. **Fill** — the accent, scaled to `value / max` and clamped to the track.

## When to use it

- A score on a fixed scale in a report: _Vocabulario_ and _Estructura_ out of
  ten, side by side.
- How far into a level someone is: `label="1240 XP en total"`, `suffix=""`,
  with a caption under it for what is left (_160 XP para el nivel 5_).
- A few proportions with a known top that are worth comparing at a glance.

## When not to use it

- **Something loading or being evaluated** → a sentence that names it
  (_Evaluando…_). A meter announces a finished measurement.
- **A status in words** → `Badge`.
- **The one headline score of a report** → the number in display type; the
  meters are the supporting scores beside it.
- **A choice between options** → `Segmented`.

## Interaction

None. A meter is not focusable and has no hover or press. When `value`
changes the fill eases to its new length over 700ms on the cinematic curve,
a slow settle so a new score lands rather than jumps; the first render draws
it at its value with no entrance (an entrance is the caller's, `FadeRise` in
the product). Under `prefers-reduced-motion: reduce` the package's global
rule drops transform from transitions and the bar changes at once.

A value above `max` prints as passed (_12/10_) while the bar stops at full; a
`max` of 0 or less draws an empty bar instead of dividing by zero.

## Writing

- The label is a noun in sentence case, no period: _Vocabulario_,
  _Estructura_, _General_.
- It may carry its own count, formatted by the caller: _1240 XP en total_
  with `suffix=""`.
- Never a verdict in the label (_Mal vocabulario_): the number says how it
  went; the words around the meter say what to do next.
- 1–4 words, about 28 characters, so it stays on one line beside the number.
- The suffix matches the scale: `/10` with `max={10}`, `%` with the default
  `max={100}`.

## Accessibility

- The track is a `role="meter"` named by the label, with `aria-valuenow`,
  `aria-valuemin={0}` and `aria-valuemax` set from the props, unclamped, so a
  screen reader hears the number a sighted reader sees.
- The suffix is not part of the value: _/10_ is heard only in the printed
  text before the meter.
- Contrast: the number is `cream-bright`, ≥ 14:1 on every surface in both
  themes; the label `cream-dim`, ≥ 9.2:1. The accent fill is a graphic and
  never the only signal.
- Right to left: the row follows the document direction and the fill grows
  from the right. Digits are not mirrored.

## Do and don't

- ✅ Pass the suffix that matches the scale.
- ✅ Put related meters in one grid so the bars compare.
- ✅ Say in words, near the meters, what the scores mean for the next step.
- ❌ A meter as a loading bar.
- ❌ Recolouring the fill to mark a low score.
- ❌ Hiding the number and leaving the bar alone.
