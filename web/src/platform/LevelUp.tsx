import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Action, Avatar } from "@/design-system";
import { useT } from "@/hooks/useLocale";
import { tierForLevel } from "@/lib/avatar";

/**
 * The level for a total, on the server's curve (level N starts at 50·N²).
 * Mirrored here only to tell whether the XP just earned crossed a line —
 * the level shown is always the server's.
 */
export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, Math.floor(xp)) / 50)) + 1;
}

const COLOURS = ["bg-accent", "bg-grow", "bg-step", "bg-premium"];

/** Eighteen pieces on a circle, each flung out a slightly different distance. */
const PIECES = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2;
  const reach = 120 + (i % 3) * 40;
  return {
    x: Math.round(Math.cos(angle) * reach),
    y: Math.round(Math.sin(angle) * reach),
    rotate: (i % 2 ? 1 : -1) * (90 + i * 20),
    colour: COLOURS[i % COLOURS.length]!,
    round: i % 3 === 0,
  };
});

/**
 * Level up: Duolingo's full-screen moment, once, when it happened.
 *
 * Shown only when the interview just finished carried the total over a
 * level line, so it is always news. A burst of confetti, Mocki in the form
 * the new level earns (and a line saying so when the form changed), and one
 * button back to the report. Escape and the backdrop close it too — a
 * celebration that traps someone is no longer one.
 */
export function LevelUp({
  level,
  previous,
  onClose,
}: {
  level: number;
  previous: number;
  onClose: () => void;
}) {
  const t = useT();
  const still = useReducedMotion();
  const evolved = tierForLevel(level).index > tierForLevel(previous).index;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="levelup-title"
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-sm rounded-card bg-surface-card p-8 text-center shadow-float"
        initial={still ? false : { transform: "scale(0.9)", opacity: 0 }}
        animate={{ transform: "scale(1)", opacity: 1 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative mx-auto grid h-32 w-32 place-items-center">
          {!still &&
            PIECES.map((piece, i) => (
              <motion.span
                key={i}
                aria-hidden
                className={`absolute h-2.5 w-2.5 ${piece.round ? "rounded-full" : "rounded-sm"} ${piece.colour}`}
                initial={{ transform: "translate(0px, 0px) rotate(0deg) scale(0.4)", opacity: 1 }}
                animate={{
                  transform: `translate(${piece.x}px, ${piece.y}px) rotate(${piece.rotate}deg) scale(1)`,
                  opacity: 0,
                }}
                transition={{ duration: 1.1, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
              />
            ))}
          <motion.div
            initial={still ? false : { transform: "scale(0.5) rotate(-8deg)" }}
            animate={{ transform: "scale(1) rotate(0deg)" }}
            transition={{ type: "spring", duration: 0.7, bounce: 0.45, delay: 0.1 }}
          >
            <Avatar level={level} size={120} />
          </motion.div>
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-accent-text">
          {t("levelup.eyebrow")}
        </p>
        <h2 id="levelup-title" className="mt-1 text-headline font-bold text-cream-bright">
          {t("levelup.title", { level })}
        </h2>
        <p className="mt-2 text-base text-cream-dim">{t(evolved ? "levelup.evolved" : "levelup.body")}</p>
        <Action autoFocus className="mt-6 w-full py-3" onClick={onClose}>
          {t("levelup.continue")}
        </Action>
      </motion.div>
    </motion.div>
  );
}
