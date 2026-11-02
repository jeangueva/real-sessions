import { Upload } from "lucide-react";
import { definePreviews } from "../../preview";
import { Inset } from "../Inset";
import { Widget } from "../Widget";
import { IconTile } from "./IconTile";

export const IconTilePreviews = definePreviews([
  {
    id: "number",
    title: "A step number",
    kind: "default",
    description: "Two digits in mono, centred in the amber-tint square. Silent to a screen reader: the text beside it says what the step is.",
    render: () => (
      <Widget className="max-w-xs">
        <Inset className="flex items-center gap-3 p-3">
          <IconTile>01</IconTile>
          <span className="text-base text-cream-bright">Sube tu tesis</span>
        </Inset>
      </Widget>
    ),
    code: `<Inset className="flex items-center gap-3 p-3">
  <IconTile>01</IconTile>
  <span className="text-base text-cream-bright">Sube tu tesis</span>
</Inset>`,
  },
  {
    id: "icon",
    title: "An icon",
    kind: "variant",
    description: "One lucide icon at h-5 w-5 in place of the number, repeating the words beside it. The icon inherits accent-text from the tile.",
    render: () => (
      <Widget className="max-w-xs">
        <Inset className="flex items-center gap-3 p-3">
          <IconTile>
            <Upload className="h-5 w-5" />
          </IconTile>
          <span className="text-base text-cream-bright">Sube tu tesis</span>
        </Inset>
      </Widget>
    ),
    code: `<IconTile>
  <Upload className="h-5 w-5" />
</IconTile>`,
  },
  {
    id: "rtl-phone",
    title: "Right to left, at 320px",
    kind: "edge",
    width: 320,
    description: "In a right-to-left document the tile moves to the start side, on the right; the number does not mirror. The long line wraps beside it and the tile keeps its 40px (shrink-0).",
    render: () => (
      <div dir="rtl">
        <Widget>
          <Inset className="flex items-center gap-3 p-3">
            <IconTile>02</IconTile>
            <span lang="es" className="text-base text-cream-bright">
              Videollamada individual o grupal, con preguntas que citan tu página
            </span>
          </Inset>
        </Widget>
      </div>
    ),
    code: `<div dir="rtl">
  <Inset className="flex items-center gap-3 p-3">
    <IconTile>02</IconTile>
    <span>…</span>
  </Inset>
</div>`,
  },
  {
    id: "how-it-works",
    title: "Landing: Cómo funciona",
    kind: "in-context",
    description: "Three steps, each a Widget with its tile and title in an Inset and the body under it. The <ol> announces the order; the tiles draw it.",
    render: () => (
      <ol className="grid gap-3 md:grid-cols-3">
        {[
          { title: "Sube tu tesis", body: "PDF, Word o fotos de las páginas. En un minuto ves por dónde te va a atacar el jurado." },
          { title: "Sustenta por voz", body: "Expones con tu tiempo real y respondes a tres jurados que se pasan la palabra." },
          { title: "Recibe el acta", body: "Tu nota, lo que opinó cada jurado y la respuesta que deberías dar la próxima vez." },
        ].map((step, index) => (
          <li key={step.title} className="min-w-0">
            <Widget className="h-full">
              <Inset className="flex flex-col gap-4">
                <IconTile>0{index + 1}</IconTile>
                <h3 className="text-2xl font-light text-cream-bright">{step.title}</h3>
              </Inset>
              <p className="text-pretty text-base leading-relaxed text-cream-dim">{step.body}</p>
            </Widget>
          </li>
        ))}
      </ol>
    ),
    code: `<ol className="grid gap-3 md:grid-cols-3">
  {steps.map((step, index) => (
    <li key={step.title}>
      <Widget className="h-full">
        <Inset className="flex flex-col gap-4">
          <IconTile>0{index + 1}</IconTile>
          <h3 className="text-2xl font-light text-cream-bright">{step.title}</h3>
        </Inset>
        <p className="text-base text-cream-dim">{step.body}</p>
      </Widget>
    </li>
  ))}
</ol>`,
  },
  {
    id: "icon-as-label",
    title: "A tile as the only label",
    kind: "misuse",
    description: "A row of tiles with icons and nothing beside them, standing in for the steps.",
    why: "The tile is aria-hidden: a screen reader hears nothing at all here, and a sighted reader has to guess what an upload arrow means as a step. The tile draws what the words say; it never replaces them.",
    render: () => (
      <Widget className="max-w-xs">
        <div className="flex gap-3">
          <IconTile>
            <Upload className="h-5 w-5" />
          </IconTile>
          <IconTile>02</IconTile>
          <IconTile>03</IconTile>
        </div>
      </Widget>
    ),
    code: `{/* Don't */}
<div className="flex gap-3">
  <IconTile><Upload className="h-5 w-5" /></IconTile>
  <IconTile>02</IconTile>
</div>`,
  },
]);
