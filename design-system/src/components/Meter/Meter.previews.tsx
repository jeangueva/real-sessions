import { definePreviews } from "../../preview";
import { Meter } from "./Meter";

export const MeterPreviews = definePreviews([
  {
    id: "percentage",
    title: "A percentage",
    kind: "default",
    description:
      "The score after an interview: what is being measured on the left, the figure on the right, and the bar under them filling to it.",
    render: () => (
      <div className="max-w-sm">
        <Meter value={72} label="Claridad" />
      </div>
    ),
    code: `<Meter value={72} label="Claridad" />`,
  },
  {
    id: "empty",
    title: "A score of zero",
    kind: "state",
    state: "empty",
    description:
      "Nothing yet. The bar is empty but the figure is there: a zero reads as a score of zero, not as a missing measurement.",
    render: () => (
      <div className="max-w-sm">
        <Meter value={0} label="Claridad" />
      </div>
    ),
    code: `<Meter value={0} label="Claridad" />`,
  },
  {
    id: "a-count",
    title: "A count, without a percentage",
    kind: "variant",
    description:
      "Eight answers practised. The suffix is empty because the number is not a percentage, and the maximum is the real one.",
    render: () => (
      <div className="max-w-sm">
        <Meter value={3} max={8} suffix="" label="Respuestas practicadas" />
      </div>
    ),
    code: `<Meter value={3} max={8} suffix="" label="Respuestas practicadas" />`,
  },
  {
    id: "above-the-maximum",
    title: "A value above the maximum",
    kind: "edge",
    description:
      "A figure that overshoots the scale. The bar stops at the end and the number stays true: the person sees the real number, and the bar cannot claim more than the whole.",
    render: () => (
      <div className="max-w-sm">
        <Meter value={12} max={10} suffix=" de 10" label="Puntos" />
      </div>
    ),
    code: `<Meter value={12} max={10} suffix=" de 10" label="Puntos" />`,
  },
  {
    id: "the-wrong-maximum",
    title: "The wrong maximum",
    kind: "misuse",
    description:
      "A score out of 20 shown on a scale of 100. The figure says 12 and the bar is a fifth full.",
    why: "The bar and the number have to be the same claim. With max left at 100, a score of 12 out of 20 looks like a score of 12 out of 100 — the same number, a different story, and the person cannot tell which one they earned.",
    render: () => (
      <div className="max-w-sm">
        <Meter value={12} label="Puntos" />
      </div>
    ),
    code: `{/* Don't */}
<Meter value={12} label="Puntos" />

{/* Do */}
<Meter value={12} max={20} label="Puntos" />`,
  },
]);
