/**
 * A thesis, read page by page, and the diagnosis a jury would arrive with.
 *
 * Everything the defence simulator does hangs off this: the jurors ask about
 * what is on a given page, and a question that cannot say where it came from
 * is the one thing a general chatbot already does. So the text is kept per
 * page, the analysis cites pages, and the jurors are handed both.
 *
 * One thesis per person. People defend one thesis at a time, and "which of
 * my theses?" is a question nobody preparing for a defence has ever asked.
 *
 * The file is confidential and unpublished. It is never used for anything
 * but this person's practice, and deleting it deletes every page.
 */
import { z } from "zod";
import mammoth from "mammoth";
import type { DbPool } from "./db/index.js";
import { resolveProvider } from "./providers/index.js";
import type { ModelProvider } from "./providers/index.js";
import { ExtractionError, normalize, type UploadKind } from "./extract.js";
import { THESIS_ANALYSIS_TEMPLATE } from "./prompts/thesis.js";

/** Theses are long and often full of figures; a CV-sized cap refuses most. */
export const MAX_THESIS_BYTES = 30 * 1024 * 1024;
/** The longest thesis read. Past this it is a book, and the rest is annexes. */
export const MAX_PAGES = 300;
/** A Word file has no pages; it is cut into chunks of about one printed page. */
const CHARS_PER_PSEUDO_PAGE = 2_800;
/** Below this the file was a scan: there is nothing to question anyone about. */
const MIN_USEFUL_CHARS = 3_000;
/**
 * What the analysis model is shown. About 100k tokens — a 150-page thesis
 * whole, and a 300-page one with every page trimmed rather than the back half
 * dropped, because conclusions are where juries attack.
 */
const MAX_ANALYSIS_CHARS = 400_000;

/** Long-context and careful: this runs once per upload, not per turn. */
export const THESIS_MODEL =
  process.env.REALSESSIONS_THESIS_MODEL ?? "anthropic/claude-sonnet-5";
const THESIS_FALLBACKS = (process.env.REALSESSIONS_THESIS_FALLBACKS ?? "google/gemini-3.5-flash-lite")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

/* ------------------------------------------------------------------------- */
/* Reading the file                                                          */
/* ------------------------------------------------------------------------- */

export interface ThesisPages {
  pages: string[];
  /** True for Word files, whose page numbers are an estimate. */
  approximate: boolean;
}

export async function extractPages(buffer: Buffer, kind: UploadKind): Promise<ThesisPages> {
  let pages: string[];
  let approximate = false;

  if (kind === "pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      pages = result.pages
        .sort((a, b) => a.num - b.num)
        .map((page) => normalize(page.text));
    } catch (error) {
      throw new ExtractionError(
        `No pudimos leer ese PDF: ${error instanceof Error ? error.message : "error desconocido"}`,
      );
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  } else {
    let text: string;
    if (kind === "docx") {
      try {
        text = (await mammoth.extractRawText({ buffer })).value;
      } catch (error) {
        throw new ExtractionError(
          `No pudimos leer ese .docx: ${error instanceof Error ? error.message : "error desconocido"}`,
        );
      }
    } else {
      text = buffer.toString("utf8");
    }
    pages = paginate(normalize(text));
    approximate = true;
  }

  pages = pages.slice(0, MAX_PAGES);
  const total = pages.reduce((sum, page) => sum + page.length, 0);
  if (total < MIN_USEFUL_CHARS) {
    throw new ExtractionError(
      "Casi no encontramos texto en ese archivo. Si es un PDF escaneado, " +
        "expórtalo desde Word o Google Docs y vuelve a subirlo.",
    );
  }
  return { pages, approximate };
}

/** Cuts running text into page-sized pieces, at paragraph breaks where it can. */
export function paginate(text: string): string[] {
  const pages: string[] = [];
  let current = "";
  for (const paragraph of text.split("\n")) {
    if (current.length + paragraph.length > CHARS_PER_PSEUDO_PAGE && current !== "") {
      pages.push(current.trim());
      current = "";
    }
    current += paragraph + "\n";
  }
  if (current.trim() !== "") pages.push(current.trim());
  return pages;
}

/**
 * The thesis as the model reads it: every page labelled with its number.
 *
 * Over budget, each page is trimmed to the same share rather than the end
 * being cut — the results and conclusions are at the back, and they are what
 * a jury reads most closely.
 */
