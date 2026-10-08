/**
 * Motion primitives. Four behaviours cover the whole product — anything new
 * should reach for one of these before inventing a fifth.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import type { ReactNode } from "react";

export const CINEMATIC = [0.16, 1, 0.3, 1] as const;
/** The UI ease-out — the same curve as `ease-press` and `--ease-out`. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const WORD_STAGGER = 0.08;

/** One text segment with its own styling, for mixed-weight headlines. */
export interface StyledSegment {
  text: string;
  className?: string;
}

interface WordsPullUpProps {
  /** Plain string, or segments when part of the line needs its own style. */
  children: string | StyledSegment[];
  className?: string;
  /** Extra delay before the first word, to sequence against other elements. */
  delay?: number;
  align?: "left" | "center";
}

/**
 * Headline reveal: words rise into place one after another. Runs once, on
 * entry — re-firing on every scroll pass turns a nice effect into a tic.
 */
export function WordsPullUp({
  children,
  className = "",
  delay = 0,
  align = "left",
}: WordsPullUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const still = useReducedMotion();

  const words = useMemo(() => {
    const segments: StyledSegment[] =
      typeof children === "string" ? [{ text: children }] : children;
    return segments.flatMap((segment) =>
      segment.text
        .split(" ")
        .filter(Boolean)
        .map((word) => ({ word, className: segment.className ?? "" })),
    );
  }, [children]);

  if (still) {
    // No motion component at all, rather than one animated to its end state.
    // An animation needs a frame to commit, and a throttled or backgrounded
    // tab may never give it one — leaving the text permanently invisible.
    return (
      <span
        className={`inline-flex flex-wrap ${align === "center" ? "justify-center" : ""} ${className}`}
      >
        {words.map((item, index) => (
          <span key={`${item.word}-${index}`} className={`inline-block ${item.className}`}>
            {item.word}
            <span>&nbsp;</span>
          </span>
        ))}
      </span>
    );
  }

  return (
    <span
      ref={ref}
      className={`inline-flex flex-wrap ${align === "center" ? "justify-center" : ""} ${className}`}
    >
      {words.map((item, index) => (
        <motion.span
          key={`${item.word}-${index}`}
          className={`inline-block ${item.className}`}
          // `transform` strings, not `y`: Motion's shorthands run on the main
          // thread, and these play while the hero video is still loading.
          initial={{ opacity: 0, transform: "translateY(20px)" }}
          animate={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0px)" : "translateY(20px)",
            // No transform left behind once visible — see FadeRise.
            ...(inView ? { transitionEnd: { transform: "none" } } : {}),
          }}
          transition={{
            duration: 0.7,
            delay: delay + index * WORD_STAGGER,
            ease: CINEMATIC,
          }}
        >
          {item.word}
          {/* Trailing space must be inside the span or flex-wrap eats it. */}
          <span>&nbsp;</span>
        </motion.span>
      ))}
    </span>
  );
}

/** Whole-block entrance. The default for anything that is not a headline. */
export function FadeRise({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const still = useReducedMotion();

  if (still) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, transform: "translateY(24px)" }}
      // Animating to an explicit visible state either way: passing `undefined`
      // leaves the element parked at `initial`, so anything whose entrance
      // never fires stays invisible rather than merely un-animated.
      animate={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0px)" : "translateY(24px)",
        // A resting transform would make this block the containing block for
        // anything `position: fixed` inside it, so it is cleared on arrival.
        ...(inView ? { transitionEnd: { transform: "none" } } : {}),
      }}
      transition={{ duration: 0.8, delay, ease: CINEMATIC }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Body copy that brightens character by character as it scrolls through the
 * viewport. Reserved for one paragraph per page — it is expensive to read.
 */
export function ScrollRevealText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const still = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.8", "end 0.2"],
  });
  const characters = [...text];

  if (still) return <p className={className}>{text}</p>;

  return (
    <p ref={ref} className={className}>
      {characters.map((char, index) => (
        <RevealChar
          key={index}
          char={char}
          progress={scrollYProgress}
          index={index}
          total={characters.length}
        />
      ))}
    </p>
  );
}

