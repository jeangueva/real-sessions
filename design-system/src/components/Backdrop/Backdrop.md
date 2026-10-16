---
name: Backdrop
level: atom
status: stable
---

# Backdrop

The moving field behind a marketing hero. Slow drifting light built from the
page's own ink, a deep navy that keeps it from reading as one flat wash, the
grain that stops large blacks from banding, and a scrim so the copy on top
does not depend on where the light has drifted to.

It is the honest substitute for footage rather than a placeholder for it:
`HeroVideo` renders it underneath the video while the first frame decodes,
and on its own when there is no video or the file fails.

## Anatomy

1. **The lift** — a 120vmax pale light rising from below the frame,
   `rgb(var(--cream) / 0.26 → 0.08)`. What makes a headline sit in light.
2. **The navy** — an 80vmax glow across the top-left, `rgb(4 33 46 / 0.95 →
   0.35)`.
3. **The third light** _(hero only)_ — a faint 70vmax glow on the right,
   `rgb(var(--cream) / 0.07)`.
4. **Grain** — `.noise-overlay` at 50%, `mix-blend-overlay`, over the lights:
   it is there to break up the banding the blurs produce.
5. **Scrim** — black, 45% at the top, 10% in the middle, 35% at the bottom.
   Heaviest where a nav sits; lightest where the lift lives.

All of it is CSS: no video, no canvas, no image request.

## Variants

| Variant | Lights | Use it for |
| --- | --- | --- |
| `hero` | lift, navy, third light | The first screen of a marketing page |
| `section` | lift and navy, further out of frame | A mid-page section that needs light, not a flat ground |

## Colour

- The two pale lights read `--cream`, the ink token. The layer carries
  `on-media`, so inside it `--cream` is the dark theme's ink in both themes:
  the field is a dark ground the way footage is, and its light stays light.
- The navy is the one colour with no token. It is atmosphere, not a role;
  nothing else in the system uses it, and promoting a colour used once to the
  palette would invite it onto controls. It lives as one named constant in
  the component.
- On the light theme `.backdrop-field` drops the whole layer to 28%: there is
  no light-ground version of this effect at the same strength.

## When to use it

- Behind a marketing hero with no footage, or under footage while it loads —
  through `HeroVideo`, which does both.
- A mid-page marketing section that wants light rather than a flat ground:
  `variant="section"`.

## When not to use it

- **Inside the app** (the thesis workspace, a rehearsal, an acta, settings) →
  the surface tokens and `Panel`. Nothing decorative competes with the
  sentence someone is reading while nervous.
- **There is footage** → `HeroVideo`, which already puts a Backdrop under it.
- **Behind long text, a form or a pricing table** → a plain `Section` on
  `surface-deep`.
- **A light section that wants a tint** → `surface-deep` or `accent-soft`.

## Interaction

None. The layer is `aria-hidden` and `pointer-events: none`; clicks and taps
go through to the content above.

Its parent does the layout work. It must be positioned, clip, and be dark:

```tsx
<section className="on-media relative isolate overflow-hidden bg-surface-base">
  <Backdrop />
  <div className="relative z-10">{/* the hero */}</div>
</section>
```

## Motion

- Three CSS loops from the preset — `drift-slow` 34s, `drift-wide` 46s,
  `drift-counter` 58s — on `cubic-bezier(0.45, 0, 0.55, 1)`, infinite.
- Only `transform` and `opacity` change, on blurred layers the GPU
  composites. Nothing triggers layout or paint.
- Periods of most of a minute: slow enough that nothing on top appears to
  move.
- **Reduced motion**: the component calls `useReducedMotion()` itself and
  applies no drift class, so it renders exactly like `still`. No app-level
  `MotionConfig` is needed. The preference is read at mount; a change in the
  middle of a visit is caught by the stylesheet's reduced-motion block.
- `still` gives the same frozen field on purpose — under a paused video, in a
  print, in a screenshot.

## Writing

The field has no copy. What goes on it is a hero in the product's voice: one
short line and one sentence that says what happens — _Sustenta antes de
sustentar._ / _Un jurado de 3 que leyó tu tesis te pregunta por voz,
repregunta como el de verdad y te deja un acta de 0 a 20._ Long reading text
belongs on a plain surface.

## Accessibility

- `aria-hidden`, always. Screen readers skip the layer and read what is on
  top.
- Contrast: built so light ink holds AA anywhere on it. At the brightest
  point (both pale lights at full strength under the 10% middle of the
  scrim, about `rgb(69 69 69)` before grain) `cream-bright` is 9.2:1 and
  `cream-dim` 6.9:1. Dark ink never goes on it.
- Reduced motion is the component's own job, not the app's.

## Do and don't

- ✅ A positioned, clipping, dark parent; copy above with `relative z-10`.
- ✅ `still` under anything else that is not moving.
- ✅ Through `HeroVideo` when there is footage.
- ❌ On a light section under dark ink — a grey wash.
- ❌ Two Backdrops stacked, or extra grain on top.
- ❌ Inside the app.
