import { definePreviews } from "../../preview";
import { IconTile } from "../IconTile";
import { Widget } from "../Widget";
import { Inset } from "./Inset";

const SCENARIOS = [
  { name: "Plan de tesis", minutes: 10, questions: 9 },
  { name: "Bachiller", minutes: 10, questions: 10 },
  { name: "Título profesional", minutes: 15, questions: 12 },
  { name: "Suficiencia profesional", minutes: 15, questions: 10 },
  { name: "Maestría", minutes: 20, questions: 14 },
  { name: "Doctorado", minutes: 30, questions: 16 },
];

export const InsetPreviews = definePreviews([
  {
    id: "row",
    title: "A row inside a widget",
    kind: "default",
    description: "The well groups one point of the widget: a numbered IconTile and its line. It only reads as a recess because the card is behind it.",
    render: () => (
      <Widget className="max-w-md">
        <Inset className="flex items-center gap-3 p-3">
          <IconTile>03</IconTile>
          <span className="text-base text-cream-bright">Deliberación y acta con la escala de tu país</span>
        </Inset>
      </Widget>
    ),
    code: `<Widget>
  <Inset className="flex items-center gap-3 p-3">
    <IconTile>03</IconTile>
    <span className="text-base text-cream-bright">Deliberación y acta con la escala de tu país</span>
  </Inset>
</Widget>`,
  },
  {
    id: "figure",
    title: "A figure, set apart",
    kind: "variant",
    description: "The price of a tier at the default p-4: the figure in light large type, its unit in mono caps beside it.",
    render: () => (
      <Widget className="max-w-sm">
        <Inset>
          <p className="flex items-baseline gap-2">
            <span className="text-5xl font-light tabular-nums text-cream-bright">S/ 79</span>
            <span className="font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">30 días</span>
          </p>
        </Inset>
      </Widget>
    ),
    code: `<Inset>
  <p className="flex items-baseline gap-2">
    <span className="text-5xl font-light tabular-nums text-cream-bright">S/ 79</span>
    <span className="font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">30 días</span>
  </p>
</Inset>`,
  },
  {
    id: "long-portuguese-phone",
    title: "Long Portuguese rows at 320px",
    kind: "edge",
    width: 320,
    description: "The longest product point, in Portuguese, on a phone. The line wraps beside the tile; the tile keeps its size (shrink-0) and the well grows taller.",
    render: () => (
      <div lang="pt-BR">
        <Widget>
          <ol className="flex flex-col gap-2">
            {[
              "Presidente, metodólogo e especialista predefinidos por área, cada um com sua voz",
              "Videochamada individual ou em grupo, com perguntas que citam sua página",
            ].map((item, index) => (
              <li key={item}>
                <Inset className="flex items-center gap-3 p-3">
                  <IconTile>0{index + 1}</IconTile>
                  <span className="text-base text-cream-bright">{item}</span>
                </Inset>
              </li>
            ))}
          </ol>
        </Widget>
      </div>
    ),
    code: `<ol className="flex flex-col gap-2">
  <li>
    <Inset className="flex items-center gap-3 p-3">
      <IconTile>01</IconTile>
      <span className="text-base text-cream-bright">Presidente, metodólogo e especialista…</span>
    </Inset>
  </li>
</ol>`,
  },
  {
    id: "scenarios",
    title: "Landing: the degrees, as rows",
    kind: "in-context",
    description: "Six rows in one widget, px-4 py-3. The degree on the start side, its exposition time and question count in mono caps on the end, shrink-0 so the figure never breaks.",
    render: () => (
      <Widget className="max-w-xl">
        <ul className="flex flex-col gap-2">
          {SCENARIOS.map((s) => (
            <li key={s.name}>
              <Inset className="flex items-baseline justify-between gap-4 px-4 py-3">
                <span className="text-lg font-medium text-cream-bright">{s.name}</span>
                <span className="shrink-0 font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">
                  {s.minutes} min · {s.questions} preguntas
                </span>
              </Inset>
            </li>
          ))}
        </ul>
      </Widget>
    ),
    code: `<Widget>
  <ul className="flex flex-col gap-2">
    {scenarios.map((s) => (
      <li key={s.name}>
        <Inset className="flex items-baseline justify-between gap-4 px-4 py-3">
          <span className="text-lg font-medium text-cream-bright">{s.name}</span>
          <span className="shrink-0 font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">
            {s.minutes} min · {s.questions} preguntas
          </span>
        </Inset>
      </li>
    ))}
  </ul>
</Widget>`,
  },
  {
    id: "step",
    title: "Landing: a step of \"Cómo funciona\"",
    kind: "in-context",
    description: "The step's head in the well (its number and title), the body under it on the card. The steps are an <ol>, so the tile's number is drawing.",
    render: () => (
      <ol className="grid max-w-xs gap-3">
        <li className="min-w-0">
          <Widget className="h-full">
            <Inset className="flex flex-col gap-4">
              <IconTile>02</IconTile>
              <h3 className="text-2xl font-light text-cream-bright">Sustenta por voz</h3>
            </Inset>
            <p className="text-pretty text-base leading-relaxed text-cream-dim">
              Expones con tu tiempo real y respondes a tres jurados que se pasan la palabra.
            </p>
          </Widget>
        </li>
      </ol>
    ),
    code: `<li>
  <Widget className="h-full">
    <Inset className="flex flex-col gap-4">
      <IconTile>02</IconTile>
      <h3 className="text-2xl font-light text-cream-bright">Sustenta por voz</h3>
    </Inset>
    <p className="text-base leading-relaxed text-cream-dim">Expones con tu tiempo real y …</p>
  </Widget>
</li>`,
  },
  {
    id: "on-the-ground",
    title: "An inset on the page ground",
    kind: "misuse",
    description: "The price block placed straight on the page, with no widget behind it.",
    why: "surface-lift is a few percent of the ink laid over whatever is behind it. On a card it reads as a recess; on the page ground there is nothing to recess into, and the block is a faint smudge with no edge. Put it inside a Widget, or make the block itself a Widget.",
    render: () => (
      <div className="rounded-card bg-surface-base p-6">
        <Inset className="max-w-xs">
          <p className="flex items-baseline gap-2">
            <span className="text-5xl font-light tabular-nums text-cream-bright">S/ 39</span>
            <span className="font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">pago único</span>
          </p>
        </Inset>
      </div>
    ),
    code: `{/* Don't */}
<section className="bg-surface-base">
  <Inset>S/ 39 · pago único</Inset>
</section>

{/* Do */}
<Widget><Inset>S/ 39 · pago único</Inset></Widget>`,
  },
]);
