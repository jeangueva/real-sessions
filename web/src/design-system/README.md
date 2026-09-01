# Real Sessions — Design System

One vocabulary for every screen. New features compose these pieces; they do
not restyle from scratch. If something here does not fit a new screen, change
the system, not the screen.

## Where it came from

Five reference directions were given. Each contributed exactly one idea, kept
only where it does a job this product needs:

| Reference | Kept | Why it earned a place |
| --- | --- | --- |
| Prisma | Warm cream on black, inset hero frame, word pull-up | The only palette of the five that reads human rather than corporate. People use this product while nervous. |
| Velorah | Deep navy as a second surface | Depth without introducing a second hue. |
| Asme | Liquid glass | The one treatment that survives over moving footage. |
| Mainframe | Typewriter reveal | Here it is literal: the interviewer is speaking a turn at a time. |
| Kollektiva | Portrait picker | Repurposed as the company selector — same interaction, real job. |

Dropped deliberately: every brand name, nav label, and CDN asset URL in those
prompts. They belong to other products, and several were AI-generated media
for unrelated creative studios. **No external asset is referenced anywhere in
this build.** Hero and card visuals are built from tokens, so they can be
swapped for real footage without touching layout.

## Tokens (`tailwind.config.js`)

**Color.** Named by role, never by shade.

| Token | Value | Use |
| --- | --- | --- |
| `cream` | `#DEDBC8` | Primary text and accents |
| `cream-bright` | `#E1E0CC` | Headlines, the brightest note |
| `cream-dim` | 70% cream | Body copy, secondary labels |
| `cream-faint` | 45% cream | Numbering, de-emphasis |
| `surface-base` | `#000000` | Page background |
| `surface-raised` | `#101010` | A single centered block |
| `surface-card` | `#212121` | Cards inside a grid |
| `surface-deep` | `#04212E` | App shell, focus contexts |
| `line` | 14% cream | Dividers |

Never introduce a raw hex in a component. If a shade is missing, add a token.

**Type.** `font-sans` (Almarai) everywhere; `font-serif` (Instrument Serif
italic) for one accent phrase per headline at most — it stops working when it
is everywhere. Three fluid sizes: `text-display` (the wordmark), `text-headline`
(section), `text-title` (card and subsection).

**Motion.** One easing curve, `ease-cinematic`. `ease-settle` only for card
entrances. Anything else drifts.

## Primitives (`design-system/primitives.tsx`)

- `Action` — the only button. It is `inline-flex`, so inside a stretch-aligned
  flex column it will span the full width; add `self-start` when that is not
  what you want. `tone="solid"` for the single primary action per
  view, `"glass"` over video, `"ghost"` for tertiary. `withArrow` marks the
  primary path forward; more than one per screen makes it meaningless.
- `Panel` — raised surface. `card` inside grids, `raised` for one centered
  block, `glass` over motion.
- `Section` — owns vertical rhythm and max width. Screens never hand-tune
  section padding; that is how layouts drift apart.
- `InsetFrame` — full-height hero frame with the page showing as a margin.
- `Eyebrow`, `CheckItem` — small shared bits.

## Motion (`design-system/motion.tsx`)

Four behaviours, and a new screen should exhaust these before inventing a fifth:

- `WordsPullUp` — headline reveal, word by word. Fires **once** on entry.
- `FadeRise` — the default entrance for any non-headline block.
- `ScrollRevealText` — character brightening on scroll. **One paragraph per
  page**; it is expensive to read and stops feeling special immediately.
- `Typewriter` / `useTypewriter` — a *simulated* reveal, for marketing pages
  only. The live interview screen no longer uses it: it renders real streamed
  tokens, which is the same effect without the lie.

`prefers-reduced-motion` is honored two ways, and both are needed: `index.css`
covers CSS animations, and `<MotionConfig reducedMotion="user">` in `App.tsx`
covers Framer Motion, which does **not** read the setting on its own. The CSS
rule alone left every JS entrance animating for someone who had asked it not to.

Never let an entrance be the only thing that makes content visible. These
components animate to an explicit visible state rather than leaving an element
parked at its `initial`, so a throttled or skipped animation degrades to
"appears instantly" instead of "never appears".

## Accessibility rules that are not optional

- Focus is restyled, never removed — `.focus-ring` on every interactive element.
- `Typewriter` puts the full text in `aria-label` so screen readers get it at
  once rather than character by character.
