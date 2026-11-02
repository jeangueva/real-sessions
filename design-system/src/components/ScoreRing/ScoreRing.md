---
name: ScoreRing
level: atom
status: stable
---

# ScoreRing

The one headline score of a finished session, drawn as a ring that fills to
the percentage: the overall score at the end of an interview, the score on a
session's detail, a shared report, how much of the daily goal is done. The
number sits in the middle and carries the meaning; the ring is a picture of
it, and the one moment in the product allowed a little delight.

## Anatomy

1. **Wrapper** — a fixed square of `size` pixels (168 by default), `shrink-0`.
2. **Track** — the full circle in the lifted surface (`text-surface-lift`).
3. **Stroke** — 12/120 of the ring's width, round caps, starting at twelve
   o'clock. Its colour is the score's band:

   | Score | Stroke | Means |
   | --- | --- | --- |
   | 70 and above | `grow` | What improved |
   | 40–69 | `accent` | The way forward |
   | Below 40 | `step` (orange) | What to work on next |

   Never red: nothing in this product marks a person wrong.
4. **Middle** _(children)_ — the rounded number in display type with a
   smaller `%` in `cream-faint`; or, on Today once the goal is met, a check
   on `grow`.

## When to use it

- The headline score of a finished interview: _General_, _72%_.
- The daily goal on Today, with _Meta del día_ and _{xp} de {goal} XP_ under
  it, or _Meta cumplida._ once it is done.
- One per view: it is the headline.

## When not to use it

- **The supporting scores beside the headline** → `Meter`.
- **A wait, an evaluation in progress** → a sentence that names it
  (_Evaluando…_).
- **A verdict in words on a piece of the work** → `Tag`.
- **A status of the screen** → `Badge`.

## Interaction

None. The ring is not focusable and has no hover or press. On mount the
stroke draws itself from empty to the score on a spring (1.2s, a small
bounce, after 0.25s); a later change of `value` springs from where it is.
Under `prefers-reduced-motion: reduce` it is drawn at its value from the
first frame and changes without a transition.

`value` is clamped to 0–100 for the ring only: 120 draws a full ring, -5 and
`NaN` an empty one. What is printed is up to the caller.

## Writing

- Inside, the number and nothing else: digits, then a smaller `%`.
- Round before printing: _72%_, never _71.6%_.
- The label (_General_) and the verdict (_Vas muy bien. Un par de ajustes y
  lo tienes._) sit outside the ring, as text.
- At size 96, at most four characters inside (_100%_).

## Accessibility

- The ring's `<svg>` is `aria-hidden`: a screen reader hears only the
  children, the number. A ring with nothing inside says nothing.
- A check or icon in the middle carries `aria-hidden`; the words that say
  the goal is met go in a caption beside it.
- Contrast: on the dark card the strokes are 7.4–8.6:1; on the light card
  only 1.6–2.0:1. The stroke is never the only signal, which is why the
  number is always printed (`cream-bright`, ≥ 14:1 everywhere).
- Right to left: the ring fills clockwise from twelve o'clock in every
  direction, like a clock. Digits are not mirrored.

## Do and don't

- ✅ Print the rounded number inside.
- ✅ Put the verdict and the next step beside it, in words.
- ✅ One ring per view.
- ❌ A ring with no number.
- ❌ A ring as a spinner for a wait.
- ❌ Recolouring the stroke, or red for a low score.
