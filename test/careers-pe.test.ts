import { describe, expect, it } from "vitest";
import {
  APPLY_THRESHOLD,
  CAREERS,
  FAMILIES,
  defenseCareer,
  disciplineBlock,
  matchCareer,
  normalizeCareerText,
  publicCareerCatalogue,
  resolveCareer,
  withFamily,
  type FamilyId,
} from "../src/careers-pe.js";
import { FORMATS } from "../src/defense-formats.js";
import { buildInterviewerPrompt } from "../src/prompts/interviewer.js";
import { ThesisAnalysisSchema } from "../src/thesis.js";

describe("the careers catalogue", () => {
  it("has unique ids, a known family for every career, and no phrase claimed by two careers", () => {
    const ids = CAREERS.map((career) => career.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const career of CAREERS) expect(FAMILIES[career.family]).toBeDefined();
    const owner = new Map<string, string>();
    for (const career of CAREERS) {
      for (const phrase of [career.name, ...career.synonyms].map(normalizeCareerText)) {
        const previous = owner.get(phrase);
        expect(previous === undefined || previous === career.id, `${phrase}: ${previous} and ${career.id}`).toBe(true);
        owner.set(phrase, career.id);
      }
    }
    expect(CAREERS.length).toBeGreaterThan(140);
  });

  it("gives every family a full team and at least one career", () => {
    for (const family of Object.values(FAMILIES)) {
      for (const seat of ["presidente", "metodologo", "especialista"] as const) {
        expect(family.team[seat].role.m.length).toBeGreaterThan(5);
        expect(family.team[seat].role.f.length).toBeGreaterThan(5);
        expect(family.team[seat].focus.length).toBeGreaterThan(60);
      }
      expect(family.team.themes.length).toBeGreaterThan(40);
      expect(family.team.vocabulary.length).toBeGreaterThan(40);
      expect(family.team.paradigms.length).toBeGreaterThan(40);
      expect(family.keywords.length).toBeGreaterThan(0);
      expect(CAREERS.some((career) => career.family === family.id), family.id).toBe(true);
    }
  });

  it("publishes names and roles, not the prompt notes", () => {
    const catalogue = publicCareerCatalogue();
    expect(catalogue.careers.length).toBe(CAREERS.length);
    expect(JSON.stringify(catalogue)).not.toContain("focus");
  });
});

