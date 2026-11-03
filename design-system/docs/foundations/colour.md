---
title: Colour
group: Foundations
order: 1
summary: The palette as roles, the two themes, and the rules that keep a colour from meaning something it should not.
---

# Colour

The palette is a set of **roles**, not a set of shades. A token says what a
colour is for; the value behind it can change without a single class in the
product changing. `bg-surface-card` is the fill of a card, not a grey.

Every colour in the system is a CSS variable in
[`src/tokens/tokens.css`](../../src/tokens/tokens.css), read by the Tailwind
preset as `rgb(var(--token) / <alpha-value>)`. Channels rather than colours,
so `bg-accent/50` works the way it looks.

## The ink

| Token | Class | What it is |
| --- | --- | --- |
| `--cream` | `text-cream` | The body's ink. Near-black on the light theme, warm cream on the dark one |
| `--cream-bright` | `text-cream-bright` | The brightest ink: titles, and anything that has to be read first |
| `--cream` at 85% | `text-cream-dim` | Secondary text: hints, captions, meta |
| `--cream` at 65% | `text-cream-faint` | The faintest text that still clears 4.5:1 |

The two alpha steps are set by **contrast, not by taste**. 0.85 and 0.65 are
the lowest values that clear WCAG AA against every surface in both themes;
the light theme's `surface-lift` is the tightest of them, and it decides
these two numbers.

## The surfaces

| Token | Class | What it is |
| --- | --- | --- |
| `--surface-base` | `bg-surface-base` | The page |
| `--surface-raised` | `bg-surface-raised` | One block on the page ground |
| `--surface-card` | `bg-surface-card` | A card, a panel, a widget |
| `--surface-deep` | `bg-surface-deep` | The signed-in ground, a step off the page |
| `--surface-sunken` | `bg-surface-sunken` | Recessed: a transcript, a call stage. 32% black on dark, 4% ink on light |
| `--surface-lift` | `bg-surface-lift` | A barely-there lift: a hovered or selected row |

`--surface-lift` is translucent on purpose (7% white on dark, 6% ink on
light), so it works over whatever is behind it.

## The edges

| Token | Class | What it is |
| --- | --- | --- |
| `--line` | `border-line` | A divider between blocks. Soft on purpose: a decorative rule carries no information |
| `--line-strong` | `border-line-strong` | The edge of a control. WCAG 1.4.11 asks for 3:1 on anything that identifies an interactive element |
| `--scrim` | `bg-scrim` | The dim behind a spotlight or a modal |

## The colours that mean something

Three roles, never decoration:

| Role | Token | What it means |
| --- | --- | --- |
| `accent` | `bg-accent`, `text-accent-text` | The way forward. Mustard amber |
| `grow` | `bg-grow`, `text-grow-text` | Something got better |
| `step` | `bg-step`, `text-step-text` | Something to work on. Orange, not red |
| `premium` | `bg-premium` | What is behind a paid option |
| `chip` | `bg-chip` | A fact, never a control |

**Never red.** Nothing in this product marks a person wrong. `step` is "what
to do next", not "what you did badly", and the word `error` in a contract
means a request that failed, never a person.

Each role has an ink for the text on its fill (`-ink`), a text shade that
clears 4.5:1 on every surface (`-text`) and a soft wash for chips and rows
(`-soft`). **The accent is a fill, never text**: on cream it is under 2:1,
so text in the accent takes `--accent-text`.

## The two themes

Dark is the default and lives on `:root`. Light applies with
`data-theme="light"` on `<html>` or on any subtree. The two themes declare
**the same variables** — `test/tokens.test.ts` fails if one of them gains a
token the other does not — so the theme is a swap, not a rewrite.

## The rules

1. **Tokens only.** No hex, no `rgb()`, no arbitrary value for anything a
   token covers. The brand art is the one exception, and it says so.
2. **A colour that means something stays on one role.** The accent is the
   way forward, so nothing else wears it.
3. **Shadows barely register on black.** `--shadow-card` is a hairline
   (`0 0 0 1px rgba(255,255,255,0.06)`), and the separation comes from the
   edge, not from a dark blur.
4. **A new colour is a decision.** Add it to `tokens.css`, to the product's
   `index.css`, and to `COLORS` in `figma-map.js` so the design tools can
   pick it.
