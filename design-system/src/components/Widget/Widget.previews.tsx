import { ArrowRight, Check } from "lucide-react";
import { definePreviews } from "../../preview";
import { Action } from "../Action";
import { Chip } from "../Chip";
import { IconTile } from "../IconTile";
import { Inset } from "../Inset";
import { MonoLabel } from "../MonoLabel";
import { Widget } from "./Widget";

const PLANS = [
  { name: "Gratis", price: "S/ 0", unit: "1 a la semana", items: ["1 videollamada semanal con el jurado de 3 (1:1 o grupal)", "Jurado según tu carrera + diagnóstico de tu tesis", "Sin tarjeta"], cta: "Empezar gratis", featured: false },
  { name: "Pack Sustentación", price: "S/ 39", unit: "pago único", items: ["5 sustentaciones con el panel de 3", "Tu jurado real y preguntas de tu universidad", "Acta, deliberación y respuestas sugeridas", "Levantar observaciones · 6 meses"], cta: "Elegir el Pack", featured: true },
  { name: "Pase Intensivo", price: "S/ 79", unit: "30 días", items: ["20 sustentaciones con el panel de 3", "Todos los modos: autoría, preguntas trampa, coach estadístico", "Presencial o virtual, para el último mes"], cta: "Elegir el Intensivo", featured: false },
];

