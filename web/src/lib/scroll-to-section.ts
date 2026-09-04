/**
 * Glides the page to an in-page anchor.
 *
 * The CSS already said `scroll-behavior: smooth`, and it was being switched
 * off — the reduced-motion block sets it back to `auto`, which is the right
 * default for ambient movement and the wrong one here. A jump-cut to a
 * different part of a six-thousand-pixel page is exactly the case where a
 * person loses track of where they are.
 *
 * Verified on a machine with the setting on: the computed `scroll-behavior`
 * on `html` reads `auto`, so the anchor jumps.
 *
 * Driving the animation here rather than handing the browser a
 * `behavior: "smooth"` buys two things: it is independent of that CSS
 * property whatever the browser decides to do with it, and the duration and
 * easing become ours to choose rather than the engine's.
 *
 * That is a deliberate exception, and a narrow one: it is a movement the
 * reader asked for by clicking, to a place they chose, lasting about half a
 * second. Everything ambient on the page — the hero loop, the reveals, the
 * waveforms — still stops when the setting says stop.
 */

/** Long enough to read as travel, short enough not to be a wait. */
export const SCROLL_MS = 520;

/**
 * Ease-in-out cubic. Starts and ends at rest, which is what makes a scroll
 * read as a glide rather than as a jerk in two directions.
 */
export function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Position at `elapsed` ms into a scroll from `from` to `to`. */
export function scrollPosition(
  from: number,
  to: number,
  elapsed: number,
  duration = SCROLL_MS,
): number {
  if (duration <= 0) return to;
  const progress = Math.min(1, Math.max(0, elapsed / duration));
  return from + (to - from) * ease(progress);
}

/** Pulls "pricing" out of "#pricing", "/#pricing" or a full URL. */
export function sectionId(href: string): string | null {
  const hash = href.slice(href.indexOf("#"));
  if (!href.includes("#") || hash.length < 2) return null;
  return hash.slice(1);
}

/**
 * Scrolls to the section, and returns whether it found one.
 *
 * A false return is the caller's signal to let the browser handle the click
 * normally: the target may live on another page, and swallowing the
 * navigation would strand the reader on a link that does nothing.
 */
export function scrollToSection(
  href: string,
  doc: Document = document,
  updateHash = true,
): boolean {
  const id = sectionId(href);
  if (!id) return false;

  const target = doc.getElementById(id);
  if (!target) return false;

  const view = doc.defaultView;
  if (!view) return false;

  const from = view.scrollY;
  const to = from + target.getBoundingClientRect().top;
  const start = performance.now();

  const step = (now: number) => {
    const elapsed = now - start;
    view.scrollTo(0, scrollPosition(from, to, elapsed));
    if (elapsed < SCROLL_MS) view.requestAnimationFrame(step);
  };
  view.requestAnimationFrame(step);

  // The hash still belongs in the address bar — it is what makes the section
  // linkable and what the back button steps through. `pushState` rather than
  // assigning `location.hash`, which would jump the page instantly and race
  // the animation that just started.
  if (updateHash && typeof history !== "undefined") {
    history.pushState(null, "", `#${id}`);
  }
  return true;
}
