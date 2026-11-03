import { definePreviews } from "../../preview";
import { IconTile } from "./IconTile";

export const IconTilePreviews = definePreviews([
  {
    id: "a-row-of-tiles",
    title: "A row of tiles",
    kind: "default",
    description:
      "The trail-dashboard way of numbering things: the number is in the tile and the tile is in the accent, so a row of three reads as three steps before the reader has read a word.",
    render: () => (
      <div className="flex items-center gap-3 bg-surface-base py-12">
        <IconTile>01</IconTile>
        <IconTile>02</IconTile>
        <IconTile>03</IconTile>
      </div>
    ),
    code: `<div className="flex items-center gap-3">
  <IconTile>01</IconTile>
  <IconTile>02</IconTile>
  <IconTile>03</IconTile>
</div>`,
  },
  {
    id: "a-tile-before-the-words",
    title: "A tile before the words",
    kind: "in-context",
    description:
      "The tile marks the step and the words beside it tell it. The tile is hidden from assistive technology, so the words carry it on their own.",
    render: () => (
      <div className="flex flex-col gap-3 bg-surface-base py-12">
        <div className="flex items-center gap-3">
          <IconTile>01</IconTile>
          <span className="text-sm text-cream-bright">Sube tu tesis: PDF, Word o fotos.</span>
        </div>
        <div className="flex items-center gap-3">
          <IconTile>02</IconTile>
          <span className="text-sm text-cream-bright">Ensaya con el panel de 3 jurados.</span>
        </div>
      </div>
    ),
    code: `<div className="flex items-center gap-3">
  <IconTile>01</IconTile>
  <span>Sube tu tesis: PDF, Word o fotos.</span>
</div>`,
  },
  {
    id: "a-tile-alone",
    title: "A tile alone",
    kind: "misuse",
    description: "The tile with nothing beside it.",
    why: "The tile is hidden from assistive technology and it holds no words of its own, so on its own it is a shape that says nothing to anyone. It marks something that is written next to it.",
    render: () => (
      <div className="bg-surface-base py-12">
        <IconTile>01</IconTile>
      </div>
    ),
    code: `{/* Don't: the words belong beside the tile */}
<IconTile>01</IconTile>`,
  },
]);
