import { Zap } from "lucide-react";
import { definePreviews } from "../../preview";
import { Badge } from "./Badge";

export const BadgePreviews = definePreviews([
  {
    id: "neutral",
    title: "Neutral",
    kind: "default",
    description: "A standing fact about the screen: here, that the call is a practice one.",
    render: () => <Badge>Práctica</Badge>,
    code: `<Badge>Práctica</Badge>`,
  },
  {
    id: "tones",
    title: "Tones",
    kind: "variant",
    description: "neutral states a fact; live adds a dot that breathes while something is happening right now.",
    render: () => (
      <div className="flex flex-wrap items-center gap-3">
        <Badge>Real</Badge>
        <Badge tone="live">Conectando</Badge>
      </div>
    ),
    code: `<Badge>Real</Badge>
<Badge tone="live">Conectando</Badge>`,
  },
  {
    id: "with-icon",
    title: "With a leading icon",
    kind: "variant",
    description: "A 12px icon before the words, hidden from screen readers. The text still names the state.",
    render: () => (
      <Badge>
        <Zap className="h-3 w-3" aria-hidden />
        Modo estrés
      </Badge>
    ),
    code: `<Badge>
  <Zap className="h-3 w-3" aria-hidden />
  Modo estrés
</Badge>`,
  },
  {
    id: "row-portuguese-phone",
    title: "A row of badges in Portuguese at phone width",
    kind: "edge",
    width: 320,
    description: "The caller's row wraps; each pill keeps its words on one line. The live one is a status region, so its changes are announced.",
    render: () => (
      <div lang="pt-BR" className="flex flex-wrap items-center gap-3">
        <Badge>Prática</Badge>
        <Badge>
          <Zap className="h-3 w-3" aria-hidden />
          Modo estresse
        </Badge>
        <Badge tone="live" role="status">
          Turno 3 de 8
        </Badge>
      </div>
    ),
    code: `<div lang="pt-BR" className="flex flex-wrap items-center gap-3">
  <Badge>Prática</Badge>
  <Badge>
    <Zap className="h-3 w-3" aria-hidden />
    Modo estresse
  </Badge>
  <Badge tone="live" role="status">Turno 3 de 8</Badge>
</div>`,
  },
  {
    id: "call-header",
    title: "The live call's header",
    kind: "in-context",
    description:
      "The interview room's header: the mode, the pressure setting and the turn counter. Only the counter is live, and it is the one that announces its changes.",
    render: () => (
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 bg-surface-deep p-4">
        <div className="min-w-0">
          <h2 className="line-clamp-2 text-xl font-bold leading-[1.1] tracking-[-0.028em] text-cream-bright">Rappi · Primera entrevista</h2>
          <p className="mt-1.5 text-sm text-cream-dim">Analista de datos</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Práctica</Badge>
          <Badge>
            <Zap className="h-3 w-3" aria-hidden />
            Modo estrés
          </Badge>
          <Badge tone="live" role="status">
            Turno 3 de 8
          </Badge>
        </div>
      </div>
    ),
    code: `<div className="flex items-center gap-3">
  <Badge>{mode === "real" ? "Real" : "Práctica"}</Badge>
  {pressure && (
    <Badge>
      <Zap className="h-3 w-3" aria-hidden />
      Modo estrés
    </Badge>
  )}
  <Badge tone={busy ? "live" : "neutral"} role="status">{status}</Badge>
</div>`,
  },
  {
    id: "everything-live",
    title: "Every badge live",
    kind: "misuse",
    description: "Three dots breathing at once, and none of them means anything more than the others.",
    why: "The dot means \"happening right now\". When standing facts like the mode pulse too, the one status that is actually in progress stops standing out, and the header moves for no reason. Keep live for the single status in progress.",
    render: () => (
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="live">Práctica</Badge>
        <Badge tone="live">Modo estrés</Badge>
        <Badge tone="live">Turno 3 de 8</Badge>
      </div>
    ),
    code: `{/* Don't */}
<Badge tone="live">Práctica</Badge>
<Badge tone="live">Modo estrés</Badge>
<Badge tone="live">Turno 3 de 8</Badge>`,
  },
  {
    id: "as-a-button",
    title: "A badge used as a button",
    kind: "misuse",
    description: "A pill with a click handler, standing in for a toggle.",
    why: "A Badge is a span: it cannot be reached with Tab, Enter and Space do nothing, and a screen reader announces it as plain text. A setting the user can change is a Segmented or a Checkbox; an action is an Action.",
    render: () => (
      <Badge className="cursor-pointer" onClick={() => undefined}>
        Modo estrés
      </Badge>
    ),
    code: `{/* Don't */}
<Badge onClick={togglePressure}>Modo estrés</Badge>`,
  },
]);
