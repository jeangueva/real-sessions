/**
 * How a thesis is defended, country by country — as data, not code.
 *
 * The panel's prompt, the record's scale and the screen's names all read from
 * here, so a new country is an entry rather than a branch. Universities vary
 * inside a country; these are the common defaults, and every one of them is
 * a starting point to check against the official regulation before launching
 * there (marked VALIDAR where the brief said so).
 *
 * The three roles stay the same three tags everywhere — [[presidente]],
 * [[metodologo]], [[especialista]] — because the client maps tags to voices.
 * What changes is who they are called and how they speak.
 */

export type CountryCode = "PE" | "BR" | "CO" | "CL" | "AR" | "EC" | "BO" | "UY" | "PA" | "INT";

export interface Juror {
  name: string;
  /** Their role, in the local language, as it would appear on the record. */
  role: string;
  /** What they ask about, for the prompt (English). */
  focus: string;
}

export interface DefenseFormat {
  country: CountryCode;
  countryName: string;
  language: "es" | "pt" | "en";
  /** What the event is called there. */
  eventName: string;
  /** How the panel addresses the student. */
  address: string;
  jurors: { presidente: Juror; metodologo: Juror; especialista: Juror };
  /** Words a local jury uses, so the panel sounds like one. */
  vocabulary: string;
  scale: {
    min: number;
    max: number;
    pass: number;
    /** Whether grades carry a decimal (Chile's 5,8) or are whole numbers. */
    decimals: boolean;
  };
  /** The verdicts, in the local language: all pass, two pass, fewer. */
  verdicts: { unanimous: string; majority: string; failed: string };
}

const SPECIALIST_FOCUS =
  "the theoretical framework, the background studies, the discussion and what the thesis adds to the field";
const METHOD_FOCUS =
  "the research design, the sample, the instruments, validity and reliability, the statistical tests and whether the results support the conclusions";
const CHAIR_FOCUS = "form, coherence, contribution and the regulation; runs the session, keeps time and closes it";

