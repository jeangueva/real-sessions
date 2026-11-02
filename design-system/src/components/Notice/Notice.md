---
name: Notice
level: molecule
status: stable
---

# Notice

A message about the state of something: saved, done, or not possible. The
words carry the meaning; the icon is decoration.

## Anatomy

1. **Icon** — 16px, before the words, hidden from screen readers.
2. **Message** — one or two sentences at 14px.
3. **Ground** — the tone's own background: the lifted surface, the amber of
   the step palette, or the green of the grow palette.

## When to use it

- After something the person asked for succeeds.
- When something could not be done and the person has to know before going on.
- A fact about the state of the screen worth a line of its own.

## When not to use it

- **A field that is not valid** → the field's own hint, next to the control.
- **Something the screen can say by itself** → the copy on the screen.
- **A confirmation nobody asked for** → nothing.

## Interaction

The notice does not move and does not take focus. It appears where it is, and
it is read when it appears: `error` interrupts, `info` and `success` wait their
turn.

## Writing

- Say what happened and what to do next: _Guardamos tu avance._, _No pudimos
  subir el archivo: pesa más de 300 MB._
- Never blame the person. The error names what failed, not who: there is no
  red in this product, and nothing here marks anyone wrong.
- One or two sentences, no exclamation marks.

## Accessibility

- `error` is a `role="alert"` and interrupts; `info` and `success` are
  `role="status"` and are announced politely.
- The icon is `aria-hidden`. The message is read once, in full.
- The message is cream-bright on its own background in every tone; the icon
  takes the tone's colour, at least 4.5:1 on that background.

## Do and don't

- ✅ Use `error` only when the person has to act on it now.
- ✅ Put the outcome in the message, not in the icon.
- ❌ Stack two notices on one screen.
- ❌ Use a notice to explain what the screen is for.
