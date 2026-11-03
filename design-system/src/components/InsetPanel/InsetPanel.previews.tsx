import { definePreviews } from "../../preview";
import { InsetPanel } from "./InsetPanel";
import { Widget } from "../Widget/Widget";
import { IconTile } from "../IconTile/IconTile";

export const InsetPanelPreviews = definePreviews([
  {
    id: "a-row-inside-a-widget",
    title: "A row inside a widget",
    kind: "default",
    description:
      "A step of the widget's own surface, so a row inside a card reads as belonging to it rather than floating next to it.",
    render: () => (
      <Widget label="::CASOS">
        <InsetPanel className="flex items-center gap-3">
          <IconTile>01</IconTile>
          <span className="text-sm text-cream-bright">Recuperación tras una interrupción de red</span>
        </InsetPanel>
      </Widget>
    ),
    code: `<Widget label="::CASOS">
  <InsetPanel className="flex items-center gap-3">
    <IconTile>01</IconTile>
    <span>Recuperación tras una interrupción de red</span>
  </InsetPanel>
</Widget>`,
  },
  {
    id: "a-list-inside-a-widget",
    title: "A list inside a widget",
    kind: "in-context",
    description:
      "The case the product shows in a training screen: the steps of a conversation, each in its own well.",
    render: () => (
      <Widget label="::ENTREVISTA">
        <div className="flex flex-col gap-2">
          <InsetPanel className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-cream-bright">Actividad automatizada inesperada</span>
            <span className="text-xs text-cream-dim">Priorización</span>
          </InsetPanel>
          <InsetPanel className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-cream-bright">Escasez de dos equipos</span>
            <span className="text-xs text-cream-dim">Trade-offs</span>
          </InsetPanel>
        </div>
      </Widget>
    ),
    code: `<Widget label="::ENTREVISTA">
  <InsetPanel>…</InsetPanel>
</Widget>`,
  },
  {
    id: "an-inset-on-its-own",
    title: "An inset on its own",
    kind: "misuse",
    description: "The inset without the widget around it.",
    why: "The inset is a step of a card's surface. On its own it is a box with no reason to exist, and it reads as a card that lost its label and its hairline.",
    render: () => (
      <div className="bg-surface-base py-12">
        <InsetPanel>
          <span className="text-sm text-cream-bright">Sube tu tesis</span>
        </InsetPanel>
      </div>
    ),
    code: `{/* Don't: the inset belongs inside a widget */}
<InsetPanel>…</InsetPanel>`,
  },
]);
