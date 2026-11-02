---
name: Notice
level: atom
status: stable
---

# Notice

A message about what just happened, in a tinted box with its mark: signing
in did not work and what to try (_No funcionó. Inténtalo otra vez, o entra
con tu correo y contraseña._), a save that worked (_Guardado_), or something
neutral (_Si esa dirección tiene una cuenta, el enlace ya está en camino._).
The box and the icon make it read as the answer to what you just did rather
than one more line of instructions.

Never red. `error` uses the `step` wash, orange: what to do next, not
"wrong".

## Anatomy

1. **Box**: a `<p>`, `rounded-2xl`, `px-4 py-3`, in the tone's wash.
2. **Icon**: 16px lucide icon, `aria-hidden`, top-aligned with the first
   line, in the tone's text colour.
3. **Message** _(children)_: `text-sm leading-relaxed` in `cream-bright`.

## Tones

| Tone | Wash / icon | Role | Use it for |
| --- | --- | --- | --- |
| `error` | `step-soft` / alert circle in `step-text` | `alert` | It did not work; say what to do next |
| `success` | `grow-soft` / check circle in `grow-text` | `status` | It worked |
| `info` _(default)_ | `surface-lift` / info in `cream-dim` | `status` | Something happened that is neither |

## When to use it

- The outcome of a form submit, under the fields and above the Action.
- The result of a request the page made on its own: confirming an email,
  unsubscribing.
- A save that worked, beside the Action that saved it.

## When not to use it

- **A rule a value must meet** → the `Field` hint, before anyone types.
- **A standing fact about the screen** → `Badge`.
- **A block of explanation or an empty state** → a `Panel` with body text.
- **The way forward after an error** → an `Action` right after the Notice.
  The Notice names the next step; the Action does it.

## Interaction

None. A Notice is not focusable and does not dismiss itself. The caller
renders it when the outcome is known and removes it when the next attempt
starts. It does not fade, slide or shake: something that went wrong is told
calmly. A link inside it is focusable as usual.

## Writing

- Say what happened, then what to do next: _No funcionó. Prueba de nuevo con
  el enlace del correo._
- Blameless: the thing did not work; the person did nothing wrong. No
  _Error:_, no _inválido_, no exclamation marks.
- A success can be one word (_Guardado_), or say what changed: _Listo. No
  vas a recibir recordatorios ni resúmenes en esta dirección._
- Tú, never usted. 1–2 sentences, about 160 characters.

## Accessibility

- `error` is `role="alert"`: announced at once, interrupting. `success` and
  `info` are `role="status"`: announced when the reader is idle. A `role`
  prop overrides it.
- The icon is hidden and the colour is not announced, so the words must say
  whether it worked.
- Render it with its text when the outcome is known, one per outcome. A
  status region mounted with its text is not announced by every screen
  reader; changing the text of a mounted one is.
- Contrast: the message is ≥ 11.6:1 on every wash in both themes; the icons
  are ≥ 4.7:1 and never the only signal.

## Do and don't

- ✅ What happened, then what to do next.
- ✅ One Notice per outcome, where the person was looking when they acted.
- ✅ An `Action` right after an error that has a way forward.
- ❌ Instructions that were true before anything happened.
- ❌ Several Notices stacked for one submit.
- ❌ Red, or a second icon in the message.