describe("matchCareer", () => {
  const cases: [string, string | null, FamilyId][] = [
    ["Escuela Profesional de Ingeniería Civil", "ingenieria-civil", "ingenieria-civil"],
    ["FACULTAD DE INGENIERÍA - ESCUELA PROFESIONAL DE INGENIERÍA CIVIL", "ingenieria-civil", "ingenieria-civil"],
    ["E.P. de Ingeniería de Sistemas e Informática", "ingenieria-sistemas-informatica", "industrial-sistemas"],
    ["Escuela Académico Profesional de Ingeniería de Sistemas", "ingenieria-sistemas", "industrial-sistemas"],
    ["Carrera de Ingeniería de Software", "ingenieria-software", "industrial-sistemas"],
    ["Para optar el título profesional de Ingeniero Industrial", "ingenieria-industrial", "industrial-sistemas"],
    ["Facultad de Ciencias de la Salud. Escuela Profesional de Enfermería", "enfermeria", "salud"],
    ["FACULTAD DE MEDICINA ESCUELA PROFESIONAL DE ENFERMERÍA", "enfermeria", "salud"],
    ["Tesis para optar el título de Médico Cirujano", "medicina-humana", "salud"],
    ["Escuela Profesional de Medicina Humana", "medicina-humana", "salud"],
    ["Título profesional de Licenciada en Obstetricia", "obstetricia", "salud"],
    ["Escuela Profesional de Estomatología", "odontologia", "salud"],
    ["Para optar el título profesional de Cirujano Dentista", "odontologia", "salud"],
    ["Tecnología Médica en Terapia Física y Rehabilitación", "tm-terapia-fisica", "salud"],
    ["E.A.P. de Nutrición Humana", "nutricion", "salud"],
    ["Facultad de Farmacia y Bioquímica", "farmacia-bioquimica", "farmacia"],
    ["Para optar el título profesional de Químico Farmacéutico", "farmacia-bioquimica", "farmacia"],
    ["ESCUELA PROFESIONAL DE PSICOLOGÍA", "psicologia", "psicologia"],
    ["Escuela Profesional de Medicina Veterinaria", "medicina-veterinaria", "veterinaria"],
    ["Facultad de Medicina Veterinaria y Zootecnia", "medicina-veterinaria-zootecnia", "veterinaria"],
    ["Escuela Profesional de Derecho", "derecho", "derecho"],
    ["Facultad de Derecho y Ciencias Políticas – Escuela de Derecho", "derecho", "derecho"],
    ["Para optar el título profesional de Abogada", "derecho", "derecho"],
    ["Escuela Profesional de Educación Inicial", "educacion-inicial", "educacion"],
    ["Educación Secundaria con mención en Matemática e Informática", "educacion-secundaria", "educacion"],
    ["Educación, especialidad Matemática y Física", "educacion", "educacion"],
    ["Programa de Estudios de Educación Física", "educacion-fisica", "educacion"],
    ["Escuela Profesional de Arquitectura y Urbanismo", "arquitectura", "arquitectura"],
    ["Escuela Profesional de Ingeniería de Minas", "ingenieria-minas", "minas-geologia"],
    ["E.P. Ingeniería Metalúrgica", "ingenieria-metalurgica", "minas-geologia"],
    ["Facultad de Ingeniería de Petróleo, Gas Natural y Petroquímica", "ingenieria-petroleo", "minas-geologia"],
    ["Escuela Profesional de Agronomía", "agronomia", "agrarias-ambientales"],
    ["Para optar el título de Ingeniero Agrónomo", "agronomia", "agrarias-ambientales"],
    ["Escuela Profesional de Ingeniería Ambiental", "ingenieria-ambiental", "agrarias-ambientales"],
    ["Escuela Profesional de Ingeniería Forestal", "ingenieria-forestal", "agrarias-ambientales"],
    ["Escuela Profesional de Ingeniería Mecánica Eléctrica", "ingenieria-mecanica-electrica", "electrica-mecanica"],
    ["Ingeniería Electrónica y Telecomunicaciones", "ingenieria-telecomunicaciones", "electrica-mecanica"],
    ["Escuela Profesional de Ingeniería Mecatrónica", "ingenieria-mecatronica", "electrica-mecanica"],
    ["Escuela Profesional de Ingeniería en Industrias Alimentarias", "ingenieria-industrias-alimentarias", "quimica-procesos"],
    ["E.P. Ingeniería Agroindustrial", "ingenieria-agroindustrial", "quimica-procesos"],
    ["Escuela Profesional de Ingeniería Química", "ingenieria-quimica", "quimica-procesos"],
    ["Facultad de Ciencias Biológicas — E.P. de Biología", "biologia", "ciencias"],
    ["Escuela Profesional de Matemática", "matematica", "ciencias"],
    ["Escuela Profesional de Economía", "economia", "economia"],
    ["Escuela Profesional de Administración", "administracion", "administracion"],
    ["Administración de Negocios Internacionales", "negocios-internacionales", "administracion"],
    ["Escuela Profesional de Contabilidad y Finanzas", "contabilidad", "contabilidad"],
    ["Para optar el título profesional de Contador Público", "contabilidad", "contabilidad"],
    ["FACULTAD DE CIENCIAS CONTABLES", "contabilidad", "contabilidad"],
    ["Escuela Profesional de Ciencias de la Comunicación", "ciencias-comunicacion", "comunicacion"],
    ["Escuela Profesional de Trabajo Social", "trabajo-social", "ciencias-sociales"],
    ["Escuela Profesional de Sociología", "sociologia", "ciencias-sociales"],
    ["Escuela Profesional de Historia", "historia", "humanidades"],
    ["Escuela Profesional de Literatura", "literatura", "humanidades"],
    ["Escuela Profesional de Diseño Gráfico", "diseno-grafico", "arte-diseno"],
    ["Carrera de Arquitectura de Interiores", "diseno-interiores", "arte-diseno"],
    ["Escuela Profesional de Música", "musica", "arte-diseno"],
    ["Escuela Profesional de Turismo y Hotelería", "turismo", "turismo"],
    ["Administración en Turismo y Hotelería", "turismo", "turismo"],
    ["Escuela Profesional de Ciencias Militares", "ciencias-militares", "militar-policial"],
  ];

  it.each(cases)("%s", (text, careerId, family) => {
    const match = matchCareer(text);
    expect(match).not.toBeNull();
    expect(match!.family).toBe(family);
    if (careerId) expect(match!.careerId).toBe(careerId);
    expect(match!.confidence).toBeGreaterThanOrEqual(APPLY_THRESHOLD);
  });

  it("falls back to the family for a postgraduate program", () => {
    expect(matchCareer("Programa de Maestría en Gestión Pública")?.family).toBe("administracion");
    expect(matchCareer("Maestría en Docencia Universitaria")?.family).toBe("educacion");
    expect(matchCareer("Doctorado en Derecho")?.family).toBe("derecho");
    expect(matchCareer("Maestría en Ciencias con mención en Ingeniería Ambiental")?.family).toBe("agrarias-ambientales");
    expect(matchCareer("Maestría en Salud Pública")?.family).toBe("salud");
  });

  it("says nothing when nothing points anywhere", () => {
    expect(matchCareer("")).toBeNull();
    expect(matchCareer(null)).toBeNull();
    expect(matchCareer("Universidad Nacional Mayor de San Marcos")).toBeNull();
  });
});

