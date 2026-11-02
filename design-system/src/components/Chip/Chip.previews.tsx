import { definePreviews } from "../../preview";
import { Inset } from "../Inset";
import { MonoLabel } from "../MonoLabel";
import { Widget } from "../Widget";
import { Chip } from "./Chip";

// Intl.DisplayNames("es") for the landing's COUNTRIES (PE, BR, CO, CL, AR, EC, BO, UY, PA).
const COUNTRIES_ES = ["Perú", "Brasil", "Colombia", "Chile", "Argentina", "Ecuador", "Bolivia", "Uruguay", "Panamá"];
const COUNTRIES_PT = ["Peru", "Brasil", "Colômbia", "Chile", "Argentina", "Equador", "Bolívia", "Uruguai", "Panamá"];

export const ChipPreviews = definePreviews([
  {
    id: "fact",
    title: "A fact",
    kind: "default",
    description: "One country the panel follows. Written in sentence case; the style sets it in mono caps on the amber wash.",
    render: () => <Chip>Perú</Chip>,
    code: `<Chip>Perú</Chip>`,
  },
  {
    id: "tones",
    title: "The two tones",
    kind: "variant",
    description: "soft for a row of facts, accent for the one chip that marks the recommended tier. Each tone picks its fill and ink together, so both clear AA in both themes.",
    render: () => (
      <div className="flex flex-wrap items-center gap-3">
        <Chip>Perú</Chip>
        <Chip tone="accent">Recomendado</Chip>
      </div>
    ),
    code: `<Chip>Perú</Chip>
<Chip tone="accent">Recomendado</Chip>`,
  },
  {
    id: "countries-portuguese-phone",
    title: "Nine countries, in Portuguese, at 320px",
    kind: "edge",
    width: 320,
    description: "The whole row with the longest lead-in the landing ships. The label keeps its words together (shrink-0) and sits above; the chips wrap line by line and never break inside.",
    render: () => (
      <div lang="pt-BR" className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <MonoLabel className="shrink-0">Com o formato de banca de</MonoLabel>
        <ul className="flex flex-wrap gap-2">
          {COUNTRIES_PT.map((name) => (
            <li key={name}>
              <Chip>{name}</Chip>
            </li>
          ))}
        </ul>
      </div>
    ),
    code: `<div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
  <MonoLabel className="shrink-0">{c.countries}</MonoLabel>
  <ul className="flex flex-wrap gap-2">
    {countries.map((name) => <li key={name}><Chip>{name}</Chip></li>)}
  </ul>
</div>`,
  },
  {
    id: "countries",
    title: "Landing: whose format",
    kind: "in-context",
    description: "The band under the hero: a MonoLabel lead-in, then the countries as a list of chips, named by Intl.DisplayNames in the page's locale.",
    render: () => (
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
        <MonoLabel className="shrink-0">Con el formato de jurado de</MonoLabel>
        <ul className="flex flex-wrap gap-2">
          {COUNTRIES_ES.map((name) => (
            <li key={name}>
              <Chip>{name}</Chip>
            </li>
          ))}
        </ul>
      </div>
    ),
    code: `<MonoLabel className="shrink-0">Con el formato de jurado de</MonoLabel>
<ul className="flex flex-wrap gap-2">
  {countries.map((name) => <li key={name}><Chip>{name}</Chip></li>)}
</ul>`,
  },
  {
    id: "recommended",
    title: "Landing: the recommended tier",
    kind: "in-context",
    description: "The accent chip in the featured widget's header, across from the plan's name. It says in words what the accent ring only shows.",
    render: () => (
      <Widget featured className="max-w-sm">
        <div className="flex items-center justify-between gap-3">
          <MonoLabel>Pack Sustentación</MonoLabel>
          <Chip tone="accent">Recomendado</Chip>
        </div>
        <Inset>
          <p className="flex items-baseline gap-2">
            <span className="text-5xl font-light tabular-nums text-cream-bright">S/ 39</span>
            <span className="font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">pago único</span>
          </p>
        </Inset>
      </Widget>
    ),
    code: `<Widget featured>
  <div className="flex items-center justify-between gap-3">
    <MonoLabel>Pack Sustentación</MonoLabel>
    <Chip tone="accent">Recomendado</Chip>
  </div>
  …
</Widget>`,
  },
  {
    id: "chip-as-control",
    title: "Chips as a picker",
    kind: "misuse",
    description: "The jury levels drawn as chips with click handlers, one recoloured by hand to show it is chosen.",
    why: "A chip is a fact: it has no focus ring, no pressed or selected state, and a <span> with onClick is invisible to a keyboard and to a screen reader. The hand-set colour also leaves the tokens. A choice of one among a few is Segmented, which is a radio group.",
    render: () => (
      <div className="flex flex-wrap gap-2">
        {["Calentamiento", "Estándar", "Exigente", "Hostil"].map((level, index) => (
          <Chip key={level} tone={index === 1 ? "accent" : "soft"} onClick={() => undefined} className="cursor-pointer">
            {level}
          </Chip>
        ))}
      </div>
    ),
    code: `{/* Don't */}
<Chip onClick={() => setLevel("estandar")} className="cursor-pointer">Estándar</Chip>

{/* Do */}
<Segmented … />`,
  },
]);
