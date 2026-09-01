import { Link } from "react-router-dom";
import { Action, CheckItem, Eyebrow, FadeRise, Panel, Section } from "@/design-system";

/**
 * Two plans.
 *
 * Free is a real interview, not a demo with the ending cut off — a general
 * round for your role, scored honestly. What you pay for is the version that
 * knows who you are: the company you are actually applying to, your CV in the
 * interviewer's hands, coaching while you speak, and the history that turns
 * five sessions into a trend.
 *
 * The line is drawn along "does this need to know you", which is why the CV,
 * the company picker and the progress chart all sit on the same side of it.
 */
const FREE = [
  "A full interview for your role, seven turns",
  "Honest score and the headline feedback",
  "Your last three sessions",
  "Speak or type, with the interviewer's voice",
];

const PREMIUM = [
  "The company and sector you are actually targeting",
  "Upload your CV or portfolio — questions get specific to you",
  "Coaching notes beside the transcript, live",
  "Pace, filler rate and thinking time, measured",
  "Full history, four progress trends, badges and league",
  "Choose your interviewer's temperament",
];

export function Pricing() {
  return (
    <Section id="pricing" className="bg-surface-base">
      <Eyebrow>Pricing</Eyebrow>
      <h2 className="mt-4 max-w-3xl text-headline font-normal text-cream-bright">
        Practise free. Pay when you know which company you are walking into.
      </h2>

      <div className="mt-12 grid gap-4 lg:grid-cols-2">
        <FadeRise>
          <Panel className="flex h-full flex-col gap-6 p-6 sm:p-8">
            <div>
              <p className="text-sm text-cream-dim">Free</p>
              <p className="mt-2 text-title text-cream-bright">$0</p>
              <p className="mt-2 text-sm text-cream-dim">
                A general round for your role. Enough to find out whether you
                can hold a conversation under pressure in English.
              </p>
            </div>
            <ul className="flex flex-col gap-3">
              {FREE.map((item) => (
                <CheckItem key={item}>{item}</CheckItem>
              ))}
            </ul>
            <Link to="/app" className="mt-auto self-start">
              <Action tone="glass">Start practising</Action>
            </Link>
          </Panel>
        </FadeRise>

        <FadeRise delay={0.1}>
          <Panel
            variant="raised"
            className="flex h-full flex-col gap-6 border border-cream/25 p-6 sm:p-8"
          >
            <div>
              <div className="flex flex-wrap items-baseline gap-3">
                <p className="text-sm text-cream-dim">Premium</p>
                <span className="rounded-full border border-cream/40 px-3 py-1 text-xs text-cream">
                  Free for early adopters
                </span>
              </div>
              <p className="mt-2 text-title text-cream-bright">
                $9<span className="text-sm text-cream-faint"> / month</span>
              </p>
              <p className="mt-2 text-sm text-cream-dim">
                The interview that knows who you are and where you are applying.
              </p>
            </div>
            <ul className="flex flex-col gap-3">
              {PREMIUM.map((item) => (
                <CheckItem key={item}>{item}</CheckItem>
              ))}
            </ul>
            <a href="#early-access" className="mt-auto self-start">
              <Action withArrow>Get six months free</Action>
            </a>
          </Panel>
        </FadeRise>
      </div>
    </Section>
  );
}