function RevealChar({
  char,
  progress,
  index,
  total,
}: {
  char: string;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  index: number;
  total: number;
}) {
  const start = index / total;
  const opacity = useTransform(progress, [start - 0.1, start + 0.05], [0.2, 1]);
  return <motion.span style={{ opacity }}>{char}</motion.span>;
}

/**
 * Reveals text one character at a time. Used where the product is literally
 * speaking — the interviewer's turn — so the motion carries meaning rather
 * than decoration.
 */
export function useTypewriter(text: string, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState("");
  const still = useReducedMotion();

  useEffect(() => {
    // Revealing a sentence one character at a time is motion too.
    if (still) {
      setDisplayed(text);
      return;
    }
    setDisplayed("");
    let index = 0;
    const start = window.setTimeout(() => {
      const timer = window.setInterval(() => {
        index += 1;
        setDisplayed(text.slice(0, index));
        if (index >= text.length) window.clearInterval(timer);
      }, speed);
    }, startDelay);
    return () => window.clearTimeout(start);
  }, [text, speed, startDelay, still]);

  return { displayed, done: displayed.length >= text.length };
}

export function Typewriter({
  text,
  className = "",
  speed,
  startDelay,
}: {
  text: string;
  className?: string;
  speed?: number;
  startDelay?: number;
}) {
  const { displayed, done } = useTypewriter(text, speed, startDelay);
  return (
    <p className={className} aria-label={text}>
      <span aria-hidden>{displayed}</span>
      {!done && (
        <span
          aria-hidden
          className="ml-[2px] inline-block h-[1.1em] w-[2px] bg-accent align-middle animate-blink"
        />
      )}
    </p>
  );
}

/**
 * The raised pill under the chosen segment of a segmented control.
 *
 * It slides between segments instead of teleporting, the way Apple's
 * segmented control does: the eye follows the selection rather than having
 * to find it again. `layoutId` animates a transform, and a spring with no
 * bounce retargets cleanly when someone taps back before it lands.
 * The button that owns it must be `relative`, with its label above it.
 */
export function SegmentThumb({
  id,
  className = "bg-surface-card shadow-card",
}: {
  /** One per control, shared by its segments. */
  id: string;
  className?: string;
}) {
  return (
    <motion.span
      layoutId={id}
      aria-hidden
      className={`absolute inset-0 rounded-full ${className}`}
      transition={{ type: "spring", duration: 0.3, bounce: 0 }}
    />
  );
}

/**
 * The score as a ring that fills, Duolingo's lesson-complete moment.
 *
 * Rare and earned — it plays once, at the end of an interview — so it is
 * allowed the delight budget: the stroke draws itself on a spring with a
 * little settle. The number sits inside, so the colour is never the only
 * thing carrying the meaning.
 */
export function ScoreRing({
  value,
  size = 168,
  children,
}: {
  value: number;
  size?: number;
  children?: ReactNode;
}) {
  const still = useReducedMotion();
  const pct = Math.max(0, Math.min(100, value)) / 100;
  const stroke = value >= 70 ? "text-grow" : value >= 40 ? "text-accent" : "text-step";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="12" className="text-surface-lift" />
        <motion.circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          className={stroke}
          initial={{ pathLength: still ? pct : 0 }}
          animate={{ pathLength: pct }}
          transition={{ type: "spring", duration: 1.2, bounce: 0.15, delay: 0.25 }}
        />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  );
}

/** Pops in on a small spring — for rewards: XP, a badge, the mascot. */
export function PopIn({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const still = useReducedMotion();
  if (still) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, transform: "scale(0.6)" }}
      animate={{ opacity: 1, transform: "scale(1)", transitionEnd: { transform: "none" } }}
      transition={{ type: "spring", duration: 0.55, bounce: 0.35, delay }}
    >
      {children}
    </motion.div>
  );
}
