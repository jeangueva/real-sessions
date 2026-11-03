---
title: Motion
group: Foundations
order: 3
summary: One curve, a short list of durations, and the rules that keep an animation from being noise.
---

# Motion

Motion in this system answers the finger and then gets out of the way. It
is never decoration, and it is never the only way something is said.

## The curves

| Token | Curve | What it is for |
| --- | --- | --- |
| `ease-press` | `cubic-bezier(0.23, 1, 0.32, 1)` | Every UI response: a press, a popover, a field's halo, a screen change |
| `ease-cinematic` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entrances that move: a block that rises |
| `ease-settle` | `cubic-bezier(0.22, 1, 0.36, 1)` | A change that arrives and stays |
| `ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | A sheet that slides up from the bottom edge |

One strong ease-out for the whole product, so nothing answers at a slightly
different speed from the rest.

## The durations

| Time | What it is for |
| --- | --- |
| 75ms | The press lands |
| 150–200ms | A hover, a colour, a small move |
| 280ms | A word replaced by the next |
| 500–800ms | An entrance that rises |
| 34–58s | The backdrop's drift: long enough that nothing on top of it appears to move |

## The rules

1. **Feedback lives on the press, not the release.** `active:scale-[0.97]`
   answers the finger in 75ms, which is the difference between a control and
   a picture of one.
2. **One solid `Action` per view.** Everything else is `neutral`, `quiet` or
   `ghost`, so the eye lands on the next step without reading every label.
3. **Animate `transform` and `opacity`,** never `width`, `height` or `top`.
   Those take the layout and the paint path with them; the first two stay on
   the compositor.
4. **A hover only where hovering exists.** `hover:` utilities are behind
   `hoverOnlyWhenSupported`, so a tap on a phone never leaves a card lifted
   or a button tinted.
5. **Nothing that a keyboard does is animated.** A screen reader's caret
   moving is not an entrance.
6. **Under `prefers-reduced-motion: reduce` the animation is fewer and
   gentler, not none.** Loops and keyframes stop; transitions keep running
   on the properties that carry meaning without moving anything — opacity,
   colour, background, border, shadow. A position change becomes instant.
   The base stylesheet does this globally, and a component that animates
   itself checks the preference as well.

## What each component promises

A component that moves says so in its contract: the `motion` field lists
what moves, how long, on which curve, and why. A component that does not
move says that too — "None. The frame does not move; the page inside it
scrolls." The silence is part of the promise.
