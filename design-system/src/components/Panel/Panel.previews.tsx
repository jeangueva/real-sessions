import { Loader2, LogOut, Sparkles, Upload } from "lucide-react";
import { definePreviews } from "../../preview";
import { Action } from "../Action/Action";
import { Panel } from "./Panel";

export const PanelPreviews = definePreviews([
  {
    id: "card",
    title: "Card",
    kind: "default",
    description: "The most common panel: a card holding one line and the action it is about. From Settings, under the account tab.",
    render: () => (
      <Panel className="flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
        <p className="text-sm text-cream-dim">Sesión iniciada en este dispositivo.</p>
        <Action tone="neutral">
          <LogOut className="h-4 w-4" aria-hidden />
          Cerrar sesión
        </Action>
      </Panel>
    ),
    code: `<Panel className="flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
  <p className="text-sm text-cream-dim">Sesión iniciada en este dispositivo.</p>
  <Action tone="neutral">
    <LogOut className="h-4 w-4" aria-hidden />
    Cerrar sesión
  </Action>
</Panel>`,
  },
  {
    id: "variants",
    title: "The three surfaces",
    kind: "variant",
    description:
      "On the signed-in ground (surface-deep). card is the lighter fill, raised a step darker on the dark theme and the same white on the light one, glass an unfilled sheet with an edge.",
    render: () => (
      <div className="grid gap-4 rounded-card bg-surface-deep p-4 sm:grid-cols-3">
        {(["card", "raised", "glass"] as const).map((variant) => (
          <Panel key={variant} variant={variant} className="p-6">
            <p className="font-mono text-sm text-cream-bright">variant="{variant}"</p>
          </Panel>
        ))}
      </div>
    ),
    code: `<Panel className="p-6">…</Panel>
<Panel variant="raised" className="p-6">…</Panel>
<Panel variant="glass" className="p-6">…</Panel>`,
  },
  {
    id: "glass-over-media",
    title: "Glass, over footage",
    kind: "variant",
    theme: "dark",
    description:
      "The one surface allowed over video. Inside .on-media the ink is pinned to cream whatever the theme, and the glass blurs what is behind it instead of covering it.",
    render: () => (
      <div className="on-media rounded-card bg-gradient-to-br from-[#1b1b3a] to-black p-6 sm:p-10">
        <Panel variant="glass" className="flex max-w-md flex-col gap-2 p-5">
          <p className="text-xs font-semibold text-cream-dim">Dra. Vidal · Metodóloga</p>
          <p className="text-sm leading-relaxed text-cream-bright">
            En la página 41 aplica Pearson. ¿Verificó antes la normalidad de sus datos? No encuentro esa prueba en su
            tesis.
          </p>
        </Panel>
      </div>
    ),
    code: `<div className="on-media …">  {/* the footage */}
  <Panel variant="glass" className="flex max-w-md flex-col gap-2 p-5">
    <p className="text-xs font-semibold text-cream-dim">Dra. Vidal · Metodóloga</p>
    <p className="text-sm leading-relaxed text-cream-bright">En la página 41 aplica Pearson. …</p>
  </Panel>
</div>`,
  },
  {
    id: "long-copy-phone",
    title: "Long Portuguese copy at 320px",
    kind: "edge",
    width: 320,
    description: "The panel only gets taller. Width comes from the column; the heading and body wrap, and the action takes the full width on a phone.",
    render: () => (
      <Panel variant="raised" className="flex flex-col items-start gap-4 p-6">
        <h2 className="text-title font-semibold text-cream-bright">Envie seu trabalho</h2>
        <p className="text-base leading-relaxed text-cream">
          PDF (também escaneado), Word ou uma foto, até 300 páginas. Lemos página por página e mostramos onde a banca
          vai pressionar.
        </p>
        <Action tone="neutral" className="w-full">
          <Upload className="h-4 w-4" aria-hidden />
          Escolher arquivo
        </Action>
      </Panel>
    ),
    code: `<Panel variant="raised" className="flex flex-col items-start gap-4 p-6">
  <h2 className="text-title font-semibold text-cream-bright">Envie seu trabalho</h2>
  <p className="text-base leading-relaxed text-cream">PDF (também escaneado), Word ou uma foto…</p>
  <Action tone="neutral" className="w-full">…Escolher arquivo</Action>
</Panel>`,
  },
  {
    id: "empty-list",
    title: "Empty data",
    kind: "edge",
    description:
      "When a list has no rows yet, one raised panel says what the list is for and offers the first step. From Applications, before the first job is added.",
    render: () => (
      <Panel variant="raised" className="flex max-w-xl flex-col gap-3 p-6">
        <p className="text-sm text-cream-bright">Agrega el puesto para el que te estás preparando.</p>
        <p className="text-sm leading-relaxed text-cream-dim">
          Pega la oferta una vez. Cada entrevista que practiques para ese puesto usa sus requisitos y su vocabulario, y
          puedes ver si estás mejorando en ese.
        </p>
        <Action className="self-start">Agregar un puesto</Action>
      </Panel>
    ),
    code: `<Panel variant="raised" className="flex max-w-xl flex-col gap-3 p-6">
  <p className="text-sm text-cream-bright">Agrega el puesto para el que te estás preparando.</p>
  <p className="text-sm leading-relaxed text-cream-dim">Pega la oferta una vez. …</p>
  <Action className="self-start">Agregar un puesto</Action>
</Panel>`,
  },
  {
    id: "thesis-upload",
    title: "Thesis: the upload step",
    kind: "in-context",
    description:
      "The first thing on Mi tesis before anything is uploaded. A raised panel on the page ground, its heading an h2 under the page's h1, one action, the privacy line under it.",
    render: () => (
      <Panel variant="raised" className="flex flex-col items-start gap-4 p-6 sm:p-8">
        <h2 className="text-title font-semibold text-cream-bright">Sube tu tesis</h2>
        <p className="max-w-prose text-base leading-relaxed text-cream">
          PDF (también escaneado), Word o una foto, hasta 300 páginas. La leemos página por página y te mostramos por
          dónde te va a atacar el jurado.
        </p>
        <Action tone="neutral">
          <Upload className="h-4 w-4" aria-hidden />
          Elegir archivo
        </Action>
        <p className="max-w-prose text-sm text-cream-dim">
          Tu tesis es confidencial: solo se usa para tus ensayos, nunca para entrenar modelos, y la borras con un clic.
        </p>
      </Panel>
    ),
    code: `<Panel variant="raised" className="flex flex-col items-start gap-4 p-6 sm:p-8">
  <h2 className="text-title font-semibold text-cream-bright">Sube tu tesis</h2>
  <p className="max-w-prose text-base leading-relaxed text-cream">PDF (también escaneado), Word o una foto…</p>
  <Action tone="neutral"><Upload className="h-4 w-4" aria-hidden />Elegir archivo</Action>
  <p className="max-w-prose text-sm text-cream-dim">Tu tesis es confidencial: …</p>
</Panel>`,
  },
  {
    id: "thesis-reading",
    title: "Thesis: a wait, announced",
    kind: "in-context",
    description:
      "While the thesis is read. role=\"status\" makes the sentence a polite live region, so a screen reader hears the wait start; the product's copy of this panel has no role yet. The spinner stops under reduced motion and the sentence still says what is happening.",
    render: () => (
      <Panel variant="raised" role="status" className="flex items-center gap-3 p-6 sm:p-8">
        <Loader2 aria-hidden className="h-5 w-5 shrink-0 animate-spin text-accent-text" />
        <p className="text-base text-cream">Leyendo tu tesis… puede tardar hasta dos minutos.</p>
      </Panel>
    ),
    code: `<Panel variant="raised" role="status" className="flex items-center gap-3 p-6 sm:p-8">
  <Loader2 aria-hidden className="h-5 w-5 shrink-0 animate-spin text-accent-text" />
  <p className="text-base text-cream">Leyendo tu tesis… puede tardar hasta dos minutos.</p>
</Panel>`,
  },
  {
    id: "report-failed",
    title: "Report: a screen that failed",
    kind: "in-context",
    description:
      "When the feedback report cannot load, the whole screen is this glass panel: the error as an alert, what is safe, and the way back. Glass, so it reads as a notice and not as the report. The way back is an Action that navigates; the product wraps the button in a link, which nests two interactive elements.",
    render: () => (
      <Panel variant="glass" className="flex max-w-2xl flex-col gap-4 p-6 sm:p-8">
        <p role="alert" className="text-sm text-cream-bright">
          Algo salió mal. Inténtalo de nuevo.
        </p>
        <p className="text-xs text-cream-dim">
          Tu transcripción no se perdió — la evaluación se puede reintentar desde el historial cuando el servicio se
          recupere.
        </p>
        <Action tone="glass" className="self-start">
          Volver a las sesiones
        </Action>
      </Panel>
    ),
    code: `<Panel variant="glass" className="flex max-w-2xl flex-col gap-4 p-6 sm:p-8">
  <p role="alert" className="text-sm text-cream-bright">{error}</p>
  <p className="text-xs text-cream-dim">Tu transcripción no se perdió — …</p>
  <Action tone="glass" className="self-start" onClick={() => navigate("/app")}>Volver a las sesiones</Action>
</Panel>`,
  },
  {
    id: "pricing-tiers",
    title: "Pricing: two tiers side by side",
    kind: "in-context",
    description:
      "Two panels in a grid, h-full so they line up. The recommended one is raised and carries an accent ring — a selection mark, not a glow.",
    render: () => (
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel className="flex h-full flex-col gap-6 p-7 sm:p-9">
          <div>
            <h3 className="text-title font-semibold text-cream-bright">Gratis</h3>
            <p className="mt-1 text-xs text-cream-faint">Gratis siempre</p>
            <p className="mt-4 text-sm text-cream-dim">Todo para conseguir el trabajo. Cinco entrevistas por semana.</p>
          </div>
          <ul className="flex list-disc flex-col gap-2 ps-5 text-sm text-cream">
            <li>Entrevistas por rol, ronda y empresa</li>
            <li>Coaching en vivo e informe completo</li>
          </ul>
          <Action tone="glass" className="mt-auto w-full">
            Empezar a practicar
          </Action>
        </Panel>
        <Panel variant="raised" className="flex h-full flex-col gap-6 p-7 ring-2 ring-accent sm:p-9">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-title font-semibold text-cream-bright">Premium</h3>
              <span className="flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-text">
                <Sparkles aria-hidden className="h-3.5 w-3.5" />
                Recomendado
              </span>
            </div>
            <p className="mt-1 text-xs text-cream-faint">Se cobra cada mes</p>
          </div>
          <ul className="flex list-disc flex-col gap-2 ps-5 text-sm text-cream">
            <li>Entrevistas ilimitadas</li>
            <li>Historial y progreso completos</li>
            <li>Todo lo del plan gratis</li>
          </ul>
        </Panel>
      </div>
    ),
    code: `<div className="grid gap-5 lg:grid-cols-2">
  <Panel className="flex h-full flex-col gap-6 p-7 sm:p-9">…</Panel>
  <Panel variant="raised" className="flex h-full flex-col gap-6 p-7 ring-2 ring-accent sm:p-9">…</Panel>
</div>`,
  },
  {
    id: "hover-on-static",
    title: "A hover lift on a panel nothing happens on",
    kind: "misuse",
    description: "The card rises under the pointer, then does nothing when clicked.",
    why: "A lift on hover is a promise of a press. On a panel that is not a link or a button it breaks that promise, and a keyboard user never sees it at all. Keep the panel still, or make the whole card a link with its own focus ring.",
    render: () => (
      <Panel className="flex max-w-xs flex-col gap-3 p-6 transition-shadow duration-300 ease-press hover:shadow-lift">
        <p className="text-base font-semibold text-cream-bright">Stripe</p>
        <p className="text-xs font-semibold text-cream-faint">Oficio · obsesión por el usuario · comunicación escrita</p>
        <p className="text-sm leading-relaxed text-cream-dim">
          Aprieta en la claridad escrita. Cada tradeoff necesita un número.
        </p>
      </Panel>
    ),
    code: `{/* Don't */}
<Panel className="… transition-shadow hover:shadow-lift">…</Panel>`,
  },
  {
    id: "panel-in-panel",
    title: "A panel inside a panel",
    kind: "misuse",
    description: "Two radii, two edges, two fills a few pixels apart.",
    why: "The inner edge competes with the outer one and the eye reads three boxes. A group inside a panel is an inset well — rounded-2xl bg-surface-lift p-4 — which recedes instead of rising.",
    render: () => (
      <Panel variant="raised" className="flex flex-col gap-4 p-6">
        <p className="text-sm font-semibold text-cream-bright">Tu jurado real</p>
        <Panel className="p-4">
          <p className="text-sm text-cream-bright">Dra. Rojas · Estadística aplicada</p>
          <p className="text-xs text-cream-dim">Siempre pregunta por el tamaño de muestra</p>
        </Panel>
      </Panel>
    ),
    code: `{/* Don't */}
<Panel variant="raised" className="p-6">
  <Panel className="p-4">…</Panel>
</Panel>

{/* Do */}
<Panel variant="raised" className="p-6">
  <div className="rounded-2xl bg-surface-lift p-4">…</div>
</Panel>`,
  },
]);
