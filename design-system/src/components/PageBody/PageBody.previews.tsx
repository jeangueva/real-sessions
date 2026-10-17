import { Upload } from "lucide-react";
import { definePreviews } from "../../preview";
import { Action } from "../Action/Action";
import { Panel } from "../Panel/Panel";
import { PageBody } from "./PageBody";

export const PageBodyPreviews = definePreviews([
  {
    id: "screen",
    title: "A screen's body",
    kind: "default",
    description:
      "Mi tesis before anything is uploaded. The screen's layout — a column with a 24px gap — is on PageBody itself, not on a wrapper inside it.",
    render: () => (
      <div className="bg-surface-deep">
        <PageBody className="flex flex-col gap-6">
          <Panel variant="raised" className="flex flex-col items-start gap-4 p-6 sm:p-8">
            <h2 className="text-title font-semibold text-cream-bright">Sube tu tesis</h2>
            <p className="max-w-prose text-base leading-relaxed text-cream">
              PDF (también escaneado), Word o una foto, hasta 300 páginas. La leemos página por página y te mostramos
              por dónde te va a atacar el jurado.
            </p>
            <Action tone="neutral">
              <Upload className="h-4 w-4" aria-hidden />
              Elegir archivo
            </Action>
          </Panel>
        </PageBody>
      </div>
    ),
    code: `<PageBody className="flex flex-col gap-6">
  <Panel variant="raised" className="flex flex-col items-start gap-4 p-6 sm:p-8">
    <h2 className="text-title font-semibold text-cream-bright">Sube tu tesis</h2>
    …
  </Panel>
</PageBody>`,
  },
  {
    id: "reading",
    title: "Reading width",
    kind: "variant",
    description:
      "width=\"reading\" stops the column at 48rem and centres it: the day-of warm-up, read top to bottom as one column. Pass the same width to the screen's PageHeader.",
    render: () => (
      <div className="bg-surface-deep">
        <PageBody width="reading" className="flex flex-col gap-4">
          <Panel variant="raised" className="flex flex-col items-start gap-4 p-6 sm:p-8">
            <ol className="flex flex-col gap-2 text-base text-cream">
              <li>1. Respira · 2 min</li>
              <li>2. Calienta la voz · 3 min</li>
              <li>3. Tus tres preguntas · 5 min</li>
            </ol>
            <Action withArrow>Empezar</Action>
          </Panel>
        </PageBody>
      </div>
    ),
    code: `<PageHeader width="reading" title="Calentamiento del Día D" meta="10 minutos antes de entrar. …" />
<PageBody width="reading" className="flex flex-col gap-4">
  <Panel variant="raised" className="flex flex-col items-start gap-4 p-6 sm:p-8">…</Panel>
</PageBody>`,
  },
  {
    id: "two-columns",
    title: "Two columns from lg",
    kind: "variant",
    description:
      "The grid is on PageBody, so the two Panels are its columns: stacked on a phone, side by side from 1024px, filling a wide window instead of hugging the left edge.",
    render: () => (
      <div className="bg-surface-deep">
        <PageBody className="grid gap-5 lg:grid-cols-2">
          <Panel className="flex flex-col gap-2 p-6">
            <h2 className="text-base font-semibold text-cream-bright">Ensaya tu sustentación</h2>
            <p className="text-sm text-cream-dim">
              Por voz, con el jurado que leyó tu tesis. Cada pregunta cita la página de donde sale.
            </p>
          </Panel>
          <Panel className="flex flex-col gap-2 p-6">
            <h2 className="text-base font-semibold text-cream-bright">Tu jurado real</h2>
            <p className="text-sm text-cream-dim">
              Escribe quiénes serán tus jurados. En los ensayos con el panel completo, cada uno pregunta desde su
              especialidad y con las manías que nos cuentes.
            </p>
          </Panel>
        </PageBody>
      </div>
    ),
    code: `<PageBody className="grid gap-5 lg:grid-cols-2">
  <Panel className="flex flex-col gap-2 p-6">…</Panel>
  <Panel className="flex flex-col gap-2 p-6">…</Panel>
</PageBody>`,
  },
  {
    id: "empty-phone",
    title: "Empty data at 320px",
    kind: "edge",
    width: 320,
    description:
      "A screen with nothing to show yet, at phone width: 16px gutters, one raised Panel that says so. The body has no empty state of its own; the screen puts one inside.",
    render: () => (
      <div className="bg-surface-deep">
        <PageBody>
          <Panel variant="raised" className="p-6">
            <p className="text-sm text-cream-dim">Todavía no hay nada que graficar</p>
          </Panel>
        </PageBody>
      </div>
    ),
    code: `<PageBody>
  <Panel variant="raised" className="p-6">
    <p className="text-sm text-cream-dim">Todavía no hay nada que graficar</p>
  </Panel>
</PageBody>`,
  },
  {
    id: "call-padding",
    title: "Live interview: trimmed padding",
    kind: "in-context",
    description:
      "The call screen gives every pixel to the video on a phone: pt-3 and pb-4 override the built-in py-8 (longhands always win over py-*), and flex-1 lets the call fill the height under a compact PageHeader.",
    render: () => (
      <div className="flex min-h-[20rem] flex-col bg-surface-deep">
        <PageBody className="flex flex-1 flex-col pb-4 pt-3 sm:py-6 lg:py-10">
          <div className="flex flex-1 flex-col gap-3 lg:gap-4">
            <Panel variant="raised" className="grid min-h-[12rem] flex-1 place-items-center p-6">
              <p className="text-sm text-cream-dim">Escuchando…</p>
            </Panel>
          </div>
        </PageBody>
      </div>
    ),
    code: `<PageHeader compact title="Universidad Nacional Mayor de San Marcos · Sustentación de tesis" … />
<PageBody className="flex flex-1 flex-col pb-4 pt-3 sm:py-6 lg:py-10">
  <div className="flex flex-1 flex-col gap-3 lg:gap-4">…the call and the transcript…</div>
</PageBody>`,
  },
  {
    id: "max-width-in-classname",
    title: "A max-w-* in className",
    kind: "misuse",
    description: "The affiliate page as the product writes it today: meant to be a 48rem reading column, it renders 110rem wide.",
    why: "There is no tailwind-merge, so both max-w-[110rem] and max-w-3xl are on the element, and in the generated CSS the arbitrary value comes later and wins. On a desktop the sentence runs the width of the window. Use width=\"reading\".",
    render: () => (
      <div className="bg-surface-deep">
        <PageBody className="mx-auto flex max-w-3xl flex-col gap-4">
          <Panel variant="raised" className="p-6 sm:p-8">
            <p className="text-sm text-cream-dim">
              Comparte el enlace o el código con tus tesistas. Cada compra de un alumno que llegó por ti te da el 30%.
              Ves el avance solo de quienes deciden compartirlo.
            </p>
          </Panel>
        </PageBody>
      </div>
    ),
    code: `{/* Don't */}
<PageBody className="mx-auto flex max-w-3xl flex-col gap-4">…</PageBody>

{/* Do */}
<PageBody width="reading" className="flex flex-col gap-4">…</PageBody>`,
  },
]);
