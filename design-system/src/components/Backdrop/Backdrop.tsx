import { useReducedMotion } from "framer-motion";

export type BackdropVariant = "hero" | "section";

export interface BackdropProps {
  /** hero is the full field with three lights; section is a quieter two-light version for mid-page. */
  variant?: BackdropVariant;
  /** Renders the same composition without any drift, for places that must not move. */
  still?: boolean;
  /** Extra classes on the layer: a z-index, or a rounded corner when the parent does not clip. */
  className?: string;
}

/**
 * The deep navy in the top-left: a cool, dark glow that keeps the field from
 * reading as one flat wash against the pale lift below.
 *
 * The one colour here with no token. It is atmosphere, not a role — nothing
 * else in the system is this colour, and promoting a colour used once to the
 * palette would invite it onto controls. Channels, so the stops below can
 * change only the alpha.
 */
const NAVY = "4 33 46";

/**
 * The moving field behind marketing copy, and the stand-in for footage when
 * there is none.
 *
 * Slow drifting light built from the page's own ink, plus the grain that
 * keeps large flat blacks from banding. Everything is CSS: no video, no
 * canvas, no asset. Blurred gradients composite on the GPU and the drift
 * animates transform and opacity only, so the field stays off the layout and
 * paint path.
 *
 * The layer carries `on-media`: it is a dark ground in both themes, the way
 * footage is, so `--cream` resolves to the dark theme's ink inside it and
 * the light reads as light. On the light theme `.backdrop-field` dims the
 * whole layer to a hint of itself instead.
 */
export function Backdrop({ variant = "hero", still = false, className = "" }: BackdropProps) {
  // Read here rather than trusted to an app-level MotionConfig: a page that
  // forgets the provider must still not drift for someone who asked it not to.
  const reduced = useReducedMotion();
  const drift = !still && !reduced;
  const hero = variant === "hero";

  return (
    <div
      aria-hidden
      className={`backdrop-field on-media pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {/* The lift from below, in the page's own ink: the one that makes a
          headline sit in light rather than on flat black. */}
      <div
        className={`absolute left-1/2 h-[120vmax] w-[120vmax] -translate-x-1/2 rounded-full blur-3xl ${
          drift ? "animate-drift-slow" : ""
        }`}
        style={{
          bottom: hero ? "-70vmax" : "-85vmax",
          background:
            "radial-gradient(circle, rgb(var(--cream) / 0.26) 0%, rgb(var(--cream) / 0.08) 38%, transparent 70%)",
        }}
      />

      {/* The navy, drifting across the top-left, against the pale lift. */}
      <div
        className={`absolute h-[80vmax] w-[80vmax] rounded-full blur-3xl ${drift ? "animate-drift-wide" : ""}`}
        style={{
          top: hero ? "-30vmax" : "-45vmax",
          left: "-20vmax",
          background: `radial-gradient(circle, rgb(${NAVY} / 0.95) 0%, rgb(${NAVY} / 0.35) 45%, transparent 70%)`,
        }}
      />

      {hero && (
        <div
          className={`absolute right-[-25vmax] top-[10vmax] h-[70vmax] w-[70vmax] rounded-full blur-3xl ${
            drift ? "animate-drift-counter" : ""
          }`}
          style={{ background: "radial-gradient(circle, rgb(var(--cream) / 0.07) 0%, transparent 65%)" }}
        />
      )}

      {/* Grain over the gradients, not under them: it is there to break up the
          banding the blurs themselves produce. */}
      <div className="noise-overlay absolute inset-0 opacity-[0.5] mix-blend-overlay" />

      {/* Scrim, so text contrast does not depend on where the light has
          drifted to. Weighted to the top, where a nav sits over the navy; the
          bottom stays light because that is where the lift lives. Black
          in both themes: it protects light ink over a dark ground. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/35" />
    </div>
  );
}
