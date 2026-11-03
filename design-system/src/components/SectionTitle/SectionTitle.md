---
name: SectionTitle
level: atom
status: stable
---

# SectionTitle

The heading of a block of the public site: a section's title, or the title of
a `Widget` inside one. Big, light and tight, the trail-dashboard way — 32px
on a phone and 56px on a wide desktop, following the viewport.

## Anatomy

1. **Heading** — an `h2`, never an `h1`: the page's own title is the `h1`.
2. **Size** — `clamp(2rem, 4.4vw, 3.5rem)`: the title of a phone and the
   title of a desktop are the same title.
3. **Weight** — light, so the words read as a headline rather than a label.
4. **Ink** — the brightest ink on the page.

## When to use it

- The title of a section of the public site.
- The title of a `Widget` that is a block of the page in its own right.

## When not to use it

- **The title of a screen in the signed-in app** → `PageHeader`: the app's
  screen has one title, and it is an `h1`.
- **A label above the title** → a `MonoLabel`, in the instrument voice.
- **A heading inside the block** → an `h3` or a bold paragraph: the title is
  the block's only heading.

## Interaction

None. A heading is read, not reached: it takes no focus and has no states.

## Writing

- One sentence with a full stop, in the tú form: _Un jurado que leyó tu
  tesis. Completa._
- What the block gives, not how it works.
- 8–14 words. A title that needs two lines on a desktop is a title that
  wants to be a paragraph.

## Accessibility

- An `h2`: the second level of the document's headings, and nothing else.
- The brightest ink on the surface behind it: over 12:1 in both themes.
- The heading can be given an `id`, so the band that holds it can be named by
  it with `aria-labelledby`.

## Do and don't

- ✅ Write it as what the block gives.
- ✅ Let it wrap.
- ❌ Use it as the page's `h1`.
- ❌ Set its size or its weight through `className`.