- Picker buttons carry `aria-pressed` and a descriptive `aria-label`.
- Decorative layers (grain, gradients, indicator dots) are `aria-hidden`.

## Two contexts, one system

| | Marketing (`/`) | Platform (`/app/*`) |
| --- | --- | --- |
| Background | `surface-base` (black) | `surface-deep` (navy) |
| Layout | `Section` / `InsetFrame` | `AppShell` + `PageHeader` |
| Motion | Full — pull-up, scroll reveal | Restrained — `FadeRise` and `Typewriter` only |

The navy shell is what separates "reading about the product" from "using it".
It is not a second theme: same tokens, same primitives, different weight.
Inside the app, skip decorative motion — someone mid-interview does not need
their score sliding in.

## Formatting

Dates go through `formatSessionDate` in `lib/format.ts`, pinned to `en-US`. The
browser locale rendered "31 ago" beside English copy — Spanish for August, but
read as English "ago". Mixing one locale's dates into another's sentences is
worse than picking one. When the interface is translated, that file is the
single place that changes.

## Adding a screen

**Marketing page:**
1. Wrap in `Section` (or `InsetFrame` for a hero).
2. Compose `Panel`, `Action`, `Eyebrow`.
3. Wrap blocks in `FadeRise`; headlines in `WordsPullUp`.

**App screen:**
1. Add one `<Route>` under `/app` in `App.tsx` — the shell and nav come free.
2. Open with `PageHeader` (title, meta, actions).
3. Compose `Panel`, `Meter`, `Field`, `Badge`.

Both: tokens only. No raw hex, no ad-hoc padding scale. If a shade or spacing
step is missing, add it to `tailwind.config.js` rather than inlining it once.

## Layout

Width and gutters belong to two components and nowhere else:

- `PageBody` — every app screen's container. One max width, one gutter scale.
  Screens used to hand-tune `max-w-2xl` / `max-w-4xl` individually, which pinned
  all of them to the left edge and left half of a desktop window empty.
- `PageHeader` — the same container, so a title lines up with the content under
  it at every width.

Three navigation layouts, not one squeezed three ways: a bottom bar below `md`,
an icon rail at `md`, labels at `lg`. A 64px side rail on a 390px screen spends
a sixth of the width on chrome and puts every target at the top of the reach.

## The moving field

`Backdrop` is the animated background on marketing pages — slow drifting light
built from the same two surface tokens, plus grain. It is CSS only: no video, no
canvas, no external asset. Blurred radial gradients composite on the GPU and
animate `transform` and `opacity` only, so it never touches layout or paint.

The bottom scrim is deliberately light. An earlier 75% black gradient erased the
warm lift the wordmark sits in, which is the whole point of the composition.

## Charts

One chart component, `TrendChart`, and it plots a single series. Four axes on
one plot would need four categorical hues, and every muted palette that fits
this cream-on-dark design fails colour-blind separation — the closest pair
measured ΔE 5.0 for deuteranopia against a floor of 8. So identity comes from
the panel title and small multiples, not from hue.

The y domain is fixed at 0–100 rather than fitted. A fitted axis turns three
points of noise into a dramatic climb, which is the most flattering lie a
progress chart can tell.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Landing — hero, how it works, companies, features, pricing, early access, contribute |
| `/signin`, `/reset`, `/verify` | Auth, all three inside `AuthLayout` |
| `/app` | Session setup |
| `/app/session` | Live interview + coaching sidebar |
| `/app/feedback` | Evaluation, measured metrics, XP and badges earned |
| `/app/profile` | CV, portfolio links, and the brief the interviewer reads |
| `/app/progress` | Level, score trend, four axis trends, badges |
| `/app/history` | Past sessions |
| `/app/settings` | Preferences and account |

## Not built yet

- Every screen is wired to the API. `/app/feedback` still falls back to a
  sample report when opened with no session or history id.
- **Voice runs on the browser's own speech APIs.** No extra vendor and no key,
  but Chrome uploads microphone audio to Google, and Firefox has no speech
  recognition at all — so typing stays a first-class path, not a fallback.
  `lib/voice.ts` puts both halves behind interfaces so Deepgram, ElevenLabs, or
  Gemini Live can replace either one without touching the screen.
- **`lib/evaluation.ts` restates the backend zod schema by hand** — it is the
  one place that can silently drift out of sync.
