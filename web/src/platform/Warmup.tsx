import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { Action, Panel } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { fetchThesis } from "@/lib/api";
import type { StoredThesis } from "@/lib/api";
import { useThesisT } from "@/lib/thesis-copy";

/** In for 4, hold 4, out for 6 — the slow exhale is what calms. */
const PHASES = [
  { key: "warmupInhale", seconds: 4, scale: 1 },
  { key: "warmupHold", seconds: 4, scale: 1 },
  { key: "warmupExhale", seconds: 6, scale: 0.6 },
] as const;

/**
 * Ten minutes outside the room.
 *
 * Three steps, in the order nerves are worked through: the body (breathing),
 * the voice (saying the thesis out loud before the first word that counts),
 * the content (the three questions most likely to hurt). Built from the
 * student's own thesis, so the voice warm-up reads their title and the
 * questions are the ones their jury is likeliest to ask.
 */
export function Warmup() {
  const t = useThesisT();
  const still = useReducedMotion();
  const [thesis, setThesis] = useState<StoredThesis | null>(null);
  const [step, setStep] = useState(0);
  const [question, setQuestion] = useState(0);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    fetchThesis()
      .then((result) => setThesis(result.thesis))
      .catch(() => setThesis(null));
  }, []);

  // The breathing cycle, only while that step is on screen.
  useEffect(() => {
    if (step !== 1) return;
    const id = window.setTimeout(() => setPhase((current) => (current + 1) % PHASES.length), PHASES[phase]!.seconds * 1000);
    return () => window.clearTimeout(id);
  }, [step, phase]);

  const order = { alta: 0, media: 1, baja: 2 };
  const questions = thesis
    ? [...thesis.analysis.risks].sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 3).map((risk) => risk.likely_question)
    : [];
  const current = PHASES[phase]!;

  return (
    <>
      <PageHeader title={t("warmupTitle")} meta={t("warmupMeta")} />
      <PageBody className="mx-auto flex max-w-2xl flex-col gap-4">
        {step === 0 && (
          <Panel variant="raised" className="flex flex-col items-start gap-4 p-6 sm:p-8">
            <ol className="flex flex-col gap-2 text-base text-cream">
              <li>1. {t("warmupStep1")} · 2 min</li>
              <li>2. {t("warmupStep2")} · 3 min</li>
              <li>3. {t("warmupStep3")} · 5 min</li>
            </ol>
            <Action withArrow onClick={() => setStep(1)}>
              {t("warmupStart")}
            </Action>
          </Panel>
        )}

        {step === 1 && (
          <Panel variant="raised" className="flex flex-col items-center gap-6 p-8 text-center">
            <h2 className="text-title font-semibold text-cream-bright">{t("warmupStep1")}</h2>
            <p className="text-sm text-cream-dim">{t("warmupStep1Body")}</p>
            <div className="grid h-48 w-48 place-items-center">
              <span
                aria-hidden
                className="block h-48 w-48 rounded-full bg-accent-soft"
                style={{
                  transform: `scale(${still ? 0.8 : current.scale})`,
                  transition: still ? "none" : `transform ${current.seconds}s ease-in-out`,
                }}
              />
            </div>
            <p aria-live="polite" className="text-2xl font-semibold text-cream-bright">
              {t(current.key)}
            </p>
            <Action withArrow onClick={() => setStep(2)}>
              {t("warmupNext")}
            </Action>
          </Panel>
        )}

        {step === 2 && (
          <Panel variant="raised" className="flex flex-col gap-4 p-6 sm:p-8">
            <h2 className="text-title font-semibold text-cream-bright">{t("warmupStep2")}</h2>
            <p className="text-sm text-cream-dim">{t("warmupStep2Body")}</p>
            {thesis && (
              <blockquote className="rounded-2xl bg-surface-lift p-5 text-lg leading-relaxed text-cream-bright">
                <p className="font-semibold">{thesis.analysis.title}</p>
                <p className="mt-3">{thesis.analysis.ficha.general_objective.text}</p>
              </blockquote>
            )}
            <div>
              <Action withArrow onClick={() => setStep(3)}>
                {t("warmupNext")}
              </Action>
            </div>
          </Panel>
        )}

        {step === 3 && (
          <Panel variant="raised" className="flex flex-col gap-4 p-6 sm:p-8">
            <h2 className="text-title font-semibold text-cream-bright">{t("warmupStep3")}</h2>
            <p className="text-sm text-cream-dim">{t("warmupStep3Body")}</p>
            {questions[question] && (
              <>
                <p className="text-xs font-semibold text-accent-text">{t("warmupQuestion", { n: question + 1 })}</p>
                <p className="rounded-2xl bg-surface-lift p-5 text-lg leading-relaxed text-cream-bright">“{questions[question]}”</p>
              </>
            )}
            <div>
              <Action
                withArrow
                onClick={() => (question + 1 < questions.length ? setQuestion(question + 1) : setStep(4))}
              >
                {t("warmupNext")}
              </Action>
            </div>
          </Panel>
        )}

        {step === 4 && (
          <Panel variant="raised" className="p-8 text-center">
            <p className="text-title font-semibold text-cream-bright">{t("warmupDone")}</p>
          </Panel>
        )}
      </PageBody>
    </>
  );
}
