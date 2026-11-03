import { definePreviews } from "../../preview";
import { SectionTitle } from "./SectionTitle";
import { Lede } from "../Lede/Lede";
import { Widget } from "../Widget/Widget";

export const SectionTitlePreviews = definePreviews([
  {
    id: "a-title",
    title: "A title",
    kind: "default",
    description:
      "Big, light and tight, the trail-dashboard way: the size follows the viewport, so it is 32px on a phone and 56px on a wide desktop.",
    render: () => (
      <div className="bg-surface-base py-12">
        <SectionTitle>De tu PDF a tu acta en una tarde.</SectionTitle>
      </div>
    ),
    code: `<SectionTitle>De tu PDF a tu acta en una tarde.</SectionTitle>`,
  },
  {
    id: "a-title-and-its-lede",
    title: "A title and its lede",
    kind: "in-context",
    description:
      "The title of a block, with the sentence under it that says what the block gives.",
    render: () => (
      <div className="bg-surface-base py-12">
        <Widget label="El producto">
          <SectionTitle>Un jurado que leyó tu tesis. Completa.</SectionTitle>
          <Lede>
            Hasta 300 páginas, escaneadas o no. Cada pregunta sale de una página que puedes abrir.
          </Lede>
        </Widget>
      </div>
    ),
    code: `<Widget label="El producto">
  <SectionTitle>Un jurado que leyó tu tesis. Completa.</SectionTitle>
  <Lede>Hasta 300 páginas, escaneadas o no…</Lede>
</Widget>`,
  },
  {
    id: "a-long-title",
    title: "A long title",
    kind: "edge",
    description:
      "A title that has to wrap wraps: the size never shrinks, so a long title takes two lines rather than becoming a smaller title.",
    width: 390,
    render: () => (
      <div className="bg-surface-base py-12">
        <SectionTitle>Menos que una hora de asesoría, con el panel completo de tres jurados.</SectionTitle>
      </div>
    ),
    code: `<SectionTitle>Menos que una hora de asesoría, con el panel completo de tres jurados.</SectionTitle>`,
  },
  {
    id: "a-title-as-the-page-title",
    title: "A title as the page's own title",
    kind: "misuse",
    description: "The title of the page itself, as a SectionTitle.",
    why: "The page has one h1 and it belongs to the page, not to a block. Two h1s flatten the document: a screen reader that navigates by heading finds two page titles and cannot tell which one the page is about.",
    render: () => (
      <div className="bg-surface-base py-12">
        <SectionTitle>Mockio</SectionTitle>
      </div>
    ),
    code: `{/* Don't: the page's own h1 belongs to the page */}
<SectionTitle>Mockio</SectionTitle>`,
  },
]);
