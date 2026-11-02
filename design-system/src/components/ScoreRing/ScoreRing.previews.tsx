import { Check } from "lucide-react";
import { definePreviews } from "../../preview";
import { Action } from "../Action";
import { Eyebrow } from "../Eyebrow";
import { Panel } from "../Panel";
import { ScoreRing } from "./ScoreRing";

/** The product's middle: the rounded number in display type, a smaller "%" after it. */
function Score({ value, size = "lg" }: { value: number; size?: "lg" | "md" | "sm" }) {
  const number = size === "lg" ? "text-4xl" : size === "md" ? "text-3xl" : "text-lg";
  const suffix = size === "lg" ? "text-lg" : size === "md" ? "text-base" : "";
  return (
    <span className={`block font-bold leading-none tabular-nums text-cream-bright ${number}`}>
      {Math.round(value)}
      {suffix ? <span className={`font-semibold text-cream-faint ${suffix}`}>%</span> : "%"}
    </span>
  );
}

export const ScoreRingPreviews = definePreviews([
  {
    id: "overall-score",
    title: "The overall score",
    kind: "default",
    description: "A shared report's headline: the ring draws itself to 72 in grow, and the number inside carries the meaning.",
    render: () => (
      <ScoreRing value={72} size={132}>
        <Score value={72} />
      </ScoreRing>
    ),
    code: `<ScoreRing value={score} size={132}>
  <span className="block text-4xl font-bold leading-none tabular-nums text-cream-bright">
    {score}
    <span className="text-lg font-semibold text-cream-faint">%</span>
  </span>
</ScoreRing>`,
  },
  {
    id: "sizes",
    title: "Sizes the product uses",
    kind: "variant",
    description: "168 on the end-of-interview report, 132 on a shared report, 128 on a session's detail, 96 for the daily goal. The stroke scales with the ring.",
    render: () => (
      <div className="flex flex-wrap items-center gap-6">
        <ScoreRing value={64}>
          <Score value={64} />
        </ScoreRing>
        <ScoreRing value={64} size={132}>
          <Score value={64} />
        </ScoreRing>
        <ScoreRing value={64} size={128}>
          <Score value={64} size="md" />
        </ScoreRing>
        <ScoreRing value={64} size={96}>
          <Score value={64} size="sm" />
        </ScoreRing>
      </div>
    ),
    code: `<ScoreRing value={score}>…</ScoreRing>
<ScoreRing value={score} size={132}>…</ScoreRing>
<ScoreRing value={score} size={128}>…</ScoreRing>
<ScoreRing value={pct} size={96}>…</ScoreRing>`,
  },
  {
    id: "high",
    title: "High",
    kind: "state",
    state: "high",
    description: "70 and above: grow, the colour of what improved.",
    render: () => (
      <ScoreRing value={85} size={128}>
        <Score value={85} size="md" />
      </ScoreRing>
    ),
    code: `<ScoreRing value={85} size={128}>…</ScoreRing>`,
  },
  {
    id: "middle",
    title: "Middle",
    kind: "state",
    state: "middle",
    description: "From 40 to 69: the accent, the way forward.",
    render: () => (
      <ScoreRing value={55} size={128}>
        <Score value={55} size="md" />
      </ScoreRing>
    ),
    code: `<ScoreRing value={55} size={128}>…</ScoreRing>`,
  },
  {
    id: "low",
    title: "Low",
    kind: "state",
    state: "low",
    description: "Below 40: step, orange — what to work on next. Nothing here is red.",
    render: () => (
      <ScoreRing value={25} size={128}>
        <Score value={25} size="md" />
      </ScoreRing>
    ),
    code: `<ScoreRing value={25} size={128}>…</ScoreRing>`,
  },
  {
    id: "empty",
    title: "Empty",
    kind: "state",
    state: "empty",
    description: "Zero: only the lifted track, and the number says 0.",
    render: () => (
      <ScoreRing value={0} size={128}>
        <Score value={0} size="md" />
      </ScoreRing>
    ),
    code: `<ScoreRing value={0} size={128}>…</ScoreRing>`,
  },
  {
    id: "complete",
    title: "Complete",
    kind: "state",
    state: "complete",
    description: "100: the stroke closes the circle in grow.",
    render: () => (
      <ScoreRing value={100} size={128}>
        <Score value={100} size="md" />
      </ScoreRing>
    ),
    code: `<ScoreRing value={100} size={128}>…</ScoreRing>`,
  },
  {
    id: "band-edges",
    title: "At the edges of each band",
    kind: "edge",
    description: "39, 40, 69 and 70: the colour changes exactly at 40 and at 70.",
    render: () => (
      <div className="flex flex-wrap items-center gap-4">
        {[39, 40, 69, 70].map((v) => (
          <ScoreRing key={v} value={v} size={96}>
            <Score value={v} size="sm" />
          </ScoreRing>
        ))}
      </div>
    ),
    code: `<ScoreRing value={39} size={96}>…</ScoreRing> {/* step */}
<ScoreRing value={40} size={96}>…</ScoreRing> {/* accent */}
<ScoreRing value={69} size={96}>…</ScoreRing> {/* accent */}
<ScoreRing value={70} size={96}>…</ScoreRing> {/* grow */}`,
  },
  {
    id: "out-of-range",
    title: "Outside 0–100, and a decimal",
    kind: "edge",
    description: "120 draws a full ring and -5 an empty one; the caller decides what to print. 71.6 is rounded by the caller before it is printed.",
    render: () => (
      <div className="flex flex-wrap items-center gap-4">
        <ScoreRing value={120} size={96}>
          <Score value={100} size="sm" />
        </ScoreRing>
        <ScoreRing value={-5} size={96}>
          <Score value={0} size="sm" />
        </ScoreRing>
        <ScoreRing value={71.6} size={96}>
          <Score value={71.6} size="sm" />
        </ScoreRing>
      </div>
    ),
    code: `<ScoreRing value={120} size={96}>…100%</ScoreRing>
<ScoreRing value={-5} size={96}>…0%</ScoreRing>
<ScoreRing value={score} size={96}>{Math.round(score)}%</ScoreRing>`,
  },
  {
    id: "goal-met",
    title: "The daily goal, met",
    kind: "edge",
    description: "On Today the middle becomes a check once the goal is met. The check is hidden from screen readers; the caption under the ring says it in words.",
    render: () => (
      <div className="flex flex-col items-center gap-1.5">
        <ScoreRing value={100} size={96}>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-grow text-accent-ink">
            <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
          </span>
        </ScoreRing>
        <p className="text-xs font-semibold text-cream-bright">Meta del día</p>
        <p className="text-xs tabular-nums text-cream-dim">Meta cumplida.</p>
      </div>
    ),
    code: `<ScoreRing value={pct} size={96}>
  {goalMet ? (
    <span className="grid h-10 w-10 place-items-center rounded-full bg-grow text-accent-ink">
      <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
    </span>
  ) : (
    <span className="text-lg font-bold tabular-nums text-cream-bright">{pct}%</span>
  )}
</ScoreRing>
<p className="text-xs font-semibold text-cream-bright">Meta del día</p>
<p className="text-xs tabular-nums text-cream-dim">{goalMet ? "Meta cumplida." : \`\${xp} de \${goal} XP\`}</p>`,
  },
  {
    id: "long-verdict-phone",
    title: "A long verdict in German at phone width",
    kind: "edge",
    width: 320,
    description: "The ring keeps its size and stays round; the verdict beside it wraps in its own column.",
    render: () => (
      <div lang="de" className="flex items-center gap-4">
        <ScoreRing value={55} size={96}>
          <Score value={55} size="sm" />
        </ScoreRing>
        <p className="min-w-0 text-sm text-cream-bright">Läuft gut. Ein paar Anpassungen und du hast es.</p>
      </div>
    ),
    code: `<div className="flex items-center gap-4">
  <ScoreRing value={score} size={96}>…</ScoreRing>
  <p className="min-w-0 text-sm text-cream-bright">{t(verdictFor(score))}</p>
</div>`,
  },
  {
    id: "right-to-left",
    title: "Right to left",
    kind: "edge",
    width: 320,
    description: "In Arabic the ring still starts at twelve o'clock and fills clockwise, like a clock; the digits are not mirrored.",
    render: () => (
      <div dir="rtl" lang="ar" className="flex flex-col items-center gap-2">
        <ScoreRing value={72} size={128}>
          <Score value={72} size="md" />
        </ScoreRing>
        <p className="text-xs text-cream-dim">الإجمالي</p>
      </div>
    ),
    code: `<div dir="rtl" lang="ar">
  <ScoreRing value={72} size={128}>…</ScoreRing>
</div>`,
  },
  {
    id: "session-detail",
    title: "A session's detail",
    kind: "in-context",
    description: "The top of a finished session: the ring, the verdict in words and the next step. One solid Action; repeating is secondary.",
    render: () => (
      <Panel variant="raised" className="flex flex-col items-center gap-5 p-6 text-center shadow-lift sm:flex-row sm:p-8 sm:text-start">
        <ScoreRing value={64} size={128}>
          <Score value={64} size="md" />
        </ScoreRing>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start">
          <Eyebrow>General</Eyebrow>
          <p className="text-title font-semibold text-cream-bright">Vas muy bien. Un par de ajustes y lo tienes.</p>
          <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
            <Action withArrow>Ver el informe completo</Action>
            <Action tone="ghost">Repetir</Action>
          </div>
        </div>
      </Panel>
    ),
    code: `<Panel variant="raised" className="flex flex-col items-center gap-5 p-6 text-center shadow-lift sm:flex-row sm:p-8 sm:text-left">
  <ScoreRing value={score} size={128}>
    <span className="text-3xl font-bold tabular-nums text-cream-bright">
      {Math.round(score)}
      <span className="text-base text-cream-faint">%</span>
    </span>
  </ScoreRing>
  <div className="flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start">
    <p className="text-title font-semibold text-cream-bright">{t(verdictFor(score))}</p>
    <Action withArrow>Ver el informe completo</Action>
    <Action tone="ghost">Repetir</Action>
  </div>
</Panel>`,
  },
  {
    id: "colour-only",
    title: "A ring with no number",
    kind: "misuse",
    description: "The ring alone, trusting its length and colour to say the score.",
    why: "The ring is hidden from screen readers, so this says nothing to them; in the light theme the stroke is under 2:1 on the card, and no one can read 64 from an arc. Always print the number inside.",
    render: () => <ScoreRing value={64} size={128} />,
    code: `{/* Don't */}
<ScoreRing value={score} size={128} />`,
  },
  {
    id: "as-a-spinner",
    title: "A ring used as a loading indicator",
    kind: "misuse",
    description: "A ring filling while the evaluation runs, with a made-up percentage.",
    why: "The ring announces a finished score; here it invents one, and the green or orange reads as a verdict on work that has not been evaluated yet. Say what is happening in words (\"Evaluando…\").",
    render: () => (
      <ScoreRing value={45} size={96}>
        <span className="text-xs text-cream-dim">Evaluando…</span>
      </ScoreRing>
    ),
    code: `{/* Don't */}
<ScoreRing value={progress} size={96}>Evaluando…</ScoreRing>`,
  },
]);
