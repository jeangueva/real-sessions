import { Action } from "../Action";
import { CheckItem } from "../CheckItem";
import { Panel } from "../Panel";
import { MonoLabel } from "./MonoLabel";
import { definePreviews } from "../../preview";

export const MonoLabelPreviews = definePreviews([
  {
    id: "section-label",
    title: "A section's label",
    kind: "default",
    description: "The landing's instrument voice: two colons, then the name in mono caps. Written in sentence case; the style uppercases it.",
    render: () => <MonoLabel>Cómo funciona</MonoLabel>,
    code: `<MonoLabel>Cómo funciona</MonoLabel>`,
  },
  {
    id: "above-a-title",
    title: "Above a section title",
    kind: "variant",
    description: "The label names the block; the heading under it makes the claim and is the block's entry in the list of headings.",
    render: () => (
      <div>
        <MonoLabel>Cómo funciona</MonoLabel>
        <h2 className="mt-3 max-w-2xl text-headline text-cream-bright">De tu PDF a tu acta en una tarde.</h2>
      </div>
    ),
    code: `<MonoLabel>Cómo funciona</MonoLabel>
<h2 className="mt-3 text-headline text-cream-bright">De tu PDF a tu acta en una tarde.</h2>`,
  },
  {
    id: "lead-in-portuguese-phone",
    title: "A lead-in before chips, in Portuguese at phone width",
    kind: "edge",
    width: 320,
    description: "The longest label the landing ships, beside the countries the panel follows. It keeps its words together (shrink-0) and the row stacks on a phone.",
    render: () => (
      <div lang="pt-BR" className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <MonoLabel className="shrink-0">Com o formato de banca de</MonoLabel>
        <ul className="flex flex-wrap gap-2">
          {["Peru", "Brasil", "Colômbia", "Chile", "Argentina"].map((name) => (
            <li key={name} className="rounded-full bg-surface-lift px-3 py-1 text-sm text-cream">
              {name}
            </li>
          ))}
        </ul>
      </div>
    ),
    code: `<div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
  <MonoLabel className="shrink-0">{c.countries}</MonoLabel>
  <ul className="flex flex-wrap gap-2">{/* chips */}</ul>
</div>`,
  },
  {
    id: "pricing-card",
    title: "A pricing card's name",
    kind: "in-context",
    description: "The landing's recommended plan: the label is the card's own name, at its top, and the card's one solid Action is the next step.",
    render: () => (
      <Panel className="flex max-w-sm flex-col gap-4 p-5 sm:p-6">
        <MonoLabel>Pack Sustentación</MonoLabel>
        <div className="rounded-2xl bg-surface-lift p-4">
          <p className="flex items-baseline gap-2">
            <span className="text-5xl font-light tabular-nums text-cream-bright">S/ 39</span>
            <span className="font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">pago único</span>
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          <CheckItem>5 sustentaciones con el panel de 3</CheckItem>
          <CheckItem>Tu jurado real y preguntas de tu universidad</CheckItem>
          <CheckItem>Acta, deliberación y respuestas sugeridas</CheckItem>
        </ul>
        <Action tone="solid" withArrow className="mt-2 self-start">
          Elegir el Pack
        </Action>
      </Panel>
    ),
    code: `<Panel className="flex flex-col gap-4 p-5 sm:p-6">
  <MonoLabel>{plan.name}</MonoLabel>
  {/* price, items */}
  <Action tone="solid" withArrow>{plan.cta}</Action>
</Panel>`,
  },
  {
    id: "sentence-in-caps",
    title: "A sentence as a label",
    kind: "misuse",
    description: "The hero's subtitle set as a MonoLabel, with the colons typed by hand on top.",
    why: "Spaced mono caps are for a name of one to three words. A sentence in them is slow to read and shouts, and the typed colons double the drawn ones. Name the block in the label and say the sentence as body text under a heading.",
    render: () => (
      <MonoLabel>:: Un jurado de 3 que leyó tu tesis te pregunta por voz, repregunta como el de verdad y te deja un acta de 0 a 20.</MonoLabel>
    ),
    code: `{/* Don't */}
<MonoLabel>:: Un jurado de 3 que leyó tu tesis te pregunta por voz…</MonoLabel>`,
  },
]);
