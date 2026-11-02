---
name: InsetFrame
level: template
status: stable
---

# InsetFrame

The frame the public site's content sits in: a rounded window, inset from the
edge of the screen. The site is a document on a table, and the frame is the
table.

## Anatomy

1. **Margin** — 8px around the content on a phone, 12px from `md` up.
2. **Window** — the content, clipped to the frame's corners: 10px on a phone,
   28px from `md` up.

## When to use it

- The public site: the page sits in a rounded window.
- Any full-height surface that should read as a document on a table.

## When not to use it

- **A screen inside the signed-in app** → `PageBody`: the app is the window.
- **A card inside a page** → `Panel`: a frame the size of its content.
- **A page that must scroll in the browser's own scroll** → nothing.

## Interaction

The frame does not move and does not take focus. It clips what does not fit,
so the content inside it is laid out for the width it gets — and anything that
has to be reachable has to be reachable inside the frame, not behind it.

## Writing

None: the frame holds content and never writes any of its own.

## Accessibility

- It is a generic container with no role and no name, so it adds nothing to
  what a screen reader reads.
- It clips overflow: nothing inside it can be focused out of sight.
- It is not focusable and traps nothing; focus moves through the page inside.

## Do and don't

- ✅ Let it fill the height it is given: it is a viewport frame, not a box.
- ✅ Keep one frame per page.
- ❌ Nest an `InsetFrame` inside another one.
- ❌ Use it for the app's screens.
