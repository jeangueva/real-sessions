import type { SlideReview } from "@/lib/api";

/**
 * A plain, editable deck built from the script written from the thesis.
 *
 * Structure and words, not design: the student moves it into their
 * university's template, so a white slide that pastes cleanly beats a styled
 * one that fights it. What to say on each slide goes in the speaker notes,
 * where PowerPoint, Google Slides and Keynote all show it while presenting.
 */
export interface DeckInput {
  title: string;
  career?: string | null;
  review: SlideReview;
}

const INK = "1F2330";
const DIM = "5B6070";
const ACCENT = "4F46B8";
const FONT = "Calibri";

/** Spaces and accents survive; what a file system refuses does not. */
export function deckFileName(title: string): string {
  const base = title.replace(/[\\/:*?"<>|\n\r]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return `${base || "Sustentación"}.pptx`;
}

export async function buildDeck(input: DeckInput) {
  // Loaded on the click: it is a large library almost no visit needs.
  const { default: PptxGenJS } = await import("pptxgenjs");
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = input.title;

  const cover = pptx.addSlide();
  cover.addShape("rect", { x: 0, y: 0, w: 0.25, h: 7.5, fill: { color: ACCENT } });
  cover.addText(input.title, { x: 0.9, y: 2.2, w: 11.5, h: 2, fontFace: FONT, fontSize: 36, bold: true, color: INK, valign: "top", fit: "shrink" });
  if (input.career) {
    cover.addText(input.career, { x: 0.9, y: 4.4, w: 11.5, h: 0.6, fontFace: FONT, fontSize: 18, color: DIM });
  }
  const opening = input.review.script.find((entry) => entry.slide === 1)?.say;
  if (opening) cover.addNotes(opening);

  for (const slide of input.review.slides) {
    const points = slide.points ?? [];
    // The greeting is the cover; a slide of its own would repeat it.
    if (slide.n === 1 && points.length === 0) continue;
    const page = pptx.addSlide();
    page.addShape("rect", { x: 0.9, y: 1.45, w: 1.2, h: 0.08, fill: { color: ACCENT } });
    page.addText(slide.title, { x: 0.9, y: 0.5, w: 11.5, h: 0.9, fontFace: FONT, fontSize: 30, bold: true, color: INK, fit: "shrink" });
    if (points.length > 0) {
      page.addText(
        points.map((text) => ({ text, options: { bullet: true, breakLine: true } })),
        { x: 0.9, y: 1.9, w: 11.5, h: 4.6, fontFace: FONT, fontSize: 24, color: INK, valign: "top", paraSpaceAfter: 14, fit: "shrink" },
      );
    }
    // Where the facts come from, for whoever checks them against the thesis.
    if (slide.note) {
      page.addText(slide.note, { x: 0.9, y: 6.8, w: 11.5, h: 0.4, fontFace: FONT, fontSize: 12, color: DIM });
    }
    const say = input.review.script.find((entry) => entry.slide === slide.n)?.say;
    if (say) page.addNotes(say);
  }

  return pptx;
}

export async function downloadDeck(input: DeckInput): Promise<void> {
  const pptx = await buildDeck(input);
  await pptx.writeFile({ fileName: deckFileName(input.title) });
}