export const FORMATS: Record<CountryCode, DefenseFormat> = {
  PE: {
    country: "PE",
    countryName: "Perú",
    language: "es",
    eventName: "sustentación de tesis",
    address: "bachiller",
    jurors: {
      presidente: { name: "Dr. Ramírez", role: "Presidente del jurado", focus: CHAIR_FOCUS },
      metodologo: { name: "Dra. Vidal", role: "Metodóloga", focus: METHOD_FOCUS },
      especialista: { name: "Dr. Paredes", role: "Especialista", focus: SPECIALIST_FOCUS },
    },
    vocabulary: "jurado, asesor, matriz de consistencia, antecedentes, variables, dimensiones, bachiller",
    // VALIDAR: 0–20, aprueba con 11; unanimidad o mayoría.
    scale: { min: 0, max: 20, pass: 11, decimals: false },
    verdicts: { unanimous: "Aprobado por unanimidad", majority: "Aprobado por mayoría", failed: "Desaprobado" },
  },
  BR: {
    country: "BR",
    countryName: "Brasil",
    language: "pt",
    eventName: "defesa de TCC, dissertação ou tese (banca)",
    address: "o(a) candidato(a), ou pelo nome",
    jurors: {
      presidente: { name: "Prof. Dr. Almeida", role: "Orientador e presidente da banca", focus: CHAIR_FOCUS },
      metodologo: { name: "Profa. Dra. Costa", role: "Avaliadora interna", focus: METHOD_FOCUS },
      especialista: { name: "Prof. Dr. Mendes", role: "Avaliador externo", focus: SPECIALIST_FOCUS },
    },
    vocabulary: "banca, orientador, arguição, referencial teórico, ABNT, metodologia, considerações finais",
    // VALIDAR: 0–10; aprovado ou reprovado na pós-graduação.
    scale: { min: 0, max: 10, pass: 7, decimals: true },
    verdicts: { unanimous: "Aprovado", majority: "Aprovado com ressalvas", failed: "Reprovado" },
  },
  CO: {
    country: "CO",
    countryName: "Colombia",
    language: "es",
    eventName: "sustentación del trabajo de grado",
    address: "estudiante, o por su nombre",
    jurors: {
      presidente: { name: "Dr. Restrepo", role: "Director del trabajo de grado", focus: CHAIR_FOCUS },
      metodologo: { name: "Dra. Cárdenas", role: "Jurado evaluador", focus: METHOD_FOCUS },
      especialista: { name: "Dr. Ospina", role: "Jurado evaluador", focus: SPECIALIST_FOCUS },
    },
    vocabulary: "jurado, director, trabajo de grado, estado del arte, marco teórico",
    // VALIDAR: 0–5, aprueba con 3,0; menciones meritoria y laureada.
    scale: { min: 0, max: 5, pass: 3, decimals: true },
    verdicts: { unanimous: "Aprobado", majority: "Aprobado", failed: "No aprobado" },
  },
  CL: {
    country: "CL",
    countryName: "Chile",
    language: "es",
    eventName: "examen de grado o defensa de tesis",
    address: "estudiante, o por su nombre",
    jurors: {
      presidente: { name: "Dr. Fuentes", role: "Profesor guía", focus: CHAIR_FOCUS },
      metodologo: { name: "Dra. Contreras", role: "Comisión evaluadora", focus: METHOD_FOCUS },
      especialista: { name: "Dr. Saavedra", role: "Comisión evaluadora", focus: SPECIALIST_FOCUS },
    },
    vocabulary: "comisión, profesor guía, memoria, examen de grado",
    // VALIDAR: 1,0–7,0, aprueba con 4,0.
    scale: { min: 1, max: 7, pass: 4, decimals: true },
    verdicts: { unanimous: "Aprobado", majority: "Aprobado", failed: "Reprobado" },
  },
  AR: {
    country: "AR",
    countryName: "Argentina",
    language: "es",
    eventName: "defensa de tesina, tesis o TFI",
    address: "estudiante, o por su nombre",
    jurors: {
      presidente: { name: "Dr. Benítez", role: "Presidente del tribunal", focus: CHAIR_FOCUS },
      metodologo: { name: "Dra. Giménez", role: "Miembro del tribunal", focus: METHOD_FOCUS },
      especialista: { name: "Dr. Ferreyra", role: "Miembro del tribunal", focus: SPECIALIST_FOCUS },
    },
    vocabulary: "tribunal, director, tesina, TFI",
    // VALIDAR: 1–10, la nota de aprobación varía por universidad.
    scale: { min: 1, max: 10, pass: 6, decimals: false },
    verdicts: { unanimous: "Aprobado", majority: "Aprobado", failed: "Desaprobado" },
  },
  EC: {
    country: "EC",
    countryName: "Ecuador",
    language: "es",
    eventName: "sustentación del trabajo de titulación",
    address: "estudiante, o por su nombre",
    jurors: {
      presidente: { name: "Dr. Andrade", role: "Presidente del tribunal", focus: CHAIR_FOCUS },
      metodologo: { name: "Dra. Cevallos", role: "Miembro del tribunal", focus: METHOD_FOCUS },
      especialista: { name: "Dr. Villacís", role: "Miembro del tribunal", focus: SPECIALIST_FOCUS },
    },
    vocabulary: "tribunal, tutor, trabajo de titulación",
    // VALIDAR: 0–10, aprueba con 7.
    scale: { min: 0, max: 10, pass: 7, decimals: true },
    verdicts: { unanimous: "Aprobado", majority: "Aprobado", failed: "Reprobado" },
  },
  BO: {
    country: "BO",
    countryName: "Bolivia",
    language: "es",
    eventName: "defensa de grado",
    address: "postulante, o por su nombre",
    jurors: {
      presidente: { name: "Dr. Mamani", role: "Presidente del tribunal", focus: CHAIR_FOCUS },
      metodologo: { name: "Dra. Quispe", role: "Miembro del tribunal", focus: METHOD_FOCUS },
      especialista: { name: "Dr. Rojas", role: "Miembro del tribunal", focus: SPECIALIST_FOCUS },
    },
    vocabulary: "tribunal, tutor, defensa pública, modalidad de graduación",
    // VALIDAR: 0–100, aprueba con 51.
    scale: { min: 0, max: 100, pass: 51, decimals: false },
    verdicts: { unanimous: "Aprobado", majority: "Aprobado", failed: "Reprobado" },
  },
  UY: {
    country: "UY",
    countryName: "Uruguay",
    language: "es",
    eventName: "defensa de tesis o trabajo final",
    address: "estudiante, o por su nombre",
    jurors: {
      presidente: { name: "Dr. Pereira", role: "Presidente del tribunal", focus: CHAIR_FOCUS },
      metodologo: { name: "Dra. Silveira", role: "Miembro del tribunal", focus: METHOD_FOCUS },
      especialista: { name: "Dr. Olivera", role: "Miembro del tribunal", focus: SPECIALIST_FOCUS },
    },
    vocabulary: "tribunal, tutor, monografía",
    // VALIDAR: 1–12 en varias universidades.
    scale: { min: 1, max: 12, pass: 6, decimals: false },
    verdicts: { unanimous: "Aprobado", majority: "Aprobado", failed: "No aprobado" },
  },
  PA: {
    country: "PA",
    countryName: "Panamá",
    language: "es",
    eventName: "sustentación del trabajo de graduación",
    address: "estudiante, o por su nombre",
    jurors: {
      presidente: { name: "Dr. Castillo", role: "Asesor y presidente del jurado", focus: CHAIR_FOCUS },
      metodologo: { name: "Dra. Batista", role: "Jurado", focus: METHOD_FOCUS },
      especialista: { name: "Dr. Herrera", role: "Jurado", focus: SPECIALIST_FOCUS },
    },
    vocabulary: "jurado, asesor, trabajo de graduación",
    // VALIDAR: 0–100 o letras, según la universidad.
    scale: { min: 0, max: 100, pass: 71, decimals: false },
    verdicts: { unanimous: "Aprobado", majority: "Aprobado", failed: "Reprobado" },
  },
  /**
   * Not a country: a defence in English, for international master's and
   * doctoral programmes, held to the viva's conventions rather than one
   * country's.
   */
  INT: {
    country: "INT",
    countryName: "International (English)",
    language: "en",
    eventName: "thesis defence (viva voce)",
    address: "the candidate, or by name",
    jurors: {
      presidente: { name: "Prof. Harris", role: "Chair of the examining committee", focus: CHAIR_FOCUS },
      metodologo: { name: "Dr. Patel", role: "Internal examiner", focus: METHOD_FOCUS },
      especialista: { name: "Dr. Moreno", role: "External examiner", focus: SPECIALIST_FOCUS },
    },
    vocabulary: "viva, examiners, contribution to knowledge, limitations, minor and major corrections",
    // VALIDAR: many programmes grade pass or fail with corrections; 0–100,
    // passing at 60, is the common numeric reading of it.
    scale: { min: 0, max: 100, pass: 60, decimals: false },
    verdicts: { unanimous: "Pass", majority: "Pass with corrections", failed: "Major revisions required" },
  },
};

