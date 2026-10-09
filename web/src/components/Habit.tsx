import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Flame, ShieldCheck, Sparkles, Target } from "lucide-react";
import { Action, Eyebrow, FadeRise, Panel, Section } from "@/design-system";
import { useT } from "@/hooks/useLocale";

const FORMS = 6;
const XP_PER_STEP = 120;
const SAMPLE_BADGES = ["first-session", "scored-80", "real-mode", "quick-start"];

/**
 * The game, shown before it is played.
 *
 * Duolingo sells the streak and the owl before the lessons, because the
 * reason people come back is the loop, not the content. This is Mockio's
 * loop on the landing page: Mocki growing up, a streak with its shield, the
 * week's missions and a few badges.
 *
 * The left half is a toy rather than a picture. Each press of the button is
 * "an interview finished": XP pops, the bar fills and Mocki takes its next
 * form — the whole progression in six taps, which a screenshot cannot do.
 */
export function Habit() {
  const t = useT();
  const still = useReducedMotion();
  const [form, setForm] = useState(0);
  const [pops, setPops] = useState(0);
  const last = form === FORMS - 1;

  const advance = () => {
    if (last) {
      setForm(0);
      return;
    }
    setForm((value) => value + 1);
    setPops((value) => value + 1);
  };

  return (
    <Section id="habit" className="bg-surface-deep">
      <FadeRise className="mx-auto max-w-2xl text-center">
        <Eyebrow>{t("land.habitEyebrow")}</Eyebrow>
        <h2 className="mt-3 text-balance text-headline font-semibold text-cream-bright">{t("land.habitTitle")}</h2>
        <p className="mt-4 text-base text-cream-dim sm:text-lg">{t("land.habitBody")}</p>
      </FadeRise>

      <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] [&>*]:min-w-0">
        {/* The toy. */}
        <FadeRise>
          <Panel variant="raised" className="flex h-full flex-col items-center gap-6 p-7 text-center shadow-lift sm:p-9">
            <div className="relative grid h-40 w-40 place-items-center">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.img
                  key={form}
                  src={`/avatars/level-${form + 1}.png`}
                  alt={t("land.habitForm", { form: form + 1, total: FORMS })}
                  width={160}
                  height={160}
                  className="h-40 w-40 drop-shadow-[0_10px_16px_rgb(0_0_0/0.15)]"
                  initial={still ? false : { transform: "scale(0.6)", opacity: 0 }}
                  animate={{ transform: "scale(1)", opacity: 1 }}
                  exit={still ? undefined : { transform: "scale(0.8)", opacity: 0 }}
                  transition={{ type: "spring", duration: 0.55, bounce: 0.45 }}
                />
              </AnimatePresence>
              {/* +XP floats off Mocki on every press. Keyed by the press, so
                  two quick taps are two pops, not one restarted. */}
              <AnimatePresence>
                {pops > 0 && !still && (
                  <motion.span
                    key={pops}
                    aria-hidden
                    className="pointer-events-none absolute -top-2 right-0 inline-flex items-center gap-1 rounded-full bg-premium-soft px-2.5 py-1 text-sm font-bold text-premium"
                    initial={{ transform: "translateY(8px)", opacity: 0 }}
                    animate={{ transform: "translateY(-16px)", opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 1.1, ease: [0.23, 1, 0.32, 1] }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />+{XP_PER_STEP} XP
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            <div className="w-full">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-semibold text-cream-bright">{t("land.habitLevel", { form: form + 1 })}</span>
                <span className="tabular-nums text-cream-dim">
                  {form + 1}/{FORMS}
                </span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-surface-lift">
                <motion.span
                  className="block h-full origin-left rounded-full bg-grow rtl:origin-right"
                  animate={{ transform: `scaleX(${(form + 1) / FORMS})` }}
                  transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
                />
              </div>
            </div>

            <Action className="w-full py-3" onClick={advance}>
              {t(last ? "land.habitReset" : "land.habitTry")}
            </Action>
            <p aria-live="polite" className="-mt-3 text-sm text-cream-dim">
              {t(last ? "land.habitDone" : "land.habitHint")}
            </p>
          </Panel>
        </FadeRise>

        {/* What keeps it going: the streak, the week, the shelf. */}
        <div className="grid gap-5">
          <FadeRise delay={0.08}>
            <Panel className="flex items-center gap-4 p-6">
              <span aria-hidden className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-step-soft text-step">
                <Flame className="h-8 w-8" fill="currentColor" />
              </span>
              <div className="min-w-0">
                <p className="text-title font-bold tabular-nums text-cream-bright">{t("land.habitStreak")}</p>
                <p className="mt-0.5 flex items-start gap-1.5 text-sm text-cream-dim">
                  <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" />
                  {t("land.habitShield")}
                </p>
              </div>
            </Panel>
          </FadeRise>

          <FadeRise delay={0.14}>
            <Panel className="p-6">
              <p className="flex items-center gap-2 text-base font-semibold text-cream-bright">
                <Target aria-hidden className="h-5 w-5 text-accent-text" />
                {t("today.missionsTitle")}
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {(
                  [
                    ["mission.week-three", 2, 3, 60],
                    ["mission.week-share", 1, 1, 40],
                  ] as const
                ).map(([label, progress, goal, xp]) => (
                  <li key={label}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate text-cream-bright">{t(label)}</span>
                      <span className="shrink-0 font-bold text-premium">+{xp} XP</span>
                    </div>
                    <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-lift">
                      <motion.span
                        className={`block h-full origin-left rounded-full rtl:origin-right ${progress === goal ? "bg-grow" : "bg-accent"}`}
                        initial={still ? false : { transform: "scaleX(0)" }}
                        whileInView={{ transform: `scaleX(${progress / goal})` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.7, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </FadeRise>

          <FadeRise delay={0.2}>
            <Panel className="flex flex-wrap items-center justify-between gap-4 p-6">
              <p className="text-base font-semibold text-cream-bright">{t("land.habitBadges")}</p>
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {SAMPLE_BADGES.map((id, index) => (
                  <motion.img
                    key={id}
                    src={`/badges/${id}.png`}
                    alt=""
                    width={52}
                    height={52}
                    className="h-[52px] w-[52px] drop-shadow-[0_4px_8px_rgb(0_0_0/0.15)]"
                    initial={still ? false : { transform: "scale(0.5)", opacity: 0 }}
                    whileInView={{ transform: "scale(1)", opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", duration: 0.5, bounce: 0.45, delay: 0.25 + index * 0.08 }}
                  />
                ))}
              </div>
            </Panel>
          </FadeRise>
        </div>
      </div>
    </Section>
  );
}
