import { definePreviews } from "../../preview";
import { Field } from "./Field";

export const FieldPreviews = definePreviews([
  {
    id: "with-hint",
    title: "Name, control and hint",
    kind: "default",
    description:
      "A control the person has to think about: the name above it, the hint under it saying what it wants. The label points at the control, so a screen reader names it too.",
    render: () => (
      <Field label="Tu nombre" htmlFor="field-name" hint="Así te saludamos al empezar.">
        <input
          id="field-name"
          type="text"
          className="field-control w-full max-w-sm"
          placeholder="Cómo quieres que te llamen"
        />
      </Field>
    ),
    code: `<Field label="Tu nombre" htmlFor="name" hint="Así te saludamos al empezar.">
  <input id="name" className="field-control w-full" placeholder="Cómo quieres que te llamen" />
</Field>`,
  },
  {
    id: "without-hint",
    title: "Without a hint",
    kind: "variant",
    description: "A control that needs no explanation: the name is enough, and there is nothing under it.",
    render: () => (
      <Field label="Correo" htmlFor="field-email">
        <input id="field-email" type="email" className="field-control w-full max-w-sm" placeholder="tu@correo.com" />
      </Field>
    ),
    code: `<Field label="Correo" htmlFor="email">
  <input id="email" type="email" className="field-control w-full" />
</Field>`,
  },
  {
    id: "in-a-grid",
    title: "A field spanning its cell",
    kind: "in-context",
    description:
      "Two fields side by side on a wide screen, one of them spanning both columns. The className is for layout only; the label and the spacing stay the system's.",
    render: () => (
      <div className="grid max-w-2xl gap-6 sm:grid-cols-2">
        <Field label="Título de tu tesis" htmlFor="grid-title" hint="El que va en la portada.">
          <input id="grid-title" type="text" className="field-control w-full" placeholder="Influencia de la gestión…" />
        </Field>
        <Field label="Correo" htmlFor="grid-email" className="sm:col-span-2">
          <input id="grid-email" type="email" className="field-control w-full" placeholder="tu@correo.com" />
        </Field>
      </div>
    ),
    code: `<div className="grid gap-6 sm:grid-cols-2">
  <Field label="Título de tu tesis" htmlFor="title" hint="El que va en la portada.">…</Field>
  <Field label="Correo" htmlFor="email" className="sm:col-span-2">…</Field>
</div>`,
  },
  {
    id: "long-label-portuguese-phone",
    title: "A long label in Portuguese at 320px",
    kind: "edge",
    width: 320,
    description:
      "Portuguese runs about 30% longer than Spanish. The label wraps to two lines and the control moves down with it; the spacing between the three does not change.",
    render: () => (
      <div lang="pt-BR">
        <Field label="Título da sua tese, exatamente como aparece na capa" htmlFor="pt-title" hint="O que aparece na capa.">
          <input id="pt-title" type="text" className="field-control w-full" placeholder="Influência da gestão…" />
        </Field>
      </div>
    ),
    code: `<Field label="Título da sua tese, exatamente como aparece na capa" htmlFor="titulo" hint="O que aparece na capa.">
  <input id="titulo" className="field-control w-full" />
</Field>`,
  },
  {
    id: "label-that-says-nothing",
    title: "A label that says nothing",
    kind: "misuse",
    description: "\"Campo\" above the control. The person has to guess what goes there.",
    why: "The label names the control so the form can be filled without reading the page around it. \"Campo\" and \"Input\" name the shape of the thing, not the thing: with three of them on a screen, the person reads every other line to work out which is which.",
    render: () => (
      <Field label="Campo" htmlFor="bad-field">
        <input id="bad-field" type="text" className="field-control w-full max-w-sm" />
      </Field>
    ),
    code: `{/* Don't */}
<Field label="Campo" htmlFor="campo">
  <input id="campo" className="field-control w-full" />
</Field>`,
  },
]);