export function findFormat(country: unknown, fallbackLanguage?: string): DefenseFormat {
  if (typeof country === "string" && country.toUpperCase() in FORMATS) {
    return FORMATS[country.toUpperCase() as CountryCode];
  }
  return fallbackLanguage === "pt" ? FORMATS.BR : FORMATS.PE;
}

/** The verdict that follows from three grades, in the format's own words. */
export function verdictFor(
  format: DefenseFormat,
  grades: readonly number[],
): { code: "aprobado-unanimidad" | "aprobado-mayoria" | "desaprobado"; label: string } {
  const passing = grades.filter((grade) => grade >= format.scale.pass).length;
  if (passing >= 3) return { code: "aprobado-unanimidad", label: format.verdicts.unanimous };
  if (passing === 2) return { code: "aprobado-mayoria", label: format.verdicts.majority };
  return { code: "desaprobado", label: format.verdicts.failed };
}

/** What the browser needs to show a format: everything but the prompt notes. */
export function publicFormats() {
  return Object.values(FORMATS).map((format) => ({
    country: format.country,
    countryName: format.countryName,
    language: format.language,
    jurors: {
      presidente: { name: format.jurors.presidente.name, role: format.jurors.presidente.role },
      metodologo: { name: format.jurors.metodologo.name, role: format.jurors.metodologo.role },
      especialista: { name: format.jurors.especialista.name, role: format.jurors.especialista.role },
    },
    scale: format.scale,
  }));
}
