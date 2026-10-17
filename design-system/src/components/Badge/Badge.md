---
name: Badge
level: atom
status: stable
---

# Badge

A small pill that states a status in words: the mode of a call (_Práctica_),
a setting in force (_Modo estrés_), the turn the interview is on (_Turno 3 de
8_). When something is happening right now, a dot in the accent breathes
before the words. The words always carry the meaning; the dot only adds
"right now".

## Anatomy

1. **Pill** — `rounded-full`, the lifted surface (`bg-surface-lift`), 14px
   medium text (`text-xs` in this scale) in `cream-dim`.
2. **Live dot** _(tone `live` only)_ — 6px, accent, `aria-hidden`, before the
   text.
3. **Leading icon** _(optional, in children)_ — 12px lucide icon with
   `aria-hidden`, as in _Modo estrés_.
4. **Text** — 1–3 words.

## Tones

| Tone | Use it for | Never for |
| --- | --- | --- |
| `neutral` | A standing fact: the mode, a setting in force | Something the user can change from the badge |
| `live` | The one status in progress right now | Facts that do not change while the screen is open |

## When to use it

- A short fact about the current screen that the user is not changing right
  now: _Práctica_ or _Real_ at the top of a call.
- The status in progress, with `tone="live"`: _Conectando_ while the call
  starts, _Turno 3 de 8_ while the interviewer has the floor.

## When not to use it

- **Something to press or toggle** → `Action` (ghost) or `Segmented`. A badge
  has no focus and no press.
- **Marking a paid option** → `PremiumMark`.
- **A message about what just happened** → `Notice`.
- **A score or a proportion** → `Meter` or `ScoreRing`.
- **Loading with nothing to say yet** → `DotMatrix`, or a sentence that names
  what is loading.

## Interaction

None. A badge is not focusable, has no hover and no press, so it never
looks like something to tap. When the status changes — _Conectando_ becomes
_Turno 1 de 8_ — the caller re-renders it with new text; there is no
transition between the two.

## Motion

- The live dot breathes: opacity 1 → 0.35 → 1 over 2s on an in-out curve,
  for as long as the tone is `live`. A breath rather than a blink, so it can
  sit beside text someone is reading.
- Under `prefers-reduced-motion: reduce` the dot holds still at full
  opacity. The check lives in the component's own class (`motion-safe:`), so
  it needs no provider and follows a change of the setting at once.

## Writing

- A noun or a short status, sentence case, no period: _Práctica_, _Modo
  estrés_.
- Something in progress may be a gerund: _Conectando_. No ellipsis — the dot
  already says it is ongoing.
- Numbers as digits, formatted by the caller: _Turno 3 de 8_.
- 1–3 words, about 20 characters. A badge that wraps is a sentence that wants
  to be body text.

## Accessibility

- Read as its text, inline. The dot is hidden, so _live_ reaches a screen
  reader only through the words: write a status, not just a name.
- When the text changes in place and the change matters, pass
  `role="status"` so it is announced politely. Leave it off fixed labels.
- A leading icon must carry `aria-hidden`.
- Contrast: `cream-dim` on the lifted pill is ≥ 9.2:1 in both themes, on any
  surface. The dot is decoration and never the only signal.

## Do and don't

- ✅ Say the status in words.
- ✅ One live badge per view; `role="status"` on the one that changes.
- ❌ Every badge live.
- ❌ A badge with an `onClick` standing in for a toggle.
- ❌ Recolouring a badge to mean error or success.
