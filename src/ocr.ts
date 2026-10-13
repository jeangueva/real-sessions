/**
 * Reading a thesis that is a scan — or a photo of a page.
 *
 * Plenty of theses only exist as the PDF the library scanned, and a student
 * with the printed copy has a phone. Text extraction finds nothing in either,
 * so each page is rendered to an image and a vision model transcribes it.
 *
 * Batched: a few pages per call, several calls at once. One page per call is
 * slow; a whole thesis per call loses pages when the reply runs long.
 */
import { resolveProvider } from "./providers/index.js";
import type { ModelProvider } from "./providers/index.js";
import { ExtractionError } from "./extract.js";

/** A cheap model that reads images well; overridable per deployment. */
export const OCR_MODEL = process.env.REALSESSIONS_OCR_MODEL ?? "google/gemini-3.5-flash-lite";
/** A scan this long is read up to here: a defence rarely turns on page 200. */
export const MAX_OCR_PAGES = 150;
const BATCH = 5;
const PARALLEL = 4;
/** Wide enough to read body text; narrow enough to keep each image small. */
const PAGE_WIDTH = 1100;

const OCR_PROMPT = (count: number) =>
  `Transcribe the text of these ${count} scanned thesis pages exactly, in their original language. Keep headings, numbers, tables (as plain rows) and figure captions; skip page decoration. Do not summarise, translate or correct anything.
Before each page write a line "=== PAGE n ===" with n from 1 to ${count}, in the order the images were given. If a page has no readable text, write the marker and leave it empty.`;

/** Splits a reply into per-page text by its markers; missing pages are empty. */
export function splitPages(reply: string, count: number): string[] {
  const pages = Array.from({ length: count }, () => "");
  const parts = reply.split(/^=== PAGE (\d+) ===\s*$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const n = Number(parts[i]);
    if (n >= 1 && n <= count) pages[n - 1] = (parts[i + 1] ?? "").trim();
  }
  return pages;
}

async function transcribe(images: string[], provider: ModelProvider): Promise<string[]> {
  const response = await provider.chat({
    model: OCR_MODEL,
    system: "You transcribe scanned documents faithfully.",
    messages: [{ role: "user", text: OCR_PROMPT(images.length), images }],
    maxTokens: 8_000,
  });
  return splitPages(response.text, images.length);
}

/** Reads every page of a scanned PDF as images. */
export async function ocrPdf(buffer: Buffer, options: { provider?: ModelProvider } = {}): Promise<string[]> {
  const provider = options.provider ?? resolveProvider(OCR_MODEL);
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const info = await parser.getInfo();
    const total = Math.min(info.total, MAX_OCR_PAGES);
    const batches: number[][] = [];
    for (let first = 1; first <= total; first += BATCH) {
      batches.push(Array.from({ length: Math.min(BATCH, total - first + 1) }, (_, i) => first + i));
    }
    const out: string[] = new Array(total).fill("");
    // A few batches at a time: rendering and reading overlap, and the
    // provider is not asked for a hundred images in one burst.
    for (let i = 0; i < batches.length; i += PARALLEL) {
      await Promise.all(
        batches.slice(i, i + PARALLEL).map(async (pages) => {
          const shots = await parser.getScreenshot({ partial: pages, desiredWidth: PAGE_WIDTH, imageDataUrl: true, imageBuffer: false });
          const images = shots.pages.sort((a, b) => a.pageNumber - b.pageNumber).map((page) => page.dataUrl);
          const text = await transcribe(images, provider);
          pages.forEach((page, index) => {
            out[page - 1] = text[index] ?? "";
          });
        }),
      );
    }
    return out;
  } catch (error) {
    if (error instanceof ExtractionError) throw error;
    throw new ExtractionError("No pudimos leer ese PDF escaneado. Prueba con un PDF exportado desde Word.");
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

/** Reads one photographed page. */
export async function ocrImage(buffer: Buffer, mime: string, options: { provider?: ModelProvider } = {}): Promise<string> {
  const provider = options.provider ?? resolveProvider(OCR_MODEL);
  const [text] = await transcribe([`data:${mime};base64,${buffer.toString("base64")}`], provider);
  return text ?? "";
}
