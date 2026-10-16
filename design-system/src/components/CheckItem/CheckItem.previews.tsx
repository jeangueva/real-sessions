import { definePreviews } from "../../preview";
import { Action } from "../Action";
import { CheckItem } from "./CheckItem";

export const CheckItemPreviews = definePreviews([
  {
    id: "offer",
    title: "What the offer includes",
    kind: "default",
    description: "The early-access offer, itemised. The label above the list says what the checks mean; the checks themselves are not read out.",
    render: () => (
      <dl className="max-w-xl border-t border-line pt-6">
        <dt className="text-sm text-cream-bright">Qué incluye</dt>
        <dd>
          <ul className="mt-4 flex flex-col gap-3">
            <CheckItem>La empresa a la que de verdad te postulas</CheckItem>
            <CheckItem>Tu CV en manos del entrevistador</CheckItem>
            <CheckItem>Entrevistadores en español y portugués</CheckItem>
          </ul>
        </dd>
      </dl>
    ),
    code: `<dl>
  <dt className="text-sm text-cream-bright">Qué incluye</dt>
  <dd>
    <ul className="mt-4 flex flex-col gap-3">
      <CheckItem>La empresa a la que de verdad te postulas</CheckItem>
      <CheckItem>Tu CV en manos del entrevistador</CheckItem>
      <CheckItem>Entrevistadores en español y portugués</CheckItem>
    </ul>
  </dd>
</dl>`,
  },
  {
    id: "long-portuguese-phone",
    title: "Long Portuguese rows at phone width",
    kind: "edge",
    width: 320,
    description: "Rows wrap under themselves; the check stays on the first line and never shrinks.",
    render: () => (
      <div lang="pt-BR">
        <p id="check-item-pt-label" className="text-sm text-cream-bright">
          O que inclui
        </p>
        <ul aria-labelledby="check-item-pt-label" className="mt-4 flex flex-col gap-3">
          <CheckItem>A empresa para a qual você realmente se candidata</CheckItem>
          <CheckItem>Seu CV nas mãos do entrevistador</CheckItem>
          <CheckItem>Entrevistadores em espanhol e português</CheckItem>
        </ul>
      </div>
    ),
    code: `<p id="what" className="text-sm text-cream-bright">O que inclui</p>
<ul aria-labelledby="what" className="mt-4 flex flex-col gap-3">
  <CheckItem>A empresa para a qual você realmente se candidata</CheckItem>
  <CheckItem>Seu CV nas mãos do entrevistador</CheckItem>
</ul>`,
  },
  {
    id: "inline-emphasis",
    title: "Inline emphasis inside a row",
    kind: "edge",
    description: "A bold phrase stays inside the sentence: the words are one flex item, not one per element.",
    render: () => (
      <ul className="flex max-w-md flex-col gap-3">
        <CheckItem>
          Entrevistadores en <strong className="font-semibold text-cream-bright">español y portugués</strong>
        </CheckItem>
        <CheckItem>Todo lo del plan gratis</CheckItem>
      </ul>
    ),
    code: `<CheckItem>
  Entrevistadores en <strong className="font-semibold text-cream-bright">español y portugués</strong>
</CheckItem>`,
  },
  {
    id: "premium-card",
    title: "The Premium plan card",
    kind: "in-context",
    description: "The pricing section's paid plan: name, billing, blurb, what it includes, and the one primary action of the card.",
    render: () => (
      <div className="flex max-w-md flex-col gap-7 rounded-card bg-surface-raised p-7 shadow-card ring-2 ring-accent">
        <div>
          <p className="text-title font-semibold text-cream-bright">Premium</p>
          <p className="mt-1 text-xs text-cream-faint">Se cobra cada mes</p>
          <p className="mt-3 text-sm text-cream-dim">De la entrevista al aumento: tu inglés de trabajo, practicado en voz alta.</p>
        </div>
        <ul aria-label="Qué incluye" className="flex flex-col gap-3">
          <CheckItem>Dailies, llamadas con clientes y demos</CheckItem>
          <CheckItem>Dar malas noticias y explicar un bug</CheckItem>
          <CheckItem>Evaluaciones de desempeño y pedir un aumento</CheckItem>
          <CheckItem>Entrevistas ilimitadas</CheckItem>
          <CheckItem>Historial y progreso completos</CheckItem>
          <CheckItem>Todo lo del plan gratis</CheckItem>
        </ul>
        <Action withArrow className="w-full py-3">
          Suscribirme
        </Action>
      </div>
    ),
    code: `<ul aria-label="Qué incluye" className="flex flex-col gap-3">
  {PREMIUM.map((item) => (
    <CheckItem key={item}>{item}</CheckItem>
  ))}
</ul>
<Action withArrow className="w-full py-3">Suscribirme</Action>`,
  },
  {
    id: "outside-a-list",
    title: "Rows without a list",
    kind: "misuse",
    description: "CheckItems dropped straight into a div.",
    why: "CheckItem renders an <li>. Without a <ul> around it the HTML is invalid and a screen reader announces no list — no \"list, 3 items\", no way to skip it — so the rows read as loose sentences. Wrap them in a <ul> with a label before it.",
    render: () => (
      <div className="flex flex-col gap-3">
        <CheckItem>Entrevistas ilimitadas</CheckItem>
        <CheckItem>Historial y progreso completos</CheckItem>
      </div>
    ),
    code: `{/* Don't */}
<div>
  <CheckItem>Entrevistas ilimitadas</CheckItem>
</div>

{/* Do */}
<ul className="flex flex-col gap-3">
  <CheckItem>Entrevistas ilimitadas</CheckItem>
</ul>`,
  },
]);