export function labelledText(pages: readonly string[], budget = MAX_ANALYSIS_CHARS): string {
  const total = pages.reduce((sum, page) => sum + page.length, 0);
  const share = total > budget ? Math.floor(budget / pages.length) : Infinity;
  return pages
    .map((page, index) => `[p. ${index + 1}]\n${page.length > share ? page.slice(0, share) + " […]" : page}`)
    .join("\n\n");
}

/* ------------------------------------------------------------------------- */
/* The diagnosis                                                             */
/* ------------------------------------------------------------------------- */

const Cited = z.object({
  text: z.string(),
  page: z.number().int().nullable(),
});

export const ThesisAnalysisSchema = z.object({
  title: z.string(),
  degree: z.enum(["pregrado", "maestria", "doctorado", "no-claro"]),
  field: z.string(),
  language: z.enum(["es", "pt", "en"]),
  summary: z.string(),
  ficha: z.object({
    problem: Cited,
    general_objective: Cited,
    specific_objectives: z.array(Cited),
    hypotheses: z.array(Cited),
    variables: z.array(Cited),
    design: Cited,
    population_sample: Cited,
    instruments: Cited,
    main_results: z.array(Cited),
    conclusions: z.array(Cited),
  }),
  consistency: z.array(
    z.object({
      objective: z.string(),
      hypothesis: z.string().nullable(),
      result: z.string().nullable(),
      conclusion: z.string().nullable(),
      status: z.enum(["coherente", "debil", "incoherente"]),
      note: z.string(),
    }),
  ),
  risks: z.array(
    z.object({
      area: z.enum([
        "problema",
        "objetivos",
        "hipotesis",
        "marco-teorico",
        "metodologia",
        "muestra",
        "instrumentos",
        "estadistica",
        "resultados",
        "conclusiones",
        "forma",
      ]),
      severity: z.enum(["alta", "media", "baja"]),
      issue: z.string(),
      page: z.number().int().nullable(),
      likely_question: z.string(),
    }),
  ),
  chapters: z.array(z.object({ name: z.string(), page: z.number().int().nullable() })),
});

export type ThesisAnalysis = z.infer<typeof ThesisAnalysisSchema>;

export class ThesisAnalysisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ThesisAnalysisError";
  }
}

export async function analyzeThesis(
  thesis: ThesisPages,
  options: { provider?: ModelProvider; model?: string } = {},
): Promise<ThesisAnalysis> {
  const model = options.model ?? THESIS_MODEL;
  const provider = options.provider ?? resolveProvider(model);
  const note = thesis.approximate
    ? "\n\n(Este documento venía de Word: los números de página son aproximados.)"
    : "";
  const response = await provider.json({
    model,
    system: THESIS_ANALYSIS_TEMPLATE,
    prompt: labelledText(thesis.pages) + note,
    maxTokens: 6_000,
    schema: ThesisAnalysisSchema,
    ...(THESIS_FALLBACKS.length > 0 ? { fallbacks: THESIS_FALLBACKS } : {}),
  });
  if (response.refused || !response.value) {
    throw new ThesisAnalysisError(
      "No pudimos analizar la tesis. Inténtalo de nuevo en un momento.",
    );
  }
  return clampPages(response.value, thesis.pages.length);
}

/** A page the thesis does not have is a citation nobody can check: dropped. */
function clampPages(analysis: ThesisAnalysis, pageCount: number): ThesisAnalysis {
  const fix = (page: number | null) => (page !== null && page >= 1 && page <= pageCount ? page : null);
  const cite = (entry: { text: string; page: number | null }) => ({ ...entry, page: fix(entry.page) });
  const f = analysis.ficha;
  return {
    ...analysis,
    ficha: {
      problem: cite(f.problem),
      general_objective: cite(f.general_objective),
      specific_objectives: f.specific_objectives.map(cite),
      hypotheses: f.hypotheses.map(cite),
      variables: f.variables.map(cite),
      design: cite(f.design),
      population_sample: cite(f.population_sample),
      instruments: cite(f.instruments),
      main_results: f.main_results.map(cite),
      conclusions: f.conclusions.map(cite),
    },
    risks: analysis.risks.map((risk) => ({ ...risk, page: fix(risk.page) })),
    chapters: analysis.chapters.map((chapter) => ({ ...chapter, page: fix(chapter.page) })),
  };
}

