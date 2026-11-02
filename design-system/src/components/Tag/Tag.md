---
name: Tag
level: atom
status: stable
---

# Tag

A small coloured pill with a verdict on one piece of the student's work: how
serious a risk in the thesis is (_Grave_, _Te costará puntos_, _De forma_),
whether an objective of the consistency matrix holds together (_Coherente_,
_Débil_, _Incoherente_). The words are the verdict; the colour only helps
the eye sort a list by it.

A Tag is not a Badge. A Badge states a status of the screen and is never
recoloured to mean anything; a Tag judges an item, and its colour follows the
judgement.

## Anatomy

1. **Pill** — `rounded-full`, `px-2 py-0.5`, 14px semibold text (`text-xs`
   in this scale), a soft fill with its paired text token.
2. **Text** — 1–3 words. No icon.

## Tones

Named by what the verdict means for the student, not by colour, so one set
serves both the severity of a risk and a coherence check:

| Tone | Means | Tokens | Product copy |
| --- | --- | --- | --- |
| `attention` | Deal with this first | `step-soft` / `step-text` (orange) | _Grave_, _Incoherente_ |
| `caution` | It will cost something | `accent-soft` / `accent-text` | _Te costará puntos_, _Débil_ |
| `positive` | It holds | `grow-soft` / `grow-text` | _Coherente_ |
| `neutral` (default) | A minor point, about form | `surface-lift` / `cream-dim` | _De forma_ |

Never red: nothing in this product marks a person wrong, and the verdict is
on the work.

## When to use it

- Each risk in the thesis diagnosis, from the most serious to the least.
- Each objective of the consistency matrix.
- Any short verdict on one item in a list of the student's work.

## When not to use it

- **A status of the screen or a call** (_Práctica_, _Conectando_) → `Badge`.
- **A score** → `Meter`, or `ScoreRing` for the headline score.
- **A message about what just happened** → `Notice`.
- **Something to press, select or remove** → `Action` (ghost) or
  `Segmented`. A tag has no focus and no press.
- **A paid option** → `PremiumMark`.

## Interaction

None. A tag is not focusable, has no hover and no press, and nothing about
it moves. In a row that opens on tap (a risk in a `<summary>`), the row is
the control; the tag is its first words.

## Writing

- A verdict on the work, never on the person: _Grave_ is the risk, _Débil_
  the objective.
- An adjective or a short phrase, sentence case, no period: _Grave_, _Te
  costará puntos_, _De forma_.
- Tú when it speaks to the student: _Te costará puntos_.
- Each tone in a list gets a different word, so nobody needs the colour to
  tell them apart.
- 1–3 words, about 20 characters. Quote the strings from `thesis-copy.ts`
  (`severityAlta`, `severityMedia`, `severityBaja`, `statusCoherente`,
  `statusDebil`, `statusIncoherente`).

## Accessibility

- Read as its text, inline. The tone is not announced and needs nothing:
  the words already differ.
- Put the tag before the item it qualifies, so a screen reader hears the
  verdict first.
- Contrast, text on its own fill: dark theme 7.05–8.86:1, light theme
  4.72–4.81:1; neutral ≥ 9.2:1 in both. All pass AA at this size.
- Right to left: the pill sits at the start of its row, on the right.

## Do and don't

- ✅ Take the tone and the words from the same table.
- ✅ Lead the row with the tag; `shrink-0` beside wrapping text.
- ✅ Sort the list from the most serious down.
- ❌ A tag for the mode of a call or any status of the screen.
- ❌ A tone that contradicts the words (_Grave_ in neutral).
- ❌ Recolouring with `className`, or red.
