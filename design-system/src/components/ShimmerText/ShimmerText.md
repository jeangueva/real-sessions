---
name: ShimmerText
level: atom
status: beta
---

# ShimmerText

A word with a slow, soft light crossing it every few seconds. In the product
it is the _Premium_ chip in the app's top bar: the one place the paid plan
says so, without a badge that shouts. It is CSS only — a gradient of two
tokens clipped to the glyphs — and the text stays real text.

> Clean-room implementation for `@mockio/design-system`, written from a
> behaviour spec and from how the product uses a text shine. It is not
> derived from React Bits, and it replaces the vendored component the product
> uses today.

## Anatomy

1. **Text** — a plain string in an `inline-block` span, sized by the caller
   (`text-xs font-semibold` in the chip).
2. **Base** — `accent-text`, the colour the word has between sweeps.
3. **Light** — a band of `cream-bright` 60% as wide as the text, with soft
   edges, that crosses it in reading order.
4. **Chip** _(the caller's)_ — `rounded-full bg-accent-soft px-2.5 py-0.5`.

## When to use it

- Saying, once and quietly, that the paid plan is on for this person: the
  _Premium_ chip in the top bar.
- At most one per view, in the chrome, never in the content.

## When not to use it

- **A call to action** → `Action` with tone `solid`. Emphasis comes from
  tone, not motion — and on an accent fill the base colour is 1.47:1.
- **Marking an option as paid** → `PremiumMark`.
- **Headlines, body copy or numbers** → plain text; `WordsPullUp` or
  `FadeRise` for an entrance that happens once.
- **Loading** → `DotMatrix`, or a sentence that names what is loading.

## Interaction

None. It is not focusable and does not respond to the pointer; the text can
be selected and copied like any other, and selected text is drawn in
`accent-ink` on `accent` so it never selects as invisible.

## Motion

- The light crosses in `speed` seconds (2.4 by default) at a constant rate,
  then the word is still for `pause` seconds (4 by default). The cycle repeats
  while the component is mounted.
- Only `background-position` animates. Each frame repaints the word's own box
  and never the layout, but it is still work every frame: one per view.
- Right-to-left, the animation runs in reverse so the light travels in
  reading order; there the sweep comes first and the pause after.
- On the light theme `cream-bright` is the near-black ink, so the band
  darkens the word instead of lightening it. That is the direction that raises
  contrast in both themes, and it matches the product.
- **Reduced motion**: no sweep and no gradient — plain `accent-text`. The
  component checks it itself, with `useReducedMotion()` on mount and a media
  query in its own `<style>` for server renders and a setting changed while
  the page is open.
- **It loops.** Moving content that starts by itself and runs longer than
  five seconds needs a way to stop it (WCAG 2.2.2). Here that is the
  reduce-motion setting, which stops it at once, and `disabled`, for a screen
  that offers its own control or already moves. That is why it is limited to
  one word in the chrome.

## Writing

- A name, not a message: the plan's name as the product writes it —
  _Premium_, _Pack Sustentación_, _Asesor Pro_.
- 1–3 words, cased as the name is, no punctuation.
- Never a call to action and never a claim about the plan; the light already
  draws the eye.
- The crossing takes `speed` seconds whatever the length, so a longer word
  makes the light move faster. Keep translations as short as the original.

## Accessibility

- The visible text is the DOM text: read, translated, found and selected as
  written. There is no `aria-label` and nothing is hidden.
- Contrast holds at every frame: each pixel mixes `accent-text` and
  `cream-bright`, and in both themes the mix never falls below the base. On
  the chip (`accent-soft`) that is ≥ 4.65:1 dark and ≥ 4.92:1 light; on page
  and card surfaces ≥ 4.94:1 dark and ≥ 5.19:1 light.
- Not for a `surface-lift` row in a dark card (4.05:1) or any accent fill.
- Forced-colours mode drops the gradient and draws the text in `CanvasText`.
  Print draws plain `accent-text`, so it never prints blank.
- A browser that cannot clip a background to text gets plain `accent-text`.

## Do and don't

- ✅ One, in the chrome, on `accent-soft` or a page or card surface.
- ✅ `disabled` where the screen already moves (a live call, a video).
- ❌ On an `Action` or any accent fill.
- ❌ Several shimmers in one view, or a shimmer on content someone reads.