describe("resolveCareer", () => {
  it("prefers the student's choice, then the cover, then the field, then the title", () => {
    const analysis = { career: "Escuela Profesional de Enfermería", field: "Derecho penal", title: "X" };
    expect(resolveCareer(analysis, "derecho")?.careerId).toBe("derecho");
    expect(resolveCareer(analysis, "economia")).toMatchObject({ family: "economia", source: "override" });
    expect(resolveCareer(analysis, "no-such-thing")).toMatchObject({ careerId: "enfermeria", source: "cover" });
    expect(resolveCareer({ career: null, field: "Derecho penal", title: "X" })).toMatchObject({ family: "derecho", source: "field" });
    expect(
      resolveCareer({
        career: null,
        field: "",
        title: "Resistencia a la compresión del concreto con adición de agregados reciclados para pavimento",
      }),
    ).toMatchObject({ family: "ingenieria-civil", source: "title" });
  });

  it("stays out of it when unsure", () => {
    expect(resolveCareer({ career: null, field: "", title: "Un estudio" })).toBeNull();
    expect(resolveCareer({})).toBeNull();
  });
});

describe("the panel by career", () => {
  const ctx = {
    candidateName: "Ana",
    targetRole: "Tesis",
    companyName: "U",
    companyCulture: "",
    industry: "",
    interviewStage: "sustentacion-pe",
  };
  const defense = { dossier: "Title: X", difficulty: "estandar" as const, university: "Universidad X", field: "F" };
  const full = (extra: object = {}) =>
    buildInterviewerPrompt(ctx, { stages: ["sustentacion-pe"], defense: { ...defense, ...extra }, minTurns: 9, maxTurns: 12 });

  it("seats the family's team: roles, focus, vocabulary and paradigms", () => {
    const career = defenseCareer(resolveCareer({ career: "Escuela Profesional de Derecho" }));
    const prompt = full({ career });
    expect(prompt).toContain("[[metodologo]] Dra. Vidal, Metodóloga en investigación jurídica");
    expect(prompt).toContain(FAMILIES.derecho.team.especialista.focus);
    expect(prompt).toContain("pleno casatorio");
    expect(prompt).toContain(disciplineBlock(career!));
    expect(prompt).toContain("never demand statistics");
    expect(prompt).not.toContain("{{");

    const medicine = full({ career: { id: "medicina-humana", name: "Medicina Humana", family: "salud" } });
    expect(medicine).toContain("epidemiology and biostatistics");
    expect(medicine).toContain("Especialista clínico");
  });

  it("keeps the generic panel, byte for byte, when the career is unknown", () => {
    expect(full({ career: null })).toBe(full());
    expect(full()).toContain("[[metodologo]] Dra. Vidal, Metodóloga. Asks about the research design");
    expect(withFamily(FORMATS.PE, null)).toBe(FORMATS.PE);
  });

  it("lets the real jury still take the seats", () => {
    const prompt = full({
      career: { id: "derecho", name: "Derecho", family: "derecho" },
      jury: [{ seat: "metodologo", name: "Dr. Soto", specialty: "Derecho procesal", notes: "" }],
    });
    expect(prompt).toContain("THE REAL JURY");
    expect(prompt).toContain("Dr. Soto");
  });

  it("keeps another country's institutional titles and language", () => {
    const brazil = withFamily(FORMATS.BR, "salud");
    expect(brazil.jurors.especialista.role).toBe("Avaliador externo");
    expect(brazil.jurors.metodologo.focus).toContain("epidemiology");
    expect(brazil.vocabulary).toBe(FORMATS.BR.vocabulary);
  });
});

describe("the analysis reads the career off the cover", () => {
  it("parses older analyses without it", () => {
    const parsed = ThesisAnalysisSchema.shape.career.parse(undefined);
    expect(parsed).toBeNull();
  });
});
