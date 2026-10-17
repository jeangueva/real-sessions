---
name: Mockio
description: Thesis-defence and job-interview rehearsal with AI juries, for students under pressure.
colors:
  ink-dark: "#F5F5F7"
  ink-bright-dark: "#FAFAFC"
  ink-light: "#1D1D1F"
  ink-bright-light: "#111113"
  page-dark: "#000000"
  raised-dark: "#161618"
  card-dark: "#1C1C1E"
  deep-dark: "#0C0C0D"
  page-light: "#FFFFFF"
  deep-light: "#F5F5F7"
  accent-dark: "#5E5CE6"
  accent-text-dark: "#8C89FF"
  accent-soft-dark: "#1E1E3E"
  accent-light: "#5856D6"
  accent-soft-light: "#EEEEFC"
  grow-dark: "#30D158"
  grow-light: "#34C759"
  grow-text-light: "#1E7B34"
  step: "#FF9F0A"
  step-text-light: "#B25000"
  premium-dark: "#FFCC00"
  premium-light: "#A16A00"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, Almarai, system-ui, sans-serif"
    fontSize: "clamp(3rem, 9vw, 8rem)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, Almarai, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4.6vw, 4rem)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.032em"
  page-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, Almarai, system-ui, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.028em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, Almarai, system-ui, sans-serif"
    fontSize: "clamp(1.25rem, 2vw, 1.75rem)"
    fontWeight: 600
    lineHeight: 1.18
    letterSpacing: "-0.018em"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, Almarai, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, SF Pro Text, Inter, Almarai, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  field: "12px"
  tile: "16px"
  card: "20px"
  inset: "28px"
  pill: "9999px"
spacing:
  gutter-phone: "16px"
  gutter-tablet: "24px"
  gutter-desktop: "40px"
  stack-tight: "8px"
  stack: "16px"
  stack-loose: "24px"
  section-app: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.page-light}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  button-neutral:
    backgroundColor: "{colors.ink-bright-light}"
    textColor: "{colors.page-light}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  button-quiet:
    backgroundColor: "{colors.page-light}"
    textColor: "{colors.ink-bright-light}"
    rounded: "{rounded.pill}"
    padding: "10px 20px"
  panel:
    backgroundColor: "{colors.page-light}"
    rounded: "{rounded.card}"
    padding: "24px"
  field:
    backgroundColor: "{colors.page-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.field}"
    padding: "12px 16px"
---

# Design System: Mockio

> Captured by Impeccable `document` (scan mode) from the incumbent code:
> `web/tailwind.config.js`, `web/src/index.css`,
> `web/src/design-system/primitives.tsx`, `web/src/platform/AppShell.tsx` and
> `web/src/design-system/README.md`. The token source of truth stays in those
> files; the hex values above are the light/dark resolutions of the CSS
> variables. Descriptive names and the North Star are **[inferred]** from the
> code comments and have not been confirmed by the founder.

## Overview

**Creative North Star: "The Quiet Rehearsal Room"**

A room with the lights on where a nervous student practises out loud. The
interface is Apple's system type and one indigo accent over Airbnb's calm
surfaces: white (or true black) ground, near-black (or off-white) ink, soft
shadowed cards with generous radii, pill controls. Nothing decorative stands
between the student and the sentence they need to read.

Two contexts share one system. Marketing pages (the defence landing at `/`,
interviews at `/entrevistas`, affiliates, institutions) persuade and may use
full motion, the hero video and the drifting backdrop. The signed-in product
(`/app/*`) operates: a step-darker shell ground (`surface-deep`), the same
tokens and primitives at lower volume, restrained motion.

**Key Characteristics:**
- One family (SF / Inter), weight and tracking carry hierarchy.
- One accent for the way forward; two meaning colours (grow, step); never red.
- Depth from a hairline plus a soft shadow, never from borders or glows.
- Pills for every control, 20px cards, 12px fields.
- Dark and light are the same tokens swapped, not two designs.

## Colors

Restrained: neutrals do almost all the work; colour only ever means something.

### Primary
- **Rehearsal Indigo** (`accent`): the single way forward on a screen. Solid
  buttons, the current nav item, selection rings, the progress fill. Text uses
  `accent-text`, which is lighter on dark so it clears 4.5:1.

### Secondary
- **Got Better Green** (`grow`): something improved. Chips, trend deltas,
  success notices. Text uses `grow-text`.
- **Next Step Amber** (`step`): what to work on next, and errors. It replaces
  red everywhere. Text uses `step-text`.
- **Crown Gold** (`premium`): only the crown that marks a paid option.

### Neutral
- **Ink** (`cream`, `cream-bright`), with `cream-dim` (85%) and `cream-faint`
  (65%) for secondary and tertiary text. The alpha steps are set by contrast
  (AA on every surface in both themes); nothing goes lower.
- **Surfaces**: `surface-base` (page), `surface-raised` / `surface-card`
  (panels), `surface-deep` (app shell ground), `surface-sunken` (recessed
  wells: transcript, call stage), `surface-lift` (hovered or selected row).
- **Lines**: `line` for decorative dividers, `line-strong` (3:1) for anything
  that identifies a control.

### Named Rules
**The Meaning-Only Rule.** Accent, grow and step appear only where they carry
meaning. A coloured halo, tinted background or gradient that means nothing is
removed.

