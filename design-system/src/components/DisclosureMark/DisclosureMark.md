---
name: DisclosureMark
level: atom
status: stable
---

# DisclosureMark

The sign that a card opens. A `<details>` summary drawn as a card reads as a
card: nothing about it says there is more inside. This mark sits at the end
of the summary — a pill with a chevron that turns over as it opens and, on
the larger disclosures, the word for what clicking does (_Ver_, _Ver
planes_), swapped for _Cerrar_ once open.

The turn and the swap are CSS on `details[open] > summary` in the package's
`styles.css`, so they follow the element's own state with no JavaScript, and
only the nearest disclosure answers: a closed one inside an open one stays
closed.

## Anatomy

1. **Pill** — `rounded-full`, the lifted surface (`bg-surface-lift`); a 32px
   circle when icon only, `px-3 py-1.5` with a label. Class
   `disclosure-pill`.
2. **Label** _(optional)_ — `text-sm` semibold `cream-bright`: `label` while
   closed (`disclosure-when-closed`), `openLabel` once open
   (`disclosure-when-open`, default _Cerrar_).
3. **Chevron** — lucide `ChevronDown`, 16px, class `disclosure-mark`; turned
   180° when open.

The whole mark is `aria-hidden`.

## When to use it

- At the end of a `<summary>` drawn as a card or a row, so it reads as
  something that opens: _Ver el detalle completo_ in the feedback report,
  _La conversación_ in an interview's detail.
- With a label where the summary is a title alone or a title and a line of
  body: _Tu plan hasta el día D_ with _Ver_ / _Cerrar_; the plans with _Ver
  planes_ / _Ocultar_; the jury with _Completar_ or _Editar_.
- Icon only on rows in a list and on summaries whose own text already says
  _Ver…_.

## When not to use it

- **A button that opens a menu, a sheet or a dialog** → `Action` with its own
  words. The mark only answers a `<details>`.
- **A card that navigates somewhere** → a link. A chevron down promises the
  content opens in place.
- **Choosing between views** → `Segmented`.
- **A status of the card** → `Badge`, beside the summary's text.

## Interaction

The `<summary>` is the control: it takes focus (give it `focus-ring`),
toggles on click, Enter and Space, and is announced as expanded or
collapsed by the browser. The mark follows it:

- **Open** — the chevron rotates to point up over 200ms on the out curve, and
  the label swaps to `openLabel` at once.
- **Hover** _(fine pointers)_ — anywhere on the summary, the pill lifts to
  cream at 14%. That is what tells a disclosure from a plain card.
- **Pressed** — the pill scales to 0.95 on `ease-press`.
- **Reduced motion** — the chevron flips and the press settles at once; the
  hover tint still fades.

Build the summary as the product does: `list-none` (the package hides the
WebKit marker), `cursor-pointer`, a flex row with the text first and the mark
last.

## Writing

- `label` is a verb for what opening does, sentence case, no period: _Ver_,
  _Ver planes_, _Completar_, _Editar_.
- `openLabel` says how to undo it: _Cerrar_ for a card (the default),
  _Ocultar_ for a list.
- The summary's text names the thing; the label never repeats it (_Ver_, not
  _Ver ajustes del ensayo_).
- 1–2 words, about 12 characters. The pill never wraps.

## Accessibility

- The mark is always `aria-hidden`; a screen-reader user hears the summary's
  text and its expanded or collapsed state, never _Ver_ / _Cerrar_. So the
  summary must carry visible text of its own.
- Focus and target size belong to the `<summary>`: pass `focus-ring` and pad
  it so the row is a comfortable target.
- Contrast: `cream-bright` on the lifted pill is ≥ 11.6:1 in both themes.
  The chevron's direction and the words carry the state; the pill's fill is
  decoration.
- The chevron points down and up, so it is not mirrored in right-to-left.

## Do and don't

- ✅ Inside a `<summary>`, last, after the summary's text.
- ✅ A label only on the larger disclosures.
- ✅ `className="bg-surface-card"` when the summary itself is lifted.
- ❌ The mark on a button or a link: it never turns there.
- ❌ A chevron promising content that opens on another screen.
- ❌ The summary's text repeated in the label.
