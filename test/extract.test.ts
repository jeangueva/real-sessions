import { describe, expect, it } from "vitest";
import { extractText, kindFor, normalize, ExtractionError } from "../src/extract.js";

/**
 * A one-page PDF with real text, assembled by hand.
 *
 * Built rather than committed as a binary so the fixture is readable and its
 * expected content is visible right here in the test.
 */
function makePdf(lines: string[]): Buffer {
  let content = "BT /F1 11 Tf 40 750 Td 14 TL\n";
  for (const line of lines) {
    content += `(${line.replace(/[()\\]/g, "")}) Tj T*\n`;
  }
  content += "ET";

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];

  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(out.length);
    out += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    out += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

describe("kindFor", () => {
  it("recognises the three formats people actually have", () => {
    expect(kindFor("cv.pdf", "application/pdf")).toBe("pdf");
    expect(
      kindFor(
        "cv.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ),
    ).toBe("docx");
    expect(kindFor("notes.md", "text/markdown")).toBe("text");
  });

  it("refuses formats it would have to guess at", () => {
    // Silently accepting a .doc and extracting nothing is worse than saying no.
    expect(kindFor("cv.doc", "application/msword")).toBeNull();
    expect(kindFor("cv.pages", "application/x-iwork-pages-sffpages")).toBeNull();
    expect(kindFor("portfolio.png", "image/png")).toBeNull();
  });

  it("trusts the extension when the browser sends no content type", () => {
    expect(kindFor("Resume.PDF", "")).toBe("pdf");
  });
});

describe("normalize", () => {
  it("rejoins a line wrapped mid-sentence", () => {
    // PDF extractors emit one newline per rendered line, so every wrap looks
    // like a paragraph break unless this puts them back together.
    expect(normalize("owned activation for the\nlending product")).toBe(
      "owned activation for the lending product",
    );
  });

  it("keeps a real break between entries", () => {
    expect(normalize("Nubank, 2023\nSenior Designer")).toBe(
      "Nubank, 2023\nSenior Designer",
    );
  });

  it("repairs ligatures that PDF fonts emit as single glyphs", () => {
    expect(normalize("deﬁned the ﬂow")).toBe("defined the flow");
  });

  it("drops private-use glyphs used for bullets", () => {
    expect(normalize(" shipped it")).toBe("shipped it");
  });

  it("collapses runs of blank lines", () => {
    expect(normalize("A\n\n\n\nB")).toBe("A\n\nB");
  });
});

describe("extractText", () => {
  it("refuses a file it read almost nothing from", async () => {
    // The scan case. A brief written from three characters produces an
    // interviewer asking about a job the candidate never had.
    await expect(extractText(Buffer.from("short"), "text")).rejects.toBeInstanceOf(
      ExtractionError,
    );
  });

  it("accepts plain text of a realistic length", async () => {
    const cv = "Senior Product Designer at Nubank. ".repeat(20);
    await expect(extractText(Buffer.from(cv), "text")).resolves.toContain("Nubank");
  });

  it("reads a real PDF and releases its worker", async () => {
    const pdf = makePdf([
      "Mariana Reyes - Senior Product Designer",
      "Nubank, 2023-2026. Owned activation for the lending product.",
      "Replaced manual document upload with an open banking connection.",
      "Approval time fell from three days to under one hour.",
      "Activation rose eleven points; fraud loss held at twelve basis points.",
      "Previously at Rappi, 2021-2023, on courier supply tooling.",
      "Skills: design systems, experimentation, SQL, Figma, prototyping.",
    ]);

    const text = await extractText(pdf, "pdf");
    expect(text).toContain("Nubank");
    expect(text).toContain("open banking");
    expect(text).toContain("basis points");
  });

  it("reports a PDF it cannot parse instead of returning empty text", async () => {
    await expect(
      extractText(Buffer.from("%PDF-1.4 this is not a pdf"), "pdf"),
    ).rejects.toBeInstanceOf(ExtractionError);
  });
});
