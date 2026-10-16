import { definePreviews } from "../../preview";
import { Eyebrow } from "./Eyebrow";

export const EyebrowPreviews = definePreviews([
  {
    id: "over-heading",
    title: "Over a section heading",
    kind: "default",
    description: "The eyebrow places the section; the heading under it says something.",
    render: () => (
      <div className="max-w-2xl">
        <Eyebrow>Precios</Eyebrow>
        <h2 className="mt-3 text-headline font-semibold text-cream-bright">
          Gratis para conseguir el trabajo. Después, al precio de tu país.
        </h2>
      </div>
    ),
    code: `<Eyebrow>Precios</Eyebrow>
<h2 className="mt-3 text-headline font-semibold text-cream-bright">
  Gratis para conseguir el trabajo. Después, al precio de tu país.
</h2>`,
  },
  {
    id: "landing-centred",
    title: "Landing section, centred",
    kind: "in-context",
    description: "The journey section's header: centred with its heading, the way every landing section opens.",
    render: () => (
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow>De la entrevista al aumento</Eyebrow>
        <h2 className="mt-3 text-balance text-headline font-semibold text-cream-bright">
          Cada conversación de un trabajo remoto, ensayada antes de que cuente.
        </h2>
      </div>
    ),
    code: `<div className="mx-auto max-w-2xl text-center">
  <Eyebrow>De la entrevista al aumento</Eyebrow>
  <h2 className="mt-3 text-balance text-headline font-semibold text-cream-bright">
    Cada conversación de un trabajo remoto, ensayada antes de que cuente.
  </h2>
</div>`,
  },
  {
    id: "acta-card",
    title: "Over a value, in the acta card",
    kind: "in-context",
    description: "In the platform an eyebrow often labels a number rather than a heading: here, the simulated grade.",
    render: () => (
      <div className="max-w-md rounded-card bg-surface-raised p-6 shadow-lift">
        <div className="flex flex-col gap-2">
          <Eyebrow>Acta simulada</Eyebrow>
          <p className="flex items-baseline gap-2">
            <span className="text-[2.75rem] font-bold leading-none tabular-nums text-cream-bright">16</span>
            <span className="text-lg font-semibold text-cream-faint">de 20</span>
          </p>
          <p>
            <span className="rounded-full bg-grow-soft px-3 py-1 text-sm font-semibold text-grow-text">Aprobado por mayoría</span>
          </p>
        </div>
      </div>
    ),
    code: `<Eyebrow>Acta simulada</Eyebrow>
<p className="flex items-baseline gap-2">
  <span className="text-[2.75rem] font-bold leading-none tabular-nums text-cream-bright">16</span>
  <span className="text-lg font-semibold text-cream-faint">de 20</span>
</p>`,
  },
  {
    id: "long-portuguese-phone",
    title: "Long Portuguese copy at phone width",
    kind: "edge",
    width: 320,
    description: "The shared report's header in Portuguese. A longer translation wraps to a second line and is never truncated; lang goes through to the paragraph.",
    render: () => (
      <div className="flex flex-col gap-2">
        <Eyebrow lang="pt-BR">Relatório de uma entrevista de treino</Eyebrow>
        <h2 lang="pt-BR" className="text-title font-semibold text-cream-bright">
          Analista de dados na Rappi
        </h2>
      </div>
    ),
    code: `<Eyebrow lang="pt-BR">Relatório de uma entrevista de treino</Eyebrow>
<h2 lang="pt-BR">Analista de dados na Rappi</h2>`,
  },
  {
    id: "instead-of-heading",
    title: "An eyebrow in place of the heading",
    kind: "misuse",
    description: "The section has a kicker and a body, and no name.",
    why: "An Eyebrow is a paragraph. A section that opens with one and no heading has no entry in a screen reader's headings list, and sighted readers get a label where they expected a statement. Keep the eyebrow and add the heading under it.",
    render: () => (
      <div className="max-w-xl">
        <Eyebrow>Acceso anticipado</Eyebrow>
        <p className="mt-3 text-sm text-cream-dim">La empresa a la que de verdad te postulas.</p>
      </div>
    ),
    code: `{/* Don't */}
<Eyebrow>Acceso anticipado</Eyebrow>
<p>La empresa a la que de verdad te postulas.</p>

{/* Do */}
<Eyebrow>Acceso anticipado</Eyebrow>
<h2>Seis meses del plan pago, gratis.</h2>`,
  },
  {
    id: "spaced-caps",
    title: "Spaced capitals",
    kind: "misuse",
    description: "Restyled through className into the tracked-out caps the system dropped.",
    why: "The system set eyebrows apart with the accent and weight, not with spaced caps: tracked-out capitals are slower to read and turn a place name into decoration. className is for layout, not for restyling the type.",
    render: () => <Eyebrow className="uppercase tracking-[0.25em]">Precios</Eyebrow>,
    code: `{/* Don't */}
<Eyebrow className="uppercase tracking-[0.25em]">Precios</Eyebrow>`,
  },
]);