**The No-Red Rule.** Nothing in this product marks a person wrong. Errors use
`step`.

**The Token-Only Rule.** No raw hex or rgba in a component. A missing shade
becomes a token in `index.css` and `tailwind.config.js`.

## Typography

**Display Font:** the platform face (SF on Apple devices, Inter elsewhere)
**Body Font:** the same family
**Arabic fallback:** Almarai

**Character:** one tool-like family whose tracking tightens as size grows.
Headings are semibold; page titles bold.

### Hierarchy
- **Display** (600, `text-display`, 0.95): landing hero only.
- **Headline** (600, `text-headline`, 1.04): marketing section heads.
- **Page title** (700, 2rem phone / 2.5rem from `sm`, 1.1): `PageHeader`, one
  per app screen.
- **Title** (600, `text-title`, 1.18): panel and section titles inside a screen.
- **Body** (400, `text-sm` = 16px, 1.55; `text-base` = 17px for reading).
  Prose measure 65 to 75ch.
- **Label** (500, `text-xs` = 14px): field labels, metadata, chips. 14px is
  the floor; nothing in the product is set smaller.

### Named Rules
**The Lifted Scale Rule.** `xs`, `sm` and `base` are 14 / 16 / 17px. Never set
arbitrary `text-[11px]`-style sizes below `xs`.

**The No-Kicker Rule.** No uppercase, letter-spaced labels above headings. A
heading carries its own weight.

## Layout

App screens sit in `PageBody` (max 110rem, gutters 16 / 24 / 40px, 32 to 40px
vertical) under `PageHeader`, which shares the container so titles align with
content. Marketing sections use `Section` (80 / 112 / 144px vertical rhythm,
max-w-7xl). Navigation is three layouts: a bottom tab bar below `md`, an icon
rail at `md`, a labelled rail at `lg`. Groups are built with spacing first
(8 / 16 / 24px stacks) and containers second.

## Elevation & Depth

Hybrid tonal and shadow. On light, a 1px hairline plus a wide soft fall-off;
on dark, the hairline alone does the separating because shadows barely
register on black.

### Shadow Vocabulary
- **Card** (`shadow-card`): resting panels.
- **Lift** (`shadow-lift`): a hovered interactive card, popovers.
- **Float** (`shadow-float`): dialogs, sheets, the hero frame.

### Named Rules
**The Three-Step Rule.** Only card, lift and float. No ad-hoc `shadow-[...]`
values and no zero-offset coloured glows.

**The One-Surface Rule.** A panel never sits inside another panel. Inside a
card, group with spacing, a `surface-lift` well or a divider.

## Shapes

Soft and consistent: `rounded-full` for every button and chip, `rounded-card`
(20px) for panels, `rounded-2xl` (16px) for tiles and wells inside a panel,
`rounded-xl` (12px) for fields, `rounded-inset` (28px) for media frames.

## Components

### Buttons (`Action`, the only button)
- **Shape:** pill.
- **Solid:** accent fill, white ink, a darker pressed edge it sinks into on
  press. One per view; `withArrow` marks the primary path, once per screen.
- **Neutral:** ink pill on paper. **Quiet:** hairline pill beside a primary.
  **Glass:** over video only. **Ghost:** tertiary text button.
- **Focus:** `.focus-ring` (2px accent ring, offset). No lift on hover.

### Cards / Containers (`Panel`)
- **Corner Style:** 20px.
- **Background:** `surface-card` (grids) or `surface-raised` (single block).
- **Shadow Strategy:** `shadow-card`.
- **Border:** none; the shadow carries the hairline.
- **Internal Padding:** 20 to 24px phone, 24 to 32px desktop.

### Inputs / Fields (`Field` + `.field-control`)
- **Style:** card fill, `line-strong` border, 12px radius, 12 / 16px padding.
- **Focus:** accent border and a soft 4px accent halo.
- **Error:** a `Notice tone="error"` (step wash, icon), never red.

### Chips (`Badge`)
- **Style:** `surface-lift` pill, 14px medium label in `cream-dim`; the live
  variant adds a breathing accent dot.

### Notice
- Tinted rounded box with an icon: step (error), grow (success), lift (info).

### Navigation (`AppShell`)
- Translucent toolbar material (`.nav-lifted`), current item in accent, a
  bottom tab bar on phones.

## Do's and Don'ts

### Do:
- **Do** use `Action`, `Panel`, `Field`, `Notice`, `Badge`, `PageHeader` and
  `PageBody` before writing any custom markup.
- **Do** keep one solid action per view; everything else quiet or ghost.
- **Do** keep text at `xs` (14px) or above and secondary text at `cream-dim`
  or `cream-faint`, never lower alpha.
- **Do** check every change in both themes.
- **Do** keep motion to `FadeRise` / `PopIn` inside the app, 150 to 250ms on
  `ease-press`; honour reduced motion.

### Don't:
- **Don't** nest a `Panel` (or a `rounded-card` + `shadow-card` box) inside
  another.
- **Don't** add coloured glows, halos, blurred blobs or gradient text inside
  the app.
- **Don't** introduce raw hex, rgba or arbitrary shadows in components.
- **Don't** use uppercase tracking-wide kickers or exclamation marks.
- **Don't** put red anywhere; errors are `step`.
