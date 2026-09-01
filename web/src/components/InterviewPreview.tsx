import { useState } from "react";
import { Section, Eyebrow, Panel, Typewriter, FadeRise } from "@/design-system";

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
  const [turn, setTurn] = useState(0);

  return (
    <Section id="how-it-works" className="bg-surface-base">
      <div className="mx-auto max-w-3xl text-center">
        <Eyebrow>Live simulation</Eyebrow>
        <h2 className="mt-4 text-headline">
          <span className="font-normal text-cream-bright">
            It asks one question,
          </span>{" "}
          <span className="font-serif italic text-cream-dim">
            waits for your answer,
          </span>{" "}
          <span className="font-normal text-cream-bright">
            and never breaks character.
          </span>
        </h2>
      </div>

      <FadeRise className="mx-auto mt-12 max-w-3xl">
        <Panel variant="raised" className="p-6 sm:p-10">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <span className="text-xs text-cream-dim">
              Behavioral · Senior Product Designer · Stripe
            </span>
            <span className="flex items-center gap-2 text-xs text-cream-dim">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-cream animate-blink"
              />
              Turn {turn + 1} of {TURNS.length}
            </span>
          </div>

          <Typewriter
            /* Remount on change so the reveal replays for the new turn. */
            key={turn}
            text={TURNS[turn]!}
            className="min-h-[7rem] py-8 text-title font-normal text-cream-bright"
          />

          <button
            onClick={() => setTurn((current) => (current + 1) % TURNS.length)}
            className="focus-ring -ml-3 rounded-full px-3 py-2 text-sm text-cream-dim underline underline-offset-4 transition-colors hover:text-cream-bright"
          >
            Next turn
          </button>
        </Panel>
      </FadeRise>
    </Section>
  );
}
