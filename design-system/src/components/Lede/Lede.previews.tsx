import { definePreviews } from "../../preview";
import { Lede } from "./Lede";
import { SectionTitle } from "../SectionTitle/SectionTitle";

export const LedePreviews = definePreviews([
  {
    id: "a-lede",
    title: "A lede",
    kind: "default",
    description:
      "The sentence under a title: larger than the body's text and lighter than the title, so the eye reads the title, then this, and then the block.",
    render: () => (
      <div className="bg-surface-base py-12">
        <SectionTitle className="text-3xl">Menos que una hora de asesoría.</SectionTitle>
        <Lede>Pago único, sin suscripción. Empieza gratis.</Lede>
      </div>
    ),
    code: `<SectionTitle>Menos que una hora de asesoría.</SectionTitle>
<Lede>Pago único, sin suscripción. Empieza gratis.</Lede>`,
  },
  {
    id: "a-long-lede",
    title: "A long lede",
    kind: "edge",
    description:
      "A paragraph that has to wrap wraps, and it grows: the lede is never clamped, so the words under the title are all of them.",
    width: 390,
    render: () => (
      <div className="bg-surface-base py-12">
        <Lede>
          Cada grado tiene su jurado. El panel ajusta la profundidad, el tiempo de exposición y la exigencia de la
          nota, y cada repregunta sale de lo que acabas de responder.
        </Lede>
      </div>
    ),
    code: `<Lede>
  Cada grado tiene su jurado. El panel ajusta la profundidad…
</Lede>`,
  },
  {
    id: "a-lede-as-a-title",
    title: "A lede used as the title",
    kind: "misuse",
    description: "The title of the block, written as a lede.",
    why: "The lede is the sentence under the title, and it reads at body size. A title written as a lede is a title nobody can skim, and the block loses the two beats it was built on: the name, then the sentence.",
    render: () => (
      <div className="bg-surface-base py-12">
        <Lede>Un jurado que leyó tu tesis. Completa.</Lede>
      </div>
    ),
    code: `{/* Don't */}
<Lede>Un jurado que leyó tu tesis. Completa.</Lede>`,
  },
]);
