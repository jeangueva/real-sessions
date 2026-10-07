import { useState } from "react";
import {
  Action,
  Section,
  Eyebrow,
  Panel,
  FadeRise,
  InterviewerPresence,
  Waveform,
  useTypewriter,
} from "@/design-system";
import { useT } from "@/hooks/useLocale";

/**
 * Mainframe's typewriter, repurposed. There it was decoration on a landing
 * page; here it is the product's actual behaviour — the interviewer speaks a
 * turn at a time, and the candidate answers. Showing it beats describing it.
 */
const TURNS = [
  "Hi Mariana. I see you have a strong background in fintech. Walk me through a complex product design challenge you solved recently.",
  "Got it. And how did you actually measure that drop-off change?",
  "Feedback on language comes after the interview. Let's stay with the design work — what constraint made that call hard?",
];

export function InterviewPreview() {
  const t = useT();
  const [turn, setTurn] = useState(0);

  return (
    /* Sections alternate white and #F5F5F7, Apple's way of saying "new
       subject" without a rule or a heading colour. */
    <Section id="how-it-works" className="bg-surface-deep">
      <FadeRise className="mx-auto max-w-3xl text-center">
        <Eyebrow>{t("land.previewEyebrow")}</Eyebrow>
        <h2 className="mt-3 text-balance text-headline">
          <span className="text-cream-bright">
            {t("land.previewAsks")}
          </span>{" "}
          <span className="text-accent-text">
            {t("land.previewWaits")}
          </span>{" "}
          <span className="text-cream-bright">
            {t("land.previewCharacter")}
          </span>
        </h2>
      </FadeRise>

      <FadeRise className="mx-auto mt-12 max-w-3xl">
        <Panel variant="raised" className="p-6 shadow-float sm:p-10">
          <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
            <span className="text-xs font-medium text-cream-dim">
              {t("land.previewMeta")}
            </span>
            <span className="flex items-center gap-2 text-xs text-cream-dim">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-accent animate-live"
              />
              {t("land.previewTurn", { turn: turn + 1, total: TURNS.length })}
            </span>
          </div>

          {/* Remount on change so the reveal replays for the new turn. */}
          <SpokenTurn key={turn} text={TURNS[turn]!} />

          <Action
            tone="glass"
            withArrow
            onClick={() => setTurn((current) => (current + 1) % TURNS.length)}
          >
            {t("land.previewNext")}
          </Action>
        </Panel>
      </FadeRise>
    </Section>
  );
}

/** No audio on the landing page: the bars run their travelling wave. */
const SILENT = () => 0;
const UNMEASURED = () => false;

/**
 * One interviewer turn, spoken.
 *
 * The preview used to be text appearing in a box — accurate, and lifeless.
 * The product is a person across the table, so the preview shows one: the
 * presence breathes and the bars move while the question is being said, and
 * both settle when it is finished and it is the reader's turn to answer.
 */
function SpokenTurn({ text }: { text: string }) {
  const t = useT();
  const { displayed, done } = useTypewriter(text);
  return (
    <div className="flex flex-col gap-6 py-8 sm:flex-row sm:items-start">
      <div className="flex shrink-0 items-center gap-3 sm:flex-col">
        <InterviewerPresence initials="AN" speaking={!done} size={72} />
        <Waveform
          active={!done}
          level={SILENT}
          measured={UNMEASURED}
          label={t("land.previewMeta")}
          className="text-accent"
        />
      </div>
      <p className="min-h-[7rem] text-title font-medium text-cream-bright" aria-label={text}>
        <span aria-hidden>{displayed}</span>
        {!done && (
          <span
            aria-hidden
            className="ml-[2px] inline-block h-[1.1em] w-[2px] bg-accent align-middle animate-blink"
          />
        )}
      </p>
    </div>
  );
}