/* ------------------------------------------------------------------------- */
/* Storage                                                                   */
/* ------------------------------------------------------------------------- */

export interface StoredThesis {
  fileName: string;
  pageCount: number;
  approximate: boolean;
  analysis: ThesisAnalysis;
  uploadedAt: string;
}

export interface ThesisStore {
  /** The thesis without its pages: what every screen needs. */
  get(ownerId: string): Promise<StoredThesis | null>;
  /** The pages, for the jurors. */
  pages(ownerId: string): Promise<string[] | null>;
  put(ownerId: string, fileName: string, thesis: ThesisPages, analysis: ThesisAnalysis): Promise<void>;
  /** Removes the file's text and its analysis, all at once. */
  delete(ownerId: string): Promise<void>;
  transfer(fromOwnerId: string, toOwnerId: string): Promise<void>;
}

class PostgresThesisStore implements ThesisStore {
  constructor(private readonly pool: DbPool) {}

  async get(ownerId: string): Promise<StoredThesis | null> {
    const { rows } = await this.pool.query(
      `SELECT file_name, page_count, approximate, analysis, uploaded_at FROM theses WHERE owner_id = $1`,
      [ownerId],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      fileName: row.file_name as string,
      pageCount: Number(row.page_count),
      approximate: Boolean(row.approximate),
      analysis: row.analysis as ThesisAnalysis,
      uploadedAt: new Date(row.uploaded_at).toISOString(),
    };
  }

  async pages(ownerId: string): Promise<string[] | null> {
    const { rows } = await this.pool.query(`SELECT pages FROM theses WHERE owner_id = $1`, [ownerId]);
    return (rows[0]?.pages as string[] | undefined) ?? null;
  }

  async put(ownerId: string, fileName: string, thesis: ThesisPages, analysis: ThesisAnalysis) {
    await this.pool.query(
      `INSERT INTO theses (owner_id, file_name, page_count, approximate, pages, analysis, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (owner_id) DO UPDATE SET file_name = EXCLUDED.file_name,
         page_count = EXCLUDED.page_count, approximate = EXCLUDED.approximate,
         pages = EXCLUDED.pages, analysis = EXCLUDED.analysis, uploaded_at = now()`,
      [ownerId, fileName, thesis.pages.length, thesis.approximate, JSON.stringify(thesis.pages), JSON.stringify(analysis)],
    );
  }

  async delete(ownerId: string) {
    await this.pool.query(`DELETE FROM theses WHERE owner_id = $1`, [ownerId]);
  }

  async transfer(fromOwnerId: string, toOwnerId: string) {
    // The account keeps its own thesis if it already has one; the guest's goes.
    await this.pool.query(
      `UPDATE theses SET owner_id = $2 WHERE owner_id = $1
         AND NOT EXISTS (SELECT 1 FROM theses WHERE owner_id = $2)`,
      [fromOwnerId, toOwnerId],
    );
    await this.pool.query(`DELETE FROM theses WHERE owner_id = $1`, [fromOwnerId]);
  }
}

class MemoryThesisStore implements ThesisStore {
  private readonly rows = new Map<string, StoredThesis & { pages: string[] }>();

  async get(ownerId: string) {
    const row = this.rows.get(ownerId);
    if (!row) return null;
    const { pages: _pages, ...rest } = row;
    return rest;
  }

  async pages(ownerId: string) {
    return this.rows.get(ownerId)?.pages ?? null;
  }

  async put(ownerId: string, fileName: string, thesis: ThesisPages, analysis: ThesisAnalysis) {
    this.rows.set(ownerId, {
      fileName,
      pageCount: thesis.pages.length,
      approximate: thesis.approximate,
      analysis,
      pages: thesis.pages,
      uploadedAt: new Date().toISOString(),
    });
  }

  async delete(ownerId: string) {
    this.rows.delete(ownerId);
  }

  async transfer(fromOwnerId: string, toOwnerId: string) {
    const row = this.rows.get(fromOwnerId);
    if (row && !this.rows.has(toOwnerId)) this.rows.set(toOwnerId, row);
    this.rows.delete(fromOwnerId);
  }
}

export function createThesisStore(pool: DbPool | null): ThesisStore {
  return pool ? new PostgresThesisStore(pool) : new MemoryThesisStore();
}
