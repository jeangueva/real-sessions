---
name: Section
level: template
status: stable
---

# Section

A band of a marketing page. The landing page is a stack of them — how it
works, features, pricing, the habit loop — and every one has the same space
above and below and the same gutters, because `Section` owns them. A band
never hand-tunes its own padding, so the page keeps one rhythm however many
bands it grows.

## Anatomy

1. **Band** — the outer `<section>`: the gutters (`px-4 → sm:px-6 →
   lg:px-10`), the vertical rhythm (`py-20 → sm:py-28 → lg:py-36`) and,
   through `className`, the background. It bleeds to both window edges.
2. **Column** — an inner `<div>`, `mx-auto max-w-7xl` (80rem). Everything
   you pass as `children` lands here.
3. **Content** _(yours)_ — usually an `Eyebrow`, the band's `h2`, and what the
   heading introduces: Panels in a grid, a list, a chart.

Two elements on purpose: the background reaches the edges while the content
stays in one centred column.

## When to use it

- Each band of the landing page or any other marketing page.
- Alternating grounds down a page: `bg-surface-base`, then `bg-surface-deep`,
  through `className`.

## When not to use it

- **A screen in the signed-in app** → `PageBody`, with `PageHeader` above.
- **A block inside a band** (a tier, a feature card) → `Panel`, inside the
  Section.
- **The hero** → `HeroVideo` or the hero's own full-height layout over a
  `Backdrop`. It is not a padded band.
- **Columns through `className`** → a `<div className="grid …">` inside.

## Interaction

None. A Section is not focusable. Give it an `id` and the landing nav (or any
in-page link) can scroll to it — `#pricing`, `#features`.

## Composition

- **Heading** — the band's `h2`; the page's `h1` lives in the hero. Cards
  inside the band use `h3`.
- **Narrow blocks** — set their own width inside: `mx-auto max-w-2xl` for an
  intro, `max-w-3xl` for a headline, `max-w-5xl` for a grid.
- **Layout** — on a `<div>` inside. `className` styles the band, not the
  column: `grid-cols-2` there lays out the single column and your content
  stacks.
- **Motion** — blocks inside enter with `FadeRise`, headlines with
  `WordsPullUp`. The band itself never moves.

## Writing

The Section renders no words; its heading does.

- One plain claim, sentence case, a period when it is a sentence:
  _Gratis para conseguir el trabajo. Después, al precio de tu país._
- The Eyebrow names the topic in two or three words: _Precios_,
  _De la entrevista al aumento_.
- Body in the tú form, concrete: _XP por cada entrevista, una racha que
  perdona un mal día, misiones semanales e insignias que te ganas._
- One idea per band. A band that needs two headings is two bands.

## Accessibility

- A `<section>` with no name is not a landmark and is announced as nothing.
  Give the `h2` an `id` and pass `aria-labelledby`: the band becomes a region
  named by its visible heading, and a screen-reader user can jump to it.
- Every other `<section>` attribute is passed through.
- Section draws no ink. On `surface-deep` the ink tokens clear AA in both
  themes (cream-faint, the faintest, is 7.8:1 dark and 5.1:1 light).

## Do and don't

- ✅ An `id` for the nav and `aria-labelledby` on the `h2`.
- ✅ Background in `className`, layout in a `<div>` inside.
- ✅ Alternate `surface-base` and `surface-deep` between bands.
- ❌ `py-*` or `px-*` to tune one band — change the rhythm here, for all.
- ❌ `grid` or `flex` in `className`.
- ❌ A Section inside a Section, or inside the app shell.
