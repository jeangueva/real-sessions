---
name: Mark
level: atom
status: stable
---

# Mark

The isologo. Mocki, the parrot, reduced to three shapes — head, crest and
beak — on the mustard tile. A parrot because parrots learn to speak by
repeating out loud, which is all this product asks of someone; reduced so it
still reads at 16px in a browser tab. The same drawing is the product's
`public/favicon.svg`, and the two are kept in step.

## Anatomy

1. **Tile** — a 64×64 rounded square (`rx` 15), mustard `#F6B733`.
2. **Crest** — the white curl at the top left.
3. **Head** — a white circle, slightly left of centre.
4. **Eye** — a warm ink dot, `#2E2D2A`, looking forward.
5. **Beak** — red-orange `#D9481C`, pointing right, deep enough to stand off
   the tile.

It is an inline SVG, not an `<img>`: it is there on the first paint and costs
no request.

## Colour

The four colours are literals, and the only hex values in the system. That is
deliberate: a logo that follows the theme is two logos. The tile equals
`--accent` today, in both themes, but is not read from it — the accent may
move again, and the mark must stay one drawing on every ground.

| Part | Colour |
| --- | --- |
| Tile | `#F6B733` |
| Head and crest | `#FFFFFF` |
| Eye | `#2E2D2A` |
| Beak | `#D9481C` |

## When to use it

- The corner of the app shell — 30px in the top bar, next to the name on wide
  screens and alone on a phone.
- A square place where the brand must be recognised rather than read: an icon
  tile, a compact header.
- Inside `Wordmark`, which sets it at the height of the name.

## When not to use it

- **The brand has to be read** (landing nav, footer, sign-in) → `Wordmark`.
- **A friendly face, a stage of progress, an empty state** → `Mascot`, the full
  illustrated Mocki.
- **A pattern or a background** → `Backdrop`. Never tile or repeat the mark.

## Interaction

None. The mark is not interactive and never animates. When it is the way home
it sits inside a link, and the link carries `.focus-ring` and the name:

```tsx
<Link to="/app" aria-label="Mockio" className="focus-ring rounded-[0.6rem]">
  <Mark size={30} className="rounded-[0.55rem] shadow-card" />
</Link>
```

## Writing

- The mark has no text. Its `label`, when it has one, is the brand name and
  nothing more: _Mockio_.
- Not _Logo de Mockio_: the role already tells a screen reader it is an image.
- The name is not translated, so `label` is never a dictionary string.

## Accessibility

- **Decorative by default** (`aria-hidden`), because nearly every mark sits
  next to the written name or inside a named link. Announcing it as well would
  say the name twice.
- **Named when alone**: `label="Mockio"` makes the SVG `role="img"` with that
  `aria-label`. An empty or whitespace-only string counts as no label.
- `focusable="false"` is always set, so no browser puts the SVG in the tab
  order.
- Contrast: the tile is at least 3:1 against every surface in both themes
  (3.0:1 on the dark card is the tightest; 5.6:1 on the white page). The head
  is 5.6:1 on the tile.

## Do and don't

- ✅ Leave it decorative next to the name; name the link once.
- ✅ Match the corner when you add a shadow: `rounded-[0.55rem] shadow-card`.
- ✅ 16px or larger.
- ❌ Recolouring it with `className`, filters or `currentColor`.
- ❌ Rotating, stretching, outlining or mirroring it — in any locale.
- ❌ Text on top of it, or a cropped tile.
