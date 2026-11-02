import { definePreviews } from "../../preview";
import { Meter } from "../Meter";
import { DisclosureMark } from "./DisclosureMark";

const summaryRow = "focus-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded-card p-5 sm:px-6";

export const DisclosureMarkPreviews = definePreviews([
  {
    id: "icon-only",
    title: "Icon only",
    kind: "default",
    description: "The feedback report folds its numbers so they never stand between a person and the plain-language part above. The summary carries a title and a line of body; the mark is the chevron alone. Open it: the chevron turns over.",
    render: () => (
      <details className="rounded-card bg-surface-card shadow-card">
        <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded-card p-6 sm:px-8">
          <span>
            <span className="block text-base font-semibold text-cream-bright">Ver el detalle completo</span>
            <span className="mt-0.5 block text-sm text-cream-dim">Puntajes por área, números medidos y notas del evaluador.</span>
          </span>
          <DisclosureMark />
        </summary>
        <div className="grid gap-4 border-t border-line p-6 sm:grid-cols-2 sm:p-8">
          <Meter label="Vocabulario" value={7} max={10} suffix="/10" />
          <Meter label="Estructura" value={6} max={10} suffix="/10" />
        </div>
      </details>
    ),
    code: `<details className="rounded-card bg-surface-card shadow-card">
  <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-4 rounded-card p-6 sm:px-8">
    <span>
      <span className="block text-base font-semibold text-cream-bright">Ver el detalle completo</span>
      <span className="mt-0.5 block text-sm text-cream-dim">Puntajes por área, números medidos y notas del evaluador.</span>
    </span>
    <DisclosureMark />
  </summary>
  <div className="grid gap-4 border-t border-line p-6 sm:grid-cols-2 sm:p-8">…</div>
</details>`,
  },
  {
    id: "with-label",
    title: "With a label",
    kind: "variant",
    description: "A larger disclosure says what opening does. \"Ver\" turns into \"Cerrar\" (the default openLabel) once open.",
    render: () => (
      <details className="rounded-2xl bg-surface-card shadow-card">
        <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-cream-bright">
          Tu plan hasta el día D
          <DisclosureMark label="Ver" />
        </summary>
        <p className="px-4 pb-4 text-sm text-cream-dim">Pon la fecha de tu sustentación y armamos tu plan día por día.</p>
      </details>
    ),
    code: `<summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-cream-bright">
  Tu plan hasta el día D
  <DisclosureMark label="Ver" />
</summary>`,
  },
  {
    id: "open",
    title: "Open",
    kind: "state",
    state: "open",
    description: "<details open>: the chevron points up and the label has swapped to its open word, here \"Ocultar\" because what folds is a list of plans.",
    render: () => (
      <details open className="rounded-card bg-surface-raised shadow-card">
        <summary className="focus-ring flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-card px-5 py-4 sm:px-7">
          <span className="min-w-0">
            <span className="block text-base font-semibold text-cream-bright">Ensaya con el panel de 3 jurados</span>
            <span className="block text-sm text-cream-dim">Desde S/ 39, pago único. Incluye tu jurado real, preguntas de tu universidad y observaciones.</span>
          </span>
          <DisclosureMark label="Ver planes" openLabel="Ocultar" />
        </summary>
        <p className="px-5 pb-5 text-sm text-cream-dim sm:px-7 sm:pb-6">5 sustentaciones con el panel de 3</p>
      </details>
    ),
    code: `<details open>
  <summary>
    …
    <DisclosureMark label="Ver planes" openLabel="Ocultar" />
  </summary>
</details>`,
  },
  {
    id: "on-a-lifted-row",
    title: "On a lifted summary",
    kind: "variant",
    description: "When the summary itself is on the lifted surface, the pill takes the card fill so it still stands apart — the rehearsal settings in the product.",
    render: () => (
      <details className="rounded-2xl bg-surface-lift">
        <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-cream-bright">
          Ajustes del ensayo
          <DisclosureMark label="Ver" className="bg-surface-card" />
        </summary>
        <p className="px-4 pb-4 text-sm text-cream-dim">¿Qué sustentas?</p>
      </details>
    ),
    code: `<details className="rounded-2xl bg-surface-lift">
  <summary className="… px-4 py-3">
    Ajustes del ensayo
    <DisclosureMark label="Ver" className="bg-surface-card" />
  </summary>
</details>`,
  },
  {
    id: "long-text-portuguese-phone",
    title: "Long summary text in Portuguese at phone width",
    kind: "edge",
    width: 320,
    description: "The jury card's title and body wrap; the pill keeps its word on one line at the end of the row (\"Preencher\" closed, \"Fechar\" open).",
    render: () => (
      <details lang="pt-BR" className="rounded-xl bg-surface-raised shadow-card">
        <summary className="focus-ring flex cursor-pointer list-none items-center gap-3 rounded-xl p-5">
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold tracking-[-0.01em] text-cream-bright">Personalizar nomes da banca (opcional)</span>
            <span className="block text-sm text-cream-dim">
              Por padrão você já tem uma banca predefinida pela sua área. Se já souber quem estará na sua banca, escreva os nomes e manias aqui.
            </span>
          </span>
          <DisclosureMark label="Preencher" openLabel="Fechar" />
        </summary>
        <p className="px-5 pb-5 text-sm text-cream-dim">Presidente</p>
      </details>
    ),
    code: `<summary className="focus-ring flex cursor-pointer list-none items-center gap-3 rounded-xl p-5">
  <span className="min-w-0 flex-1">…</span>
  <DisclosureMark label="Preencher" openLabel="Fechar" />
</summary>`,
  },
  {
    id: "nested",
    title: "A closed disclosure inside an open one",
    kind: "edge",
    description: "Only the nearest <details> turns its mark: the outer one is open, the inner one stays closed with its chevron down.",
    render: () => (
      <details open className="rounded-card bg-surface-card shadow-card">
        <summary className={summaryRow}>
          <span className="text-base font-semibold text-cream-bright">Ficha de tu tesis</span>
          <DisclosureMark label="Ver" />
        </summary>
        <div className="px-5 pb-5 sm:px-6">
          <details className="rounded-2xl bg-surface-lift">
            <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-cream-bright">
              Ajustes del ensayo
              <DisclosureMark className="bg-surface-card" />
            </summary>
            <p className="px-4 pb-4 text-sm text-cream-dim">¿Qué sustentas?</p>
          </details>
        </div>
      </details>
    ),
    code: `<details open>
  <summary>Ficha de tu tesis <DisclosureMark label="Ver" /></summary>
  <details>
    <summary>Ajustes del ensayo <DisclosureMark /></summary>
  </details>
</details>`,
  },
  {
    id: "defense-plan",
    title: "The defense plan, open",
    kind: "in-context",
    description: "The thesis screen's plan card: a title-only summary, so the mark carries a word. Open, \"Ver\" has become \"Cerrar\" and the steps show.",
    render: () => (
      <details open className="rounded-2xl bg-surface-card shadow-card">
        <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-cream-bright">
          Tu plan hasta el día D
          <DisclosureMark label="Ver" />
        </summary>
        <ol className="flex list-decimal flex-col gap-2 px-4 pb-4 ps-9 text-sm text-cream-dim">
          <li>Lee tu diagnóstico y marca los 3 riesgos que más te preocupan.</li>
          <li>Primer ensayo completo en dificultad estándar: busca dónde te trabas.</li>
          <li>Sube tus diapositivas y corrige lo que no coincide con la tesis.</li>
        </ol>
      </details>
    ),
    code: `<details className="rounded-2xl bg-surface-card shadow-card">
  <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-cream-bright">
    Tu plan hasta el día D
    <DisclosureMark label="Ver" />
  </summary>
  <DefensePlanCard thesis={thesis} />
</details>`,
  },
  {
    id: "outside-a-summary",
    title: "A mark on a button",
    kind: "misuse",
    description: "The pill used as the sign on a button that opens a sheet.",
    why: "The turn and the word swap answer only details[open] > summary, so on a button the chevron never moves and \"Ver planes\" never becomes \"Ocultar\". The mark is aria-hidden, so the button's name comes from nothing it shows. A button that opens something is an Action with its own words.",
    render: () => (
      <button type="button" className="focus-ring rounded-full">
        <DisclosureMark label="Ver planes" openLabel="Ocultar" />
      </button>
    ),
    code: `{/* Don't */}
<button onClick={openPlans}>
  <DisclosureMark label="Ver planes" openLabel="Ocultar" />
</button>`,
  },
]);
