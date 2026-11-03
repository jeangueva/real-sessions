import { definePreviews } from "../../preview";
import { Chip } from "./Chip";

export const ChipPreviews = definePreviews([
  {
    id: "a-chip",
    title: "A chip",
    kind: "default",
    description:
      "A peach chip in mono caps: a fact, never a control. It has no focus, no hover and no press, so it never looks like something to tap.",
    render: () => (
      <div className="flex items-center gap-3 bg-surface-base py-12">
        <Chip>LATAM</Chip>
        <Chip>Recomendado</Chip>
      </div>
    ),
    code: `<Chip>LATAM</Chip>
<Chip>Recomendado</Chip>`,
  },
  {
    id: "chips-in-a-row",
    title: "Chips in a row",
    kind: "in-context",
    description:
      "What a plan includes, one line each, next to the words of the plan they belong to.",
    render: () => (
      <div className="flex flex-wrap gap-2 bg-surface-base py-12">
        <Chip>HIPÓTESIS · PRIORIZACIÓN · TRADE-OFFS</Chip>
        <Chip>Conectando</Chip>
        <Chip>Turno 3 de 8</Chip>
      </div>
    ),
    code: `<div className="flex flex-wrap gap-2">
  <Chip>HIPÓTESIS · PRIORIZACIÓN · TRADE-OFFS</Chip>
  <Chip>Conectando</Chip>
</div>`,
  },
  {
    id: "a-long-chip",
    title: "A long chip",
    kind: "edge",
    width: 390,
    description:
      "A chip with more words than a chip should hold wraps its words and grows: it never truncates and never overflows its row.",
    render: () => (
      <div className="bg-surface-base py-12">
        <Chip>CADA GRADO TIENE SU JURADO Y EL PANEL AJUSTA LA EXIGENCIA DE LA NOTA</Chip>
      </div>
    ),
    code: `<Chip>CADA GRADO TIENE SU JURADO…</Chip>`,
  },
  {
    id: "a-chip-that-looks-pressable",
    title: "A chip that looks pressable",
    kind: "misuse",
    description: "A chip with a border and a shadow, the way a button looks.",
    why: "A chip is a fact. The moment it grows an edge and a shadow the reader is invited to press it, and a fact that cannot be pressed is a broken promise made in pixels.",
    render: () => (
      <div className="bg-surface-base py-12">
        <span className="inline-flex items-center gap-2 rounded-[0.5625rem] bg-chip px-3 py-1.5 font-mono text-xs font-medium uppercase tracking-[0.06em] text-chip-ink shadow-card ring-1 ring-line-strong">
          Recomendado
        </span>
      </div>
    ),
    code: `{/* Don't: no edge and no shadow on a chip */}
<Chip className="shadow-card ring-1">Recomendado</Chip>`,
  },
]);
