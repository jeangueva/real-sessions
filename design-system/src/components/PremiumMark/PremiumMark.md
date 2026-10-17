---
name: PremiumMark
level: atom
status: stable
---

# PremiumMark

The crown on a paid option. One mark for everything the free plan cannot
use — a rail entry, a practice tab, a share template, a section of the
report — so a person learns it once. It names where the option lives rather
than refusing it: the option stays visible and pressable, and what happens on
the press is the screen's to decide.

## Anatomy

1. **Wash** — a 20px circle in `premium-soft`.
2. **Crown** — a 12px filled lucide `Crown`, stroke 2.5, in `premium`.
   `aria-hidden`.
3. **Name** — `label`, as the accessible name (`role="img"` + `aria-label`)
   and as the tooltip (`title`). Defaults to _Premium_.

## When to use it

- Next to any option the free plan cannot use, at the end of its label:
  _En el trabajo_ and _Crecer_ in the practice tabs, _Tu contexto_ in the
  rail.
- The same mark everywhere such an option appears. Gold is reserved for it;
  that reservation is what lets it read as "in the paid plan" at a glance.

## When not to use it

- **Saying the paid plan is on for this person** → `ShimmerText` in the top
  bar's _Premium_ chip.
- **A status of the current screen** → `Badge`.
- **Explaining what the paid plan adds** → a sentence beside the option with a
  link: _Practicar el día a día del trabajo es Premium. Prepararte para
  conseguirlo es gratis._ followed by _Ver los planes_.

## Interaction

None of its own: the mark is not focusable and does not respond to the
pointer. The option it sits in keeps all of its behaviour — a crowned tab is
still a tab, a crowned link still navigates — and the screen decides what a
press on a paid option does: explain it, open the plans, or start a trial.

## Writing

- The default _Premium_ is right almost everywhere.
- Where the plan's name would be vague, say where the option lives: _Del
  plan pago_ (the rail).
- A name, never a refusal: not _Bloqueado_, not _No disponible_.
- Sentence case, no period, 1–4 words. It is heard, and seen only as a
  tooltip.

## Internationalization

- `label` is the one string the mark renders; pass the translated plan name
  (_Premium_ in Spanish and Portuguese, _高级版_ in Chinese).
- The crown is not mirrored. Place the mark with logical utilities (`ms-auto`,
  not `ml-auto`) so it ends the row in both directions.

## Accessibility

- A named image: screen readers hear the label, never "image".
- Inside a control the label joins the control's name — the tab is named
  "En el trabajo Premium" — so nobody has to find the mark separately.
- The tooltip is for mouse users only. Anything important about the paid
  option belongs in visible text, not only in the label.
- A blank `label` falls back to _Premium_ rather than rendering an image with
  no name.
- Contrast: the crown on its wash is 8.82:1 on the dark theme and 4.17:1 on
  the light one, above the 3:1 asked of a graphic.

## Do and don't

- ✅ Keep the crowned option pressable; let the press explain.
- ✅ One mark, same size and place, for every paid option.
- ❌ Disabling an option because it is paid.
- ❌ Gold or the crown on anything that is not a paid option.
