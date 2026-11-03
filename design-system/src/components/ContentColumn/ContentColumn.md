---
name: ContentColumn
level: template
status: stable
---

# ContentColumn

The public site's one column: 1200px of content, the same gutters on every
page. The landing page, the institutions page and the affiliate page are one
site, and this is what makes them one — a card that moves from one page to
another lands in the same place.

## Anatomy

1. **Container** — a `div`, centred, at most 1200px wide.
2. **Gutters** — 20px on each side on a phone, 32px from `sm` up.
3. **Content** — the page's bands, in one column.

## When to use it

- Any public page: the landing page, the institutions page, the affiliate
  page.
- Any page whose content is one column and the same width everywhere.

## When not to use it

- **A screen inside the signed-in app** → `PageBody`: the app is the window,
  and it is wider and tighter.
- **A band with its own vertical rhythm** → `Section`: it owns the padding
  above and below the band.
- **A block of content inside the page** → a `Widget`: the block, its own
  label and its own hairline.

## Interaction

None. The column is layout: it does not scroll, it does not move, and it
takes no pointer.

## Writing

None. The column never writes a word of its own; everything a person reads
on the page comes from inside it.

## Accessibility

- The column is a generic `div`: no role, no name, nothing for a screen
  reader to read.
- Focus moves through the content inside it. Nothing is trapped at the
  column's edge.
- Everything inside it is responsible for its own contrast.

## Do and don't

- ✅ One column per page.
- ✅ Let the column fill the width it is given.
- ❌ A second `max-w-*` on it: the ceiling is the column's.
- ❌ Two columns side by side: that is a grid, and a grid is a decision.
