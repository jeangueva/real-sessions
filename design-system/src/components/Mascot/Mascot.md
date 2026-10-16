---
name: Mascot
level: atom
status: beta
---

# Mascot

Mocki, the parrot that grows up as the candidate does. A parrot because
parrots learn to speak by repeating out loud, which is what the interview
product asks of someone. Six illustrated forms, one per stage of the level
curve, each a step rather than a gradient — so reaching the next one is an
event, and the shape that changed is the thing people screenshot.

Mocki belongs to the **interview product's gamified layer**. It is not used in
Sustentación.

## Anatomy

1. **Illustration** — a 200×200 transparent PNG for the stage, shipped inside
   the component (`assets/level-1.png` … `level-6.png`), drawn at `size` px.
2. **Drop shadow** — `0 6px 10px` black at 12%, so Mocki stands on the card
   instead of floating over it. A `drop-shadow`, not a shadow token: the box
   shadows would draw a square around a transparent picture.
3. **Text alternative** — `alt`, by default _Mocki, nivel {level}_; empty
   when `decorative`.

## Stages

| `level` | Form | Where the product shows it |
| --- | --- | --- |
| 1 | Egg | The welcome checklist, an empty progress page, an unfinished interview |
| 2 | Hatchling | The free plan's card |
| 3 | Young parrot | Sign-in, the screen-failed message |
| 4 | Headset on | A report under 50% |
| 5 | On a stage with a microphone | A report from 50% |
| 6 | Crowned, with a medal | The premium plan's card, a report from 80% |

`level` is the **stage**, not the XP level. The product maps XP to a stage
(`lib/avatar.ts`, `tierForLevel`: stage 2 from level 2, 3 from 4, 4 from 7,
5 from 11, 6 from 16) and passes the result. The system knows nothing about
XP, so the curve can change without touching the component.

## Sizes

The masters are 200px, so up to 100px is sharp on a 2x screen. The product
draws it from 48px (pricing) to 96px (the screen-failed message), and larger
in two places that accept a little softness for size: 120px on the level-up
and 160px on the landing's habit section.

## When to use it

- The interview space's gamified moments: progress, a level-up, a report's
  result, the habit section of the landing.
- A first-run card in the interview space, where a face lowers the stakes.
- Showing which form a level earns, when the change is the reward.

## When not to use it

- **Anywhere in Sustentación** (the thesis landing, upload, diagnosis,
  rehearsal, acta, plan) → no character at all. That space speaks as a calm
  person beside the student, not a mascot. The brand is `Mark` or `Wordmark`;
  an empty or error state is plain copy in a `Panel` or a `Notice`.
- **As the logo** → `Mark` or `Wordmark`.
- **To show a number** (XP, a score, a level) → the number as text, or
  `Counter`. Mocki shows the stage, not the value.
- **While waiting** → `DotMatrix` with a sentence saying what is happening.

## Interaction

None. Mocki is an image: not focusable, not clickable, and it does not move.
Where it appears as a reward the caller animates it — `PopIn` on sign-in and
reports, a spring on the level-up — and that caller respects reduced motion.

## Writing

- The alt names the character and the stage, and nothing else: _Mocki, nivel
  3_. The landing's own variant, _Mocki, forma 3 de 6_, is also fine — and it
  is the one to use next to an XP level. On a level-up that says _Nivel 7_,
  a default alt of _Mocki, nivel 4_ gives a screen reader two different
  numbers both called _nivel_.
- _Mocki_ is a name: never translated, no article in Spanish (_Y Mocki crece
  contigo_, not _el Mocki_).
- Copy around Mocki follows the product voice, celebration included: no
  exclamation marks, no anglicisms. _¡Mocki evolucionó! Mira su nuevo look._
  is a product string to fix, not a model.

## Internationalization

- The default alt is Spanish. Every other locale passes its own `alt`, whole —
  numbers included.
- The stage is a plain digit from 1 to 6, so there is no `Intl` formatting
  and no `locale` prop.
- The illustrations never mirror in right-to-left locales.

## Accessibility

- A native `<img>` with `alt`. Decorative (`alt=""`) when a heading or a
  message beside it already carries the meaning — the welcome card, sign-in.
- Not decorative when the form itself is the news (the level-up), so the alt
  says which stage it is.
- An explicit `alt=""` is respected even without `decorative`.
- `draggable={false}` and `select-none`, so a long press on a phone does not
  pick the picture up.

## Do and don't

- ✅ `decorative` beside text that already says it.
- ✅ A translated `alt` in every locale but Spanish.
- ✅ `shrink-0` in a flex row; 100px or less where it must be sharp.
- ❌ Mocki in Sustentación, or as the logo.
- ❌ Recolouring, cropping or flipping it.
- ❌ Exclamation marks around it.
