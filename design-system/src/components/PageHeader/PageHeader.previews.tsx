import { Zap } from "lucide-react";
import { definePreviews } from "../../preview";
import { Action } from "../Action/Action";
import { Badge } from "../Badge/Badge";
import { PageHeader } from "./PageHeader";

/**
 * A student's thesis title, as the product receives it from the analysis.
 * Sample data, not product copy: theses in Latin America commonly run 15–35
 * words, and this is the length that made the meta a wall of text.
 */
const THESIS_TITLE =
  "Influencia de la gestión del talento humano en el desempeño laboral de los colaboradores de una municipalidad distrital de Lima Metropolitana, 2024";

export const PageHeaderPreviews = definePreviews([
  {
    id: "title-and-meta",
    title: "Title and meta",
    kind: "default",
    description: "Mi tesis before anything is uploaded: the screen's name as the h1, one line under it that says what the screen is for. No rule under the header.",
    render: () => (
      <div className="bg-surface-deep">
        <PageHeader title="Mi tesis" meta="Súbela una vez. El jurado la lee antes de cada ensayo." />
      </div>
    ),
    code: `<PageHeader title="Mi tesis" meta="Súbela una vez. El jurado la lee antes de cada ensayo." />`,
  },
  {
    id: "truncated-meta",
    title: "A thesis title as meta, on one line",
    kind: "state",
    state: "truncated",
    description:
      "Mi tesis, on the Ensayar tab, once a thesis is uploaded: the meta is the thesis title. It stops at the end of the first line with an ellipsis; a screen reader reads all of it and a mouse shows it in the tooltip. The full title lives in the body (the warm-up and the Ficha show it).",
    render: () => (
      <div className="bg-surface-deep">
        <PageHeader title="Ensayar" meta={THESIS_TITLE} />
      </div>
    ),
    code: `<PageHeader title="Ensayar" meta={thesis.analysis.title} />`,
  },
  {
    id: "with-action",
    title: "With an action",
    kind: "variant",
    description:
      "Tu camino: the meta is one fact, the action sits at the end of the row and bottom-aligns with the meta. Glass, because it is not the screen's way forward.",
    render: () => (
      <div className="bg-surface-deep">
        <PageHeader title="Tu camino" meta="12 completadas" actions={<Action tone="glass">Comparte tu progreso</Action>} />
      </div>
    ),
    code: `<PageHeader
  title="Tu camino"
  meta={t("history.completed", { count: sessions.length })}
  actions={<Action tone="glass" onClick={() => navigate("/app/share")}>Comparte tu progreso</Action>}
/>`,
  },
  {
    id: "reading-width",
    title: "Reading width",
    kind: "variant",
    description: "Above a PageBody with width=\"reading\", the header takes the same 48rem centred column, so the title starts where the content starts.",
    render: () => (
      <div className="bg-surface-deep">
        <PageHeader width="reading" title="Programa de afiliados" meta="Recomienda Mockio a tus tesistas: ves su avance y ganas el 30% de lo que compren." />
      </div>
    ),
    code: `<PageHeader width="reading" title="Programa de afiliados" meta="Recomienda Mockio a tus tesistas: …" />
<PageBody width="reading" className="flex flex-col gap-4">…</PageBody>`,
  },
  {
    id: "portuguese-phone",
    title: "Portuguese at 320px",
    kind: "edge",
    width: 320,
    description:
      "The Portuguese meta is longer than the Spanish and the column is 288px: the title wraps if it must, the meta keeps to one line and the header does not grow. The action wraps under the title.",
    render: () => (
      <div className="bg-surface-deep">
        <PageHeader
          title="Aquecimento do dia D"
          meta="10 minutos antes de entrar. Respire, aqueça a voz e repasse suas três respostas mais difíceis."
          actions={<Action withArrow>Começar</Action>}
        />
      </div>
    ),
    code: `<PageHeader
  title="Aquecimento do dia D"
  meta="10 minutos antes de entrar. Respire, aqueça a voz e repasse suas três respostas mais difíceis."
  actions={<Action withArrow>Começar</Action>}
/>`,
  },
  {
    id: "live-call",
    title: "Live interview: compact, with Badges",
    kind: "in-context",
    width: 390,
    description:
      "The call screen on a phone. compact keeps the title at 20px and two lines so the video gets the height; the Badges in actions state the mode and the turn, and wrap under the title.",
    render: () => (
      <div className="bg-surface-deep">
        <PageHeader
          compact
          title="Universidad Nacional Mayor de San Marcos · Sustentación de tesis"
          meta="Título profesional / licenciatura"
          actions={
            <div className="flex items-center gap-3">
              <Badge>Práctica</Badge>
              <Badge>
                <Zap className="h-3 w-3" aria-hidden />
                Modo estrés
              </Badge>
              <Badge tone="live">Turno 3 de 7</Badge>
            </div>
          }
        />
      </div>
    ),
    code: `<PageHeader
  compact
  title={heading}
  meta={running?.targetRole ?? role}
  actions={
    <div className="flex items-center gap-3">
      <Badge>Práctica</Badge>
      {pressure && <Badge><Zap className="h-3 w-3" aria-hidden />Modo estrés</Badge>}
      <Badge tone={busy ? "live" : "neutral"}>{status}</Badge>
    </div>
  }
/>`,
  },
  {
    id: "report",
    title: "Report: the way forward in the header",
    kind: "in-context",
    description:
      "After an interview the title says what they did, and the one solid Action is the screen's way forward: going again straight away is what turns a bad answer into a practised one.",
    render: () => (
      <div className="bg-surface-deep">
        <PageHeader
          title="Hablaste 12m 4s en inglés"
          meta="Behavioral · Senior Product Designer · Stripe"
          actions={<Action>Otra vez, sin miedo</Action>}
        />
      </div>
    ),
    code: `<PageHeader
  title={t("feedback.spoke", { time: formatMinutes(metrics.speakingMs) })}
  meta={meta}
  actions={<Action onClick={() => navigate("/app/practice")}>Otra vez, sin miedo</Action>}
/>`,
  },
  {
    id: "instructions-in-meta",
    title: "Instructions in the meta",
    kind: "misuse",
    width: 320,
    description: "The warm-up's three steps written as meta. On a phone the person reads \"10 minutos antes de entrar. Respira…\" and nothing else.",
    why: "Meta is clamped to one line, and on touch the rest cannot be revealed: the tooltip needs a pointer. Anything the person needs in order to act goes in the body — the warm-up lists its steps in a Panel — and the meta keeps to what fits in about 35 characters.",
    render: () => (
      <div className="bg-surface-deep">
        <PageHeader
          title="Calentamiento del Día D"
          meta="10 minutos antes de entrar. Respira, calienta la voz y repasa tus tres respuestas más difíciles."
        />
      </div>
    ),
    code: `{/* Don't */}
<PageHeader
  title="Calentamiento del Día D"
  meta="10 minutos antes de entrar. Respira, calienta la voz y repasa tus tres respuestas más difíciles."
/>

{/* Do */}
<PageHeader title="Calentamiento del Día D" meta="10 minutos antes de entrar." />
<PageBody width="reading">
  <Panel variant="raised" className="p-6 sm:p-8">
    <ol>…Respira · Calienta la voz · Tus tres preguntas…</ol>
  </Panel>
</PageBody>`,
  },
]);
