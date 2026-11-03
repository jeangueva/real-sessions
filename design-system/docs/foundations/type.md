---
title: Type
group: Foundations
order: 2
summary: One family, two voices, and the scale — with the rules that keep a heading a heading.
---

# Type

One family, the platform's own, and a second one for the instrument voice.
The scale is small, and every size in it was set by what it has to carry.

## The families

| Voice | Stack | What it is for |
| --- | --- | --- |
| Sans | Inter Tight, Inter, `-apple-system`, Almarai, `system-ui` | Everything |
| Mono | JetBrains Mono, `ui-monospace`, SFMono-Regular, Menlo | Labels, chips, tabs and figures |

The platform's face comes first on a Mac and an iPhone, and Inter
everywhere else. Almarai stays in the stack as the Arabic fallback: neither
SF Text on the web nor Inter carries that script.

There is no serif voice. A serif accent inside a sans headline is the
editorial-magazine move, and this is a tool.

## The scale

| Token | Size | Leading | Tracking | What it is for |
| --- | --- | --- | --- | --- |
| `text-xs` | 0.875rem | 1.5 | — | The small end: labels, chips, meta |
| `text-sm` | 1rem | 1.55 | — | Body text in a dense screen |
| `text-base` | 1.0625rem | 1.6 | — | The body's default |
| `text-title` | clamp(1.25rem, 2vw, 1.75rem) | 1.18 | -0.018em | A title inside a screen |
| `text-headline` | clamp(2rem, 4.6vw, 4rem) | 1.04 | -0.04em | A headline on a marketing page |
| `text-display` | clamp(3rem, 9vw, 8rem) | 0.95 | -0.045em | The wordmark's size |

The small end was lifted one step off Tailwind's defaults (12/14/16). Those
are fine for dense dashboards and wrong for this: most of the small text
here is either a control you have to hit or copy someone reads while nervous,
and 12px was failing both.

**Tracking is per size, never one value.** Large type tightens as it grows;
the small end stays at zero. **Leading runs the other way**: the bigger the
type, the tighter it sets.

## The rules

1. **A heading carries weight, size and leading as a set.** `h1`, `h2` and
   `h3` are 600 by default; a screen that needs a lighter heading says so
   (the public site's `SectionTitle` is light on purpose).
2. **One `h1` per page.** A second one flattens the document: a screen reader
   that navigates by heading finds two page titles and cannot tell which one
   the page is about.
3. **A heading has a measure.** A heading that can run the full width of a
   desktop window stops being a heading and becomes a line of text. The
   system's titles cap their measure at 52rem.
4. **Sentence case**, always: "Ensayar mi sustentación", not "Ensayar Mi
   Sustentación".
5. **The instrument voice is for labels, not for sentences.** Mono, uppercase
   and a little tracking, with a tight `::` in front: `::CÓMO FUNCIONA`.
6. **Figures are tabular where they change.** `tabular-nums` on a number
   that counts up or down, so the digits do not shuffle the line.
7. **A form control inherits the type.** Browsers do not give buttons and
   inputs the page's font by default, and on iOS a field under 16px zooms
   the page in. The base stylesheet fixes both.
