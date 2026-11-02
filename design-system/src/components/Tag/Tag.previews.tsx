import { definePreviews } from "../../preview";
import { Tag } from "./Tag";

export const TagPreviews = definePreviews([
  {
    id: "serious-risk",
    title: "A serious risk",
    kind: "default",
    description: "The diagnosis marks the risk a jury would see first. Step is orange: a verdict on the work, never red.",
    render: () => <Tag tone="attention">Grave</Tag>,
    code: `<Tag tone="attention">Grave</Tag>`,
  },
  {
    id: "attention",
    title: "Attention",
    kind: "state",
    state: "attention",
    description: "Deal with this first: a serious risk, or an objective that does not hold.",
    render: () => (
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="attention">Grave</Tag>
        <Tag tone="attention">Incoherente</Tag>
      </div>
    ),
    code: `<Tag tone="attention">Grave</Tag>
<Tag tone="attention">Incoherente</Tag>`,
  },
  {
    id: "caution",
    title: "Caution",
    kind: "state",
    state: "caution",
    description: "It will cost something, but it is not the worst.",
    render: () => (
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="caution">Te costará puntos</Tag>
        <Tag tone="caution">Débil</Tag>
      </div>
    ),
    code: `<Tag tone="caution">Te costará puntos</Tag>
<Tag tone="caution">Débil</Tag>`,
  },
  {
    id: "positive",
    title: "Positive",
    kind: "state",
    state: "positive",
    description: "It holds: the objective, the hypothesis, the result and the conclusion agree.",
    render: () => <Tag tone="positive">Coherente</Tag>,
    code: `<Tag tone="positive">Coherente</Tag>`,
  },
  {
    id: "neutral",
    title: "Neutral",
    kind: "state",
    state: "neutral",
    description: "A minor point about form: the quietest pill, and the default tone.",
    render: () => <Tag>De forma</Tag>,
    code: `<Tag>De forma</Tag>`,
  },
  {
    id: "severity-scale",
    title: "The severity scale",
    kind: "variant",
    description: "How the diagnosis maps a risk's severity to a tone: alta → attention, media → caution, baja → neutral.",
    render: () => (
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="attention">Grave</Tag>
        <Tag tone="caution">Te costará puntos</Tag>
        <Tag tone="neutral">De forma</Tag>
      </div>
    ),
    code: `const SEVERITY = {
  alta: { tone: "attention", label: "Grave" },
  media: { tone: "caution", label: "Te costará puntos" },
  baja: { tone: "neutral", label: "De forma" },
} as const;

<Tag tone={SEVERITY[risk.severity].tone}>{SEVERITY[risk.severity].label}</Tag>`,
  },
  {
    id: "coherence-scale",
    title: "The coherence check",
    kind: "variant",
    description: "How the consistency matrix maps each objective's status: coherente → positive, debil → caution, incoherente → attention.",
    render: () => (
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="positive">Coherente</Tag>
        <Tag tone="caution">Débil</Tag>
        <Tag tone="attention">Incoherente</Tag>
      </div>
    ),
    code: `const STATUS = {
  coherente: { tone: "positive", label: "Coherente" },
  debil: { tone: "caution", label: "Débil" },
  incoherente: { tone: "attention", label: "Incoherente" },
} as const;

<Tag tone={STATUS[row.status].tone}>{STATUS[row.status].label}</Tag>`,
  },
  {
    id: "portuguese-english-phone",
    title: "The longest translations at phone width",
    kind: "edge",
    width: 320,
    description: "Portuguese and English verdicts in a wrapping row: each pill keeps its words on one line.",
    render: () => (
      <div className="flex flex-col gap-3">
        <div lang="pt-BR" className="flex flex-wrap items-center gap-2">
          <Tag tone="attention">Grave</Tag>
          <Tag tone="caution">Vai custar nota</Tag>
          <Tag tone="neutral">De forma</Tag>
          <Tag tone="attention">Incoerente</Tag>
        </div>
        <div lang="en" className="flex flex-wrap items-center gap-2">
          <Tag tone="attention">Serious</Tag>
          <Tag tone="caution">Will cost marks</Tag>
          <Tag tone="positive">Consistent</Tag>
          <Tag tone="attention">Inconsistent</Tag>
        </div>
      </div>
    ),
    code: `<div lang="pt-BR" className="flex flex-wrap items-center gap-2">
  <Tag tone="caution">Vai custar nota</Tag>
</div>`,
  },
  {
    id: "beside-long-text",
    title: "Beside a long line at phone width",
    kind: "edge",
    width: 320,
    description: "With shrink-0 the tag keeps its size while the text beside it wraps, as in the diagnosis rows.",
    render: () => (
      <p className="flex items-start gap-2">
        <Tag tone="caution" className="mt-0.5 shrink-0">
          Te costará puntos
        </Tag>
        <span className="min-w-0 flex-1 text-sm text-cream-bright">Pregunta probable: “¿Con qué sustento afirma causalidad?”</span>
      </p>
    ),
    code: `<Tag tone="caution" className="mt-0.5 shrink-0">Te costará puntos</Tag>`,
  },
  {
    id: "risk-list",
    title: "The diagnosis's risks",
    kind: "in-context",
    description: "The risks a jury would see first, from the most serious to the least, each led by its verdict and followed by the likely question.",
    render: () => (
      <section aria-labelledby="tag-risks" className="flex flex-col gap-2">
        <p id="tag-risks" className="text-sm font-semibold text-cream-bright">
          Por aquí te van a atacar
        </p>
        <ol className="flex flex-col gap-2">
          {(
            [
              ["attention", "Grave", "¿Con qué sustento afirma causalidad?"],
              ["caution", "Te costará puntos", "¿Verificó la normalidad?"],
              ["neutral", "De forma", "¿Por qué APA 6?"],
            ] as const
          ).map(([tone, label, question]) => (
            <li key={label} className="flex items-start gap-2 rounded-2xl bg-surface-card p-3.5 shadow-card">
              <Tag tone={tone} className="mt-0.5 shrink-0">
                {label}
              </Tag>
              <span className="min-w-0 flex-1 text-sm text-cream-bright">
                <span className="font-semibold">Pregunta probable: </span>“{question}”
              </span>
            </li>
          ))}
        </ol>
      </section>
    ),
    code: `<ol className="flex flex-col gap-2">
  {risks.map((risk) => (
    <li className="flex items-start gap-2 rounded-2xl bg-surface-card p-3.5 shadow-card">
      <Tag tone={SEVERITY[risk.severity].tone} className="mt-0.5 shrink-0">
        {t(SEVERITY[risk.severity].key)}
      </Tag>
      <span className="min-w-0 flex-1 text-sm text-cream-bright">{risk.issue}</span>
    </li>
  ))}
</ol>`,
  },
  {
    id: "as-a-screen-status",
    title: "A tag used as a status of the screen",
    kind: "misuse",
    description: "The mode of a call drawn as a green verdict.",
    why: "A Tag judges a piece of the student's work, so colouring the mode of the call reads as a verdict on it — \"Práctica\" in green looks like praise. A status of the screen is a Badge, always neutral.",
    render: () => <Tag tone="positive">Práctica</Tag>,
    code: `{/* Don't */}
<Tag tone="positive">Práctica</Tag>
{/* Do */}
<Badge>Práctica</Badge>`,
  },
  {
    id: "tone-against-words",
    title: "A tone that contradicts the words",
    kind: "misuse",
    description: "\"Grave\" in the quiet neutral pill, \"De forma\" in attention.",
    why: "The colour helps the eye sort a list by the verdict; when it disagrees with the words, the reader trusts the colour and skips the serious risk. Take the tone from the same table as the words.",
    render: () => (
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="neutral">Grave</Tag>
        <Tag tone="attention">De forma</Tag>
      </div>
    ),
    code: `{/* Don't */}
<Tag tone="neutral">Grave</Tag>
<Tag tone="attention">De forma</Tag>`,
  },
]);
