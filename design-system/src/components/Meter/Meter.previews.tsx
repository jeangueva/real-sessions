import { definePreviews } from "../../preview";
import { Panel } from "../Panel";
import { Meter } from "./Meter";

export const MeterPreviews = definePreviews([
  {
    id: "score-out-of-ten",
    title: "A score out of ten",
    kind: "default",
    description: "The feedback report's vocabulary score: the label names the dimension, the number carries the meaning, the bar helps the eye compare.",
    render: () => (
      <div className="w-64">
        <Meter label="Vocabulario" value={7} max={10} suffix="/10" />
      </div>
    ),
    code: `<Meter label="Vocabulario" value={7} max={10} suffix="/10" />`,
  },
  {
    id: "percentage",
    title: "A percentage",
    kind: "variant",
    description: "With the defaults, max 100 and suffix \"%\".",
    render: () => (
      <div className="w-64">
        <Meter label="General" value={72} />
      </div>
    ),
    code: `<Meter label="General" value={72} />`,
  },
  {
    id: "bare-count",
    title: "A bare count",
    kind: "variant",
    description: "XP into the next level: the label carries the total, the suffix is empty, and a caption under it says what is left.",
    render: () => (
      <div className="w-64">
        <Meter label="1240 XP en total" value={240} max={400} suffix="" />
        <p className="mt-2 text-xs text-cream-faint">160 XP para el nivel 5</p>
      </div>
    ),
    code: `<Meter label={\`\${xp} XP en total\`} value={xpIntoLevel} max={xpForNextLevel} suffix="" />
<p className="mt-2 text-xs text-cream-faint">{\`\${xpForNextLevel - xpIntoLevel} XP para el nivel \${level + 1}\`}</p>`,
  },
  {
    id: "empty",
    title: "Empty",
    kind: "state",
    state: "empty",
    description: "Zero is a measurement: the track stays, with no fill, and the number says 0.",
    render: () => (
      <div className="w-64">
        <Meter label="Estructura" value={0} max={10} suffix="/10" />
      </div>
    ),
    code: `<Meter label="Estructura" value={0} max={10} suffix="/10" />`,
  },
  {
    id: "complete",
    title: "Complete",
    kind: "state",
    state: "complete",
    description: "The fill covers the track.",
    render: () => (
      <div className="w-64">
        <Meter label="Vocabulario" value={10} max={10} suffix="/10" />
      </div>
    ),
    code: `<Meter label="Vocabulario" value={10} max={10} suffix="/10" />`,
  },
  {
    id: "out-of-range",
    title: "A value outside the scale",
    kind: "edge",
    description: "12 on a scale of 10 and a max of 0 while data loads: the number prints as passed, the bar stops at full or stays empty — it never overflows its track or divides by zero.",
    render: () => (
      <div className="flex w-64 flex-col gap-4">
        <Meter label="Vocabulario" value={12} max={10} suffix="/10" />
        <Meter label="1240 XP en total" value={0} max={0} suffix="" />
      </div>
    ),
    code: `<Meter label="Vocabulario" value={12} max={10} suffix="/10" />
<Meter label="1240 XP en total" value={0} max={0} suffix="" />`,
  },
  {
    id: "long-label-phone",
    title: "Long labels in German at phone width",
    kind: "edge",
    width: 320,
    description: "The longest translations of the product's labels. The label wraps inside its own width; the number keeps its place at the end of the row.",
    render: () => (
      <div lang="de" className="flex flex-col gap-4">
        <Meter label="Wortschatz" value={7} max={10} suffix="/10" />
        <Meter label="12480 XP insgesamt" value={3120} max={4000} suffix="" />
      </div>
    ),
    code: `<div lang="de" className="flex flex-col gap-4">
  <Meter label="Wortschatz" value={7} max={10} suffix="/10" />
  <Meter label="12480 XP insgesamt" value={3120} max={4000} suffix="" />
</div>`,
  },
  {
    id: "right-to-left",
    title: "Right to left",
    kind: "edge",
    width: 320,
    description: "In Hebrew the label starts on the right, the number sits at the left end, and the fill grows from the right. The digits are not mirrored.",
    render: () => (
      <div dir="rtl" lang="he" className="flex flex-col gap-4">
        <Meter label="אוצר מילים" value={7} max={10} suffix="/10" />
        <Meter label="מבנה" value={5} max={10} suffix="/10" />
      </div>
    ),
    code: `<div dir="rtl" lang="he">
  <Meter label="אוצר מילים" value={7} max={10} suffix="/10" />
</div>`,
  },
  {
    id: "report-detail",
    title: "The report's scores by area",
    kind: "in-context",
    description: "Inside the feedback report's full detail: two scores out of ten side by side on wide screens, stacked on phones, followed by the words the person used well.",
    render: () => (
      <Panel className="flex flex-col gap-6 p-6 sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Meter label="Vocabulario" value={7} max={10} suffix="/10" />
          <Meter label="Estructura" value={6} max={10} suffix="/10" />
        </div>
        <p className="text-xs text-cream-faint">Bien usadas</p>
      </Panel>
    ),
    code: `<div className="grid gap-4 sm:grid-cols-2">
  <Meter label="Vocabulario" value={vocabulary.score_out_of_10} max={10} suffix="/10" />
  <Meter label="Estructura" value={structure.score_out_of_10} max={10} suffix="/10" />
</div>`,
  },
  {
    id: "as-a-loading-bar",
    title: "A meter used as a loading bar",
    kind: "misuse",
    description: "A Meter standing in for the progress of an evaluation, with a made-up total.",
    why: "A meter announces a finished measurement (\"Evaluando…, 45\"), so a screen reader hears a score that does not exist, and the number invents a precision the wait does not have. Say what is happening in words; a Meter is for amounts on a real scale.",
    render: () => (
      <div className="w-64">
        <Meter label="Evaluando…" value={45} />
      </div>
    ),
    code: `{/* Don't */}
<Meter label="Evaluando…" value={progress} />`,
  },
]);
