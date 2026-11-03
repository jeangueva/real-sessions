import { definePreviews } from "../../preview";
import { ContentColumn } from "./ContentColumn";
import { SectionTitle } from "../SectionTitle/SectionTitle";
import { Lede } from "../Lede/Lede";
import { Widget } from "../Widget/Widget";

export const ContentColumnPreviews = definePreviews([
  {
    id: "a-band-in-the-column",
    title: "A band in the column",
    kind: "default",
    description:
      "The public site: one column, the same width on every page, so a card that moves from one page to another lands in the same place.",
    render: () => (
      <ContentColumn className="bg-surface-base py-16">
        <Widget label="El producto">
          <SectionTitle>Un jurado que leyó tu tesis. Completa.</SectionTitle>
          <Lede>
            Hasta 300 páginas, escaneadas o no. Cada pregunta sale de una página que puedes abrir.
          </Lede>
        </Widget>
      </ContentColumn>
    ),
    code: `<ContentColumn>
  <Section>…</Section>
</ContentColumn>`,
  },
  {
    id: "a-row-inside",
    title: "A row inside the column",
    kind: "in-context",
    description:
      "The column holds the layout of the page: a grid of blocks, a row of cards, a flex row. It reaches the column's own width and never more.",
    render: () => (
      <ContentColumn className="grid gap-3 bg-surface-base py-16 md:grid-cols-3">
        <Widget label="::01">
          <SectionTitle className="text-3xl">Sube tu tesis</SectionTitle>
        </Widget>
        <Widget label="::02">
          <SectionTitle className="text-3xl">Ensaya</SectionTitle>
        </Widget>
        <Widget label="::03">
          <SectionTitle className="text-3xl">Lee el acta</SectionTitle>
        </Widget>
      </ContentColumn>
    ),
    code: `<ContentColumn className="grid gap-3 md:grid-cols-3">
  <Widget label="::01">…</Widget>
  <Widget label="::02">…</Widget>
</ContentColumn>`,
  },
  {
    id: "two-columns",
    title: "Two columns in a row",
    kind: "misuse",
    description: "A second column beside the column.",
    why: "Two columns of 1200px side by side are two pages. The column is the width of the reading line; a layout that needs two of them is a grid, and a grid is a decision somebody has to make, not a side effect of two wrappers.",
    render: () => (
      <div className="flex gap-4 bg-surface-base py-16">
        <ContentColumn className="border border-line">
          <SectionTitle className="text-3xl">Una</SectionTitle>
        </ContentColumn>
        <ContentColumn className="border border-line">
          <SectionTitle className="text-3xl">Otra</SectionTitle>
        </ContentColumn>
      </div>
    ),
    code: `{/* Don't */}
<div className="flex gap-4">
  <ContentColumn>…</ContentColumn>
  <ContentColumn>…</ContentColumn>
</div>`,
  },
]);
