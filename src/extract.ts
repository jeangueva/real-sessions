/**
 * Turning an uploaded CV or portfolio into text the interviewer can use.
 *
 * Three formats, because those are what people actually have: a PDF export, a
 * Word document, or plain text pasted in. Anything else is refused with a
 * message naming what is accepted, rather than accepted and silently ignored.
 *
 * Extraction is best-effort by nature - a CV laid out in three columns comes
 * out interleaved, and a PDF that is a scan comes out empty. Both are detected
 * and reported rather than passed on: a brief written from garbled text
 * produces an interviewer confidently asking about a job the candidate never
 * had, which is worse than no CV at all.
 */
import mammoth from "mammoth";

/** Anything larger is not a CV. Also the cap on what is buffered per request. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Below this, extraction produced nothing usable - a scan, or an empty file. */
const MIN_USEFUL_CHARS = 200;

export class ExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractionError";
  }
}

export type UploadKind = "pdf" | "docx" | "text";

/** Maps a filename and declared content type onto a handler. */
export function kindFor(filename: string, contentType: string): UploadKind | null {
  const name = filename.toLowerCase();
  if (name.endsWith(".pdf") || contentType === "application/pdf") return "pdf";
  if (
    name.endsWith(".docx") ||
    contentType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }
  if (name.endsWith(".txt") || name.endsWith(".md") || contentType.startsWith("text/")) {
    return "text";
  }
  // .doc, Pages, and Google Docs exports are deliberately not guessed at.
  return null;
}

export async function extractText(buffer: Buffer, kind: UploadKind): Promise<string> {
  const raw = await extractRaw(buffer, kind);
  const text = normalize(raw);

  if (text.length < MIN_USEFUL_CHARS) {
    throw new ExtractionError(
      "We could not read enough text from that file. If it is a scan or an " +
        "image-only PDF, paste the text instead.",
    );
  }
  return text;
}

async function extractRaw(buffer: Buffer, kind: UploadKind): Promise<string> {
  if (kind === "text") return buffer.toString("utf8");

  if (kind === "docx") {
    try {
      const { value } = await mammoth.extractRawText({ buffer });
      return value;
    } catch (error) {
      throw new ExtractionError(
        `That .docx could not be read: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  // Imported lazily. pdf-parse pulls in the whole pdf.js runtime, which costs
  // real time at boot for a code path most requests never take.
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const { text } = await parser.getText();
    return text;
  } catch (error) {
    throw new ExtractionError(
      `That PDF could not be read: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  } finally {
    // Releases the worker. Without this the process keeps a handle per upload
    // and eventually stops accepting them.
    await parser.destroy().catch(() => undefined);
  }
}

/**
 * Collapses the whitespace damage that PDF extraction leaves behind.
 *
 * A PDF has no paragraphs - only glyphs at coordinates - so extractors emit a
 * newline per rendered line. Left alone, every CV bullet becomes its own
 * paragraph and the model reads a list of fragments.
 */
export function normalize(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    // Ligatures and the private-use glyphs some PDF fonts emit for bullets.
    .replace(/\uFB01/g, "fi")
    .replace(/\uFB02/g, "fl")
    .replace(/[\uE000-\uF8FF]/g, "")
    // A line break between two lowercase letters is a wrap, not a break.
    .replace(/([a-z,;])\n([a-z])/g, "$1 $2")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .trim();
}
