import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * A card lit from inside its own header.
 *
 * The effect is the one Unlumen's blob card sells — drifting shapes under a
 * header, a ring of light turning around the edge — rebuilt here because the
 * published component is two imports it does not ship, and because its palette
 * is magenta and this product's is not.
 *
 * That palette is the whole design decision. There is no accent colour in this
 * system: five themes, all of them cream on a dark surface, and nothing in
 * `index.css` that is allowed to be pink.
 *
 * So the lit area is its own ground rather than a surface token — the same
 * choice `hero-video.tsx` makes and for the same reason. Light needs somewhere
 * dark to be light against: built from `surface-deep` it looked correct on the
 * dark theme and like a dirty grey smear on the light one, because there the
 * ink is near-black and the surface is near-white, so the shapes subtracted
 * instead of adding. Dark in both themes, the effect is the effect in both.
 *
 * The ring around the edge is the opposite case and does use the token: it
 * sits on the card, not on the lit area, so it has to follow the theme.
 *
 * Which leaves one trap, and it is why the header is `title` and `eyebrow`
 * rather than a free `ReactNode`. Anything a caller writes there would reach
 * for the interface's own ink — `text-cream-bright`, like every other heading
 * in this codebase — and that ink is near-black on the light theme, so the
 * title would disappear into the dark ground. Handing over two strings and
 * drawing them here is the difference between a component that is easy to use
 * correctly and one that looks right on the theme its author happened to have
 * open. `children` sits below the lit area, on an ordinary surface, and takes
 * whatever markup you like.
 *
 * Motion is declarative, so `MotionConfig reducedMotion="user"` in App.tsx
 * stops all of it for a reader who asked for less movement — they get the same
 * card, still.
 */

/** Where each shape sits and how it drifts. Deliberately not symmetrical. */
const SHAPES = [
  { left: "12%", top: "-30%", size: "22rem", alpha: 0.4, drift: 26, seconds: 17 },
  { left: "52%", top: "-46%", size: "26rem", alpha: 0.3, drift: -34, seconds: 23 },
  { left: "74%", top: "-22%", size: "18rem", alpha: 0.36, drift: 18, seconds: 19 },
];

export function GlowCard({
  title,
  eyebrow,
  children,
  headerHeight = 224,
  className = "",
}: {
  /** Drawn over the lit area, in a colour that works on it. */
  title?: string;
  /** A smaller line above the title. */
  eyebrow?: string;
  /** The body, on an ordinary themed surface below. */
  children?: ReactNode;
  /** Height of the lit area, in pixels. */
  headerHeight?: number;
  className?: string;
}) {
  const lit = Boolean(title || eyebrow);
  return (
    <div className={`relative w-full ${className}`}>
      {/* The ring. One turning cone behind the card, clipped by the radius
          and never catching a pointer. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-px overflow-hidden rounded-[22px]"
      >
        <motion.div
          className="absolute inset-[-40%]"
          style={{
            background:
              "conic-gradient(from 0deg, rgb(var(--cream) / 0) 0deg, rgb(var(--cream) / 0.5) 90deg, rgb(var(--cream) / 0) 200deg, rgb(var(--cream) / 0.35) 300deg, rgb(var(--cream) / 0) 360deg)",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <div className="relative overflow-hidden rounded-[21px] border border-line bg-surface-card">
        <div
          className="relative overflow-hidden"
          style={{ height: headerHeight }}
          aria-hidden={lit ? undefined : true}
        >
          <div className="absolute inset-0 bg-[#0b0b0d]" />
          {SHAPES.map((shape) => (
            <motion.div
              key={shape.left}
              className="absolute rounded-full"
              style={{
                left: shape.left,
                top: shape.top,
                width: shape.size,
                height: shape.size,
                background: `radial-gradient(circle, rgb(236 233 216 / ${shape.alpha}) 0%, rgb(236 233 216 / 0) 70%)`,
                filter: "blur(28px)",
              }}
              animate={{ x: [0, shape.drift, 0], y: [0, shape.drift / 2, 0], scale: [1, 1.12, 1] }}
              transition={{ duration: shape.seconds, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
          {/* The light has to end somewhere, or the header looks pasted on
              top of the body instead of continuing into it. Kept to the
              bottom third: spread over the whole height it washed out the
              ground exactly where the title sits, and a title needs the dark
              behind it more than the seam needs to be soft. */}
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-b from-transparent to-surface-card" />
          {lit && (
            <div className="relative flex h-full flex-col justify-end p-8">
              {eyebrow && (
                <p className="text-xs uppercase tracking-[0.12em] text-[#ece9d8]/70">
                  {eyebrow}
                </p>
              )}
              {title && (
                <h3 className="mt-2 text-title font-normal text-[#ece9d8]">{title}</h3>
              )}
            </div>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
