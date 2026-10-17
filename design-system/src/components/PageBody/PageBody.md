---
name: PageBody
level: template
status: stable
---

# PageBody

The one container every signed-in screen sits in, directly under its
`PageHeader`. Gutters, vertical padding and the ceiling live here instead of
in each screen. They used to be hand-tuned per file — `max-w-2xl` here,
`max-w-4xl` there — which pinned screens to the left edge of a desktop window
and left half of it empty.

## Anatomy

One `<div>`, on purpose:

1. **Gutters** — `px-4 → sm:px-6 → lg:px-10`.
2. **Vertical padding** — `py-8 → lg:py-10`.
3. **Ceiling** — `max-w-[110rem]` (`wide`) or `max-w-3xl` (`reading`),
   centred with `mx-auto w-full`.
4. **The screen's layout** — whatever `className` adds (`flex flex-col
   gap-4`, `grid lg:grid-cols-2`), on the same element that holds the
   children.

The layout has to land on the element that holds the children. When it sat on
an outer wrapper, a screen asking for `lg:grid-cols-2` laid out the wrapper's
single child, and every column stacked inside the first.

## Widths

| Width | Ceiling | Use it for |
| --- | --- | --- |
| `wide` (default) | 110rem | Grids, lists of sessions, the call, settings |
| `reading` | 48rem, centred | A screen read top to bottom: a report, a session's detail, the warm-up |

Pass the same `width` to the screen's `PageHeader`, so the title lines up with
the content under it. To narrow one block inside a wide screen, give that
block `max-w-2xl`; don't make the whole screen `reading`.

## When to use it

- Every screen inside the signed-in app, once, under its `PageHeader`.
- `width="reading"` for a one-column screen read top to bottom.

## When not to use it

- **A band of a marketing page** → `Section`.
- **A surface for a block** → `Panel`, inside the PageBody.
- **Narrowing one block** → `max-w-2xl` on that block.

## Interaction

None. PageBody is not focusable. Give it an `id` and a skip link can jump to
it.

## Overriding the defaults

There is no tailwind-merge: your classes are appended, and the generated CSS
decides which of two conflicting classes wins.

- **Ceiling** — use `width`. A `max-w-3xl` in `className` loses to
  `max-w-[110rem]`, which comes later in the CSS. Four product screens pass
  one today and get no narrower column.
- **Vertical padding** — use `pt-*` and `pb-*`. Longhands come after `py-*`
  and always win: the call screen trims its padding with
  `pb-4 pt-3 sm:py-6 lg:py-10`.
- **Same utility, smaller value** — `py-4` or `px-0` lose: Tailwind orders a
  utility's values ascending, so the built-in `py-8` and `px-4` come later.

## Writing

PageBody renders no words. What the screen says first lives in the
`PageHeader`; the body starts with the task, not a restatement of the title.
A loading or empty screen says what is happening in a raised `Panel` inside:
_Leyendo tu tesis… puede tardar hasta dos minutos._,
_Todavía no hay nada que graficar_.

## Accessibility

- A plain `<div>`: nothing is announced. The app shell's `<main>` is the
  landmark around it.
- Headings inside start at `h2`: the `PageHeader`'s `h1` is the page's only
  `h1`.
- Every other `<div>` attribute is passed through. A loading screen marks its
  status Panel with `role="status"` rather than the whole body.
- No ink or fill of its own; on the shell's `surface-deep` ground the
  faintest ink clears AA (7.8:1 dark, 5.1:1 light).

## Do and don't

- ✅ Layout on PageBody itself: `<PageBody className="flex flex-col gap-4">`.
- ✅ The same `width` on PageHeader and PageBody.
- ✅ `pt-*` / `pb-*` to trim the padding.
- ❌ A wrapper `<div>` inside for the layout.
- ❌ `max-w-*` in `className`.
- ❌ Two PageBodies on one screen, or a PageBody inside a Panel.
