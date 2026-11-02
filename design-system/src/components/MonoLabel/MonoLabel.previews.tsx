import { definePreviews } from "../../preview";
import { MonoLabel } from "./MonoLabel";
import { Panel } from "../Panel/Panel";

export const MonoLabelPreviews = definePreviews([
  {
    id: "on-a-panel",
    title: "On a panel",
    kind: "default",
    description:
      "The card's own name, in the instrument voice: mono, capitals, a tight \"::\" in front. The two colons are hidden from screen readers — punctuation is not a word.",
    render: () => (
      <Panel className="max-w-sm p-5">
        <MonoLabel>General</MonoLabel>
        <p className="mt-3 text-sm text-cream-dim">Cuenta y preferencias de práctica.</p>
      </Panel>
    ),
    code: `<Panel className="p-5">
  <MonoLabel>General</MonoLabel>
  <p className="mt-3 text-sm text-cream-dim">Cuenta y preferencias de práctica.</p>
</Panel>`,
  },
  {
    id: "a-row-of-labels",
    title: "A row of labels",
    kind: "variant",
    description:
      "Three blocks, each with its name. The labels are written in the case they should be read in; the component sets the capitals.",
    render: () => (
      <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
        {["General", "Qué funcionó", "Tu cuenta"].map((name) => (
          <Panel key={name} className="p-4">
            <MonoLabel>{name}</MonoLabel>
          </Panel>
        ))}
      </div>
    ),
    code: `{["General", "Qué funcionó", "Tu cuenta"].map((name) => (
  <Panel key={name} className="p-4">
    <MonoLabel>{name}</MonoLabel>
  </Panel>
))}`,
  },
  {
    id: "long-label-in-german",
    title: "A long label in German at 320px",
    kind: "edge",
    width: 320,
    description:
      "German runs about 30% longer than Spanish. The label wraps to a second line instead of being cut, and the block moves down with it.",
    render: () => (
      <div lang="de" className="max-w-[20rem]">
        <Panel className="p-4">
          <MonoLabel>Beobachtungen aus der letzten Übung</MonoLabel>
        </Panel>
      </div>
    ),
    code: `<Panel className="p-4">
  <MonoLabel>Beobachtungen aus der letzten Übung</MonoLabel>
</Panel>`,
  },
  {
    id: "as-the-only-name",
    title: "A label as the only name of a block",
    kind: "misuse",
    description:
      "A card whose only title is the mono label. It looks titled, and it is not: the label is a paragraph.",
    why: "A MonoLabel is a paragraph, so somebody moving by headings skips it and reaches the next heading, with no idea what the block was. A block that needs a title needs a heading under the label — and if the label is enough on its own, it is not a label but a heading that forgot to say so.",
    render: () => (
      <Panel className="max-w-sm p-5">
        <MonoLabel>Tu cuenta</MonoLabel>
      </Panel>
    ),
    code: `{/* Don't */}
<Panel className="p-5">
  <MonoLabel>Tu cuenta</MonoLabel>
</Panel>

{/* Do */}
<Panel className="p-5">
  <MonoLabel>General</MonoLabel>
  <h2 className="mt-2 text-title text-cream-bright">Tu cuenta</h2>
</Panel>`,
  },
]);
