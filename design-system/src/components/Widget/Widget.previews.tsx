import { definePreviews } from "../../preview";
import { Widget } from "./Widget";
import { InsetPanel } from "../InsetPanel/InsetPanel";
import { IconTile } from "../IconTile/IconTile";

export const WidgetPreviews = definePreviews([
  {
    id: "a-widget",
    title: "A widget",
    kind: "default",
    description:
      "A cream card floating on the page: no shadow, a hairline at most, and its label above the content in the instrument voice.",
    render: () => (
      <Widget label="El producto">
        <p className="text-sm text-cream-dim">
          Hasta 300 páginas, escaneadas o no. Cada pregunta sale de una página que puedes abrir.
        </p>
      </Widget>
    ),
    code: `<Widget label="El producto">
  <p>Hasta 300 páginas, escaneadas o no…</p>
</Widget>`,
  },
  {
    id: "widgets-in-a-row",
    title: "Widgets in a row",
    kind: "in-context",
    description:
      "The public site's blocks side by side, each with its own label, each with a row of steps inside.",
    render: () => (
      <div className="grid gap-3 bg-surface-base py-12 md:grid-cols-2">
        <Widget label="03 · Método">
          <InsetPanel className="flex items-center gap-3">
            <IconTile>01</IconTile>
            <span className="text-sm text-cream-bright">Sube tu tesis</span>
          </InsetPanel>
        </Widget>
        <Widget label="::QUÉ RECIBES">
          <InsetPanel className="flex items-center gap-3">
            <IconTile>02</IconTile>
            <span className="text-sm text-cream-bright">Ensaya con el panel</span>
          </InsetPanel>
        </Widget>
      </div>
    ),
    code: `<div className="grid gap-3 md:grid-cols-2">
  <Widget label="03 · Método">…</Widget>
  <Widget label="::QUÉ RECIBES">…</Widget>
</div>`,
  },
  {
    id: "a-widget-inside-a-widget",
    title: "A widget inside a widget",
    kind: "misuse",
    description: "A card inside a card.",
    why: "The hairline doubles and the radius starts to fight itself: two radii at two distances from the edge is a shape nobody drew. A block inside a card belongs in an InsetPanel, which is a step of the surface rather than a second card.",
    render: () => (
      <Widget label="El producto">
        <Widget label="03 · Método">
          <p className="text-sm text-cream-dim">Sube tu tesis</p>
        </Widget>
      </Widget>
    ),
    code: `{/* Don't: use an InsetPanel for the block inside */}
<Widget label="El producto">
  <Widget label="03 · Método">…</Widget>
</Widget>`,
  },
]);
