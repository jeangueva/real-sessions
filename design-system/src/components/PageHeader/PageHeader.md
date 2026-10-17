---
name: PageHeader
level: template
status: stable
---

# PageHeader

The title block of every screen in the signed-in app: the screen's name as
the page's only `h1`, one line of meta under it, and the screen's actions at
the end of the row. It sits on the same container as `PageBody`, so the title
starts exactly where the content under it starts, at every width.

## Anatomy

1. **Title** — the `h1`. 32px on phones, 40px from `sm`, bold, tight
   tracking. No rule or background under it: the size and the space after it
   end the header.
2. **Meta** _(optional)_ — one line in `cream-dim`. Clamped with an ellipsis;
   the full text is in the DOM and in a `title` tooltip.
3. **Actions** _(optional)_ — at the end of the row, bottom-aligned with the
   meta. One `Action`, or a few `Badge`s. They wrap under the title when the
   row runs out.

## Variants

| Prop | Effect |
| --- | --- |
| `compact` | Phones only: 20px title and 16px above it, so a call's video gets the height. The title is clamped to two lines at every width. |
| `width="reading"` | The 48rem centred column, above a `PageBody width="reading"`. |

## The one-line meta

A thesis title of 25 words as meta made the header the longest block of text
on _Mi tesis_ — repeated on all six of its tabs — and was flagged as cognitive
load. The header names the screen; it does not hold the document. So the meta
is one line:

- About 35 characters fit at 320px, 45 at 390px, 70 from 640px. Put the
  point first.
- A screen reader reads the meta in full; the clamp is visual only.
- A mouse user sees the rest in the tooltip. **On touch the rest cannot be
  revealed**, so nothing a person needs to act on may live only in the meta.
  The thesis title is shown in full in the body where it matters (the warm-up,
  the Ficha).

The product's copy still lets the meta wrap. This is the redesign's decision,
recorded in the contract's `appCounterpart.differences` until the product
adopts it.

## When to use it

- At the top of every app screen, once, directly above its `PageBody`.
- `compact` on the live call, where the content needs the height on a phone.

## When not to use it

- **A marketing headline** → the hero's own `h1`, then `Section`s with `h2`.
- **A heading inside the screen** → an `h2` in a `Panel`.
- **Instructions or a long description** → a `Panel` in the `PageBody`.
- **A status message** → `Notice`, in the `PageBody`.

## Interaction

The header itself is not interactive. Whatever is in `actions` brings its own
states and keyboard behaviour; it comes right after the title in source and
focus order.

## Writing

- The title names the screen in one to four words, sentence case, no period:
  _Mi tesis_, _Tu camino_, _Ajustes_, _Tus postulaciones_.
- A screen that is the person's own takes the possessive in the tú form:
  _Tu informe_, _Tu camino_.
- The meta is one short sentence saying what the screen is for, or one fact:
  _Súbela una vez. El jurado la lee antes de cada ensayo._, _12 completadas_.
- After an interview, the title says what they did before how it scored:
  _Hablaste 12m 4s en inglés_.
- No exclamation marks; the meta never repeats the title.

## Accessibility

- The title is the page's only `h1`. One PageHeader per screen; headings
  below start at `h2`.
- Wrap the screen — PageHeader and PageBody — in one `<main>` (the app
  shell's job). Inside `<main>` the `<header>` is generic; outside it, it is
  a banner landmark competing with the shell's own. The product's shell does
  not render a `<main>` yet.
- The meta's `title` attribute repeats its text for the tooltip. Screen
  readers that see a title identical to the content announce it once.
- Contrast on the shell's `surface-deep`: the title 18.8:1 (dark) and 17.3:1
  (light); the meta 13.0:1 and 9.9:1.

## Internationalization

- Portuguese and German meta run 30–40% longer than the Spanish. The header
  does not grow: it shows less of the meta. Write the Spanish so its first 35
  characters carry the point, and check the translations do the same.
- In right-to-left documents the title starts at the right, the actions move
  to the left end, and the ellipsis lands at the line's end.
- Counts and dates arrive formatted from the caller.

## Do and don't

- ✅ The same `width` on PageHeader and PageBody.
- ✅ The point of the meta in its first 35 characters.
- ✅ One Action in `actions`, solid only when it is the screen's way forward.
- ❌ A second PageHeader, or any other `h1`, on a screen.
- ❌ Instructions in the meta — on a phone they are cut and cannot be opened.
- ❌ A rule or a background under the header.
