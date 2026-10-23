import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { buildDeck, deckFileName } from "../src/lib/deck";
import type { SlideReview } from "../src/lib/api";

const review: SlideReview = {
  summary: "",
  total_seconds: 420,
  slides: [
    { n: 1, title: "Saludo", seconds: 60, verdict: "ok", note: "", points: [] },
    { n: 2, title: "Resultados", seconds: 300, verdict: "ok", note: "p. 55", points: ["Rho = -0,62", "120 docentes"] },
    { n: 3, title: "Cierre", seconds: 60, verdict: "ok", note: "", points: [] },
  ],
  inconsistencies: [],
  script: [
    { slide: 1, say: "Buenos días, señores del jurado." },
    { slide: 2, say: "Encontramos una relación inversa." },
    { slide: 3, say: "Quedo a su disposición." },
  ],
};

describe("buildDeck", () => {
  it("makes a cover plus one slide per block after the greeting, with the script in the notes", async () => {
    const pptx = await buildDeck({ title: "Estrés y desempeño", career: "Psicología", review });
    const zip = await JSZip.loadAsync((await pptx.write({ outputType: "nodebuffer" })) as Buffer);
    const slides = Object.keys(zip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
    expect(slides).toHaveLength(3);

    const cover = await zip.file("ppt/slides/slide1.xml")!.async("string");
    expect(cover).toContain("Estrés y desempeño");
    const results = await zip.file("ppt/slides/slide2.xml")!.async("string");
    expect(results).toContain("Rho = -0,62");
    expect(results).toContain("p. 55");

    const notes = await Promise.all(
      Object.keys(zip.files)
        .filter((name) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name))
        .map((name) => zip.file(name)!.async("string")),
    );
    expect(notes.join()).toContain("Buenos días, señores del jurado.");
    expect(notes.join()).toContain("Encontramos una relación inversa.");
  });
});

describe("deckFileName", () => {
  it("keeps accents and drops what a file system refuses", () => {
    expect(deckFileName('Tesis: "Estrés"/2026')).toBe("Tesis Estrés 2026.pptx");
    expect(deckFileName("  ")).toBe("Sustentación.pptx");
  });
});