export const WidgetPreviews = definePreviews([
  {
    id: "labelled",
    title: "A labelled widget",
    kind: "default",
    description: "The landing's card: the label names it, the heading makes the claim, the body says the rest. Flat, a hairline ring, its own padding. From the scenarios section.",
    render: () => (
      <Widget label="Escenarios" className="max-w-md">
        <h3 className="text-headline text-cream-bright">Del plan de tesis al doctorado.</h3>
        <p className="text-pretty text-lg leading-relaxed text-cream-dim">
          Cada grado tiene su jurado. El panel ajusta la profundidad, el tiempo de exposición y la exigencia de la nota.
        </p>
      </Widget>
    ),
    code: `<Widget label="Escenarios">
  <h3 className="text-headline text-cream-bright">Del plan de tesis al doctorado.</h3>
  <p className="text-lg leading-relaxed text-cream-dim">Cada grado tiene su jurado. …</p>
</Widget>`,
  },
  {
    id: "no-label",
    title: "Without a label",
    kind: "variant",
    description: "When the first line already names the widget, the label is left off. One of the four small widgets under \"Además\".",
    render: () => (
      <dl className="max-w-xs">
        <Widget>
          <dt className="text-lg font-medium text-cream-bright">Preguntas reales</dt>
          <dd className="text-pretty text-base text-cream-dim">Las que hicieron los jurados de tu universidad.</dd>
        </Widget>
      </dl>
    ),
    code: `<dl>
  <Widget>
    <dt className="text-lg font-medium text-cream-bright">Preguntas reales</dt>
    <dd className="text-base text-cream-dim">Las que hicieron los jurados de tu universidad.</dd>
  </Widget>
</dl>`,
  },
  {
    id: "featured",
    title: "Featured",
    kind: "state",
    state: "featured",
    description: "The recommended tier: the hairline becomes a 2px accent ring and nothing else moves. The ring is faint on the light theme, so the accent Chip says it in words.",
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
  <Inset>…S/ 39 · pago único</Inset>
</Widget>`,
  },
  {
    id: "long-portuguese-phone",
    title: "Long Portuguese copy at 320px",
    kind: "edge",
    width: 320,
    description: "The longest label and body of the \"people around the student\" widgets, in Portuguese. The label wraps to two lines (the sign it is at its limit), the body wraps, the widget only grows taller.",
    render: () => (
      <div lang="pt-BR">
        <Widget label="Para universidades e faculdades">
          <p className="flex-1 text-pretty text-base text-cream-dim">
            O Mockio dentro do seu Moodle, Canvas ou Blackboard: os alunos entram com um clique e a nota volta ao ambiente
            virtual.
          </p>
          <a href="#integracao" className="focus-ring inline-flex items-center gap-1 rounded-full text-base font-semibold text-accent-text">
            Ver a integração
            <ArrowRight aria-hidden className="h-4 w-4 rtl:-scale-x-100" />
          </a>
        </Widget>
      </div>
    ),
    code: `<Widget label="Para universidades e faculdades">
  <p className="flex-1 text-base text-cream-dim">O Mockio dentro do seu Moodle, …</p>
  <a href="…" className="focus-ring … text-accent-text">Ver a integração <ArrowRight … /></a>
</Widget>`,
  },
  {
    id: "product",
    title: "Landing: the product, as a dashboard",
    kind: "in-context",
    description: "The first widget under the hero: label, a section-sized claim, the body, then three Inset rows each led by a numbered IconTile. The list is an <ol>, so the tiles' numbers are drawing.",
    render: () => (
      <Widget label="El producto" className="max-w-lg">
        <h3 className="text-headline text-cream-bright">Un jurado que leyó tu tesis. Completa.</h3>
        <p className="text-pretty text-lg leading-relaxed text-cream-dim">
          Hasta 300 páginas, escaneadas o no. Cada pregunta sale de una página que puedes abrir, y cada repregunta, de lo
          que acabas de responder.
        </p>
        <ol className="flex flex-col gap-2">
          {[
            "Presidente, metodólogo y especialista según tu carrera, cada uno con su voz",
            "Videollamada individual o grupal, con preguntas que citan tu página",
            "Deliberación y acta con la escala de tu país",
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
    ),
    code: `<Widget label="El producto">
  <h3 className="text-headline text-cream-bright">Un jurado que leyó tu tesis. Completa.</h3>
  <p className="text-lg text-cream-dim">Hasta 300 páginas, …</p>
  <ol className="flex flex-col gap-2">
    <li>
      <Inset className="flex items-center gap-3 p-3">
        <IconTile>01</IconTile>
        <span className="text-base text-cream-bright">Presidente, metodólogo y especialista…</span>
      </Inset>
    </li>
    …
  </ol>
</Widget>`,
  },
  {
    id: "pricing",
    title: "Landing: three tiers, the middle one featured",
    kind: "in-context",
    description: "Pricing as the landing draws it. All three h-full so the row lines up; the middle one featured, with the accent Chip and the page's one solid Action. The others step down to neutral.",
    render: () => (
      <div className="grid gap-3 lg:grid-cols-3 [&>*]:min-w-0">
        {PLANS.map((plan) => (
          <Widget key={plan.name} featured={plan.featured} className="h-full">
            <div className="flex items-center justify-between gap-3">
              <MonoLabel>{plan.name}</MonoLabel>
              {plan.featured && <Chip tone="accent">Recomendado</Chip>}
            </div>
            <Inset>
              <p className="flex items-baseline gap-2">
                <span className="text-5xl font-light tabular-nums text-cream-bright">{plan.price}</span>
                <span className="font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">{plan.unit}</span>
              </p>
            </Inset>
            <ul className="flex flex-1 flex-col gap-3">
              {plan.items.map((item) => (
                <li key={item} className="flex gap-3 text-base text-cream">
                  <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
            <Action tone={plan.featured ? "solid" : "neutral"} withArrow={plan.featured} className="mt-2 self-start">
              {plan.cta}
            </Action>
          </Widget>
        ))}
      </div>
    ),
    code: `<div className="grid gap-3 lg:grid-cols-3">
  {plans.map((plan) => (
    <Widget key={plan.name} featured={plan.featured} className="h-full">
      <div className="flex items-center justify-between gap-3">
        <MonoLabel>{plan.name}</MonoLabel>
        {plan.featured && <Chip tone="accent">Recomendado</Chip>}
      </div>
      <Inset>{/* price */}</Inset>
      <ul className="flex flex-1 flex-col gap-3">{/* items */}</ul>
      <Action tone={plan.featured ? "solid" : "neutral"} withArrow={plan.featured}>{plan.cta}</Action>
    </Widget>
  ))}
</div>`,
  },
  {
    id: "more",
    title: "Landing: four small facts",
    kind: "in-context",
    description: "\"Además\": a description list of four unlabelled widgets in a grid, each a term and its line. The widget is the dt/dd group's wrapper, which a <dl> allows.",
    render: () => (
      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Diapositivas", body: "Revisadas contra tu tesis y contra el reloj." },
          { title: "Preguntas reales", body: "Las que hicieron los jurados de tu universidad." },
          { title: "Tu ensayo en video", body: "Grabado solo en tu dispositivo, pregunta por pregunta." },
          { title: "Observaciones", body: "Cada una ubicada en su página, con qué hacer." },
        ].map((item) => (
          <Widget key={item.title} className="h-full">
            <dt className="text-lg font-medium text-cream-bright">{item.title}</dt>
            <dd className="text-pretty text-base text-cream-dim">{item.body}</dd>
          </Widget>
        ))}
      </dl>
    ),
    code: `<dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
  {items.map((item) => (
    <Widget key={item.title} className="h-full">
      <dt className="text-lg font-medium text-cream-bright">{item.title}</dt>
      <dd className="text-base text-cream-dim">{item.body}</dd>
    </Widget>
  ))}
</dl>`,
  },
  {
    id: "widget-in-widget",
    title: "A widget inside a widget",
    kind: "misuse",
    description: "Each step of \"Cómo funciona\" drawn as a second Widget inside the first.",
    why: "Two rings and two radii a few pixels apart, and two fills of the same colour: the inner card disappears into the outer one except for its edge. A group inside a widget is an Inset, a darker well that recedes instead of repeating the card.",
    render: () => (
      <Widget className="max-w-xs">
        <Widget>
          <IconTile>01</IconTile>
          <h3 className="text-2xl font-light text-cream-bright">Sube tu tesis</h3>
        </Widget>
        <p className="text-pretty text-base leading-relaxed text-cream-dim">
          PDF, Word o fotos de las páginas. En un minuto ves por dónde te va a atacar el jurado.
        </p>
      </Widget>
    ),
    code: `{/* Don't */}
<Widget>
  <Widget><IconTile>01</IconTile><h3>Sube tu tesis</h3></Widget>
</Widget>

{/* Do */}
<Widget>
  <Inset className="flex flex-col gap-4"><IconTile>01</IconTile><h3>Sube tu tesis</h3></Inset>
</Widget>`,
  },
]);
