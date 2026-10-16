---
name: Action
level: atom
status: stable
---

# Action

The button. Every action a person takes on purpose in Mockio — start a
rehearsal, upload a thesis, copy a link — is an `Action`. There is one per
view in the accent; everything else steps down in tone so the eye lands on
the next step without reading every label.

## Anatomy

1. **Container** — a pill (`rounded-full`), 40px tall at rest.
2. **Leading icon** _(optional)_ — 16px lucide icon, `aria-hidden`.
3. **Label** — one line, sentence case, starts with a verb.
4. **Forward arrow** _(optional, `withArrow`)_ — only on the main path forward.
5. **Edge** — the darker band under `solid` and `neutral` that the face sinks
   into on press.

## Tones

| Tone | Use it for | Never for |
| --- | --- | --- |
| `solid` | The single most important next step | A second action on the same view |
| `neutral` | A confident secondary next to a primary | Destructive actions |
| `glass` | Actions over video or photography | Plain surfaces — it disappears |
| `ghost` | Cancel, skip, "Ahora no" | The only action on a screen |

## Interaction

- **Press, not release.** The press state lands in 75ms: the face moves down
  by the edge's height and the edge disappears. That is the whole animation.
- **Hover** only on devices that can hover (`hoverOnlyWhenSupported`), so a
  tapped button on a phone never stays tinted.
- **Keyboard**: Tab to focus (accent ring), Enter or Space to activate.
- **Inside a form** an Action does not submit unless you pass `type="submit"`.

## Writing the label

- A verb first, in the imperative and the tú form: _Ensayar_, _Sube tu tesis_,
  _Ver mi acta_.
- The outcome, not the mechanism: _Ver mi informe_, not _Enviar_.
- Sentence case, no period, no exclamation mark, 1–4 words.
- If price is the obstacle, say it in the label: _Sube tu tesis gratis_.

## Accessibility

- Native `<button>`: role, focus and Enter/Space come for free.
- The focus ring is 2px accent with a 2px offset — never removed.
- An icon-only Action needs `aria-label`. Prefer a visible label.
- A disabled Action cannot be focused; when the reason matters, keep it
  focusable with `aria-disabled` and explain it in text beside it.
- Contrast: accent ink on accent ≥ 5:1 in both themes.

## When not to use it

- **Navigation** → a link. Wrap an Action in a link only when the destination
  is a step forward (e.g. the landing CTA to sign up).
- **Choosing a value** → `Segmented`.
- **Irreversible** → `HoldButton`.
- **On/off** → a switch or `SpringCheck`.

## Do and don't

- ✅ One `solid` per view.
- ✅ Explain a disabled button next to it.
- ❌ Two `solid` buttons side by side.
- ❌ Restyling the colour through `className`.
