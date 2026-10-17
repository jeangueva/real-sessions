/**
 * The careers taught at Peruvian universities, and the jury each one meets.
 *
 * A medical thesis is defended before an epidemiologist and a clinician; a
 * law thesis before jurists who never ask for a p-value. So the panel's three
 * seats — the same three tags everywhere, because the client maps tags to
 * voices — take their role and their focus from the career's family.
 *
 * The catalogue follows the program names of the MINEDU/INEI "Clasificador
 * Nacional de Programas de Educación Superior Universitaria" and the names
 * licensed programs carry in SUNEDU, with the variants universities actually
 * print on a cover. Postgraduate programs are not listed one by one: they
 * fall back to a family through keywords ("Maestría en Gestión Pública" →
 * administración).
 *
 * Nothing here needs the student: the career is read off the cover by the
 * thesis analysis, matched below, and can be overridden by a single choice.
 * An unknown career keeps the generic panel exactly as it was.
 *
 * Focus and paradigms are prompt text, in English with the Spanish terms a
 * jury uses — like the country formats. Peruvian norms are named with "or
 * the local equivalent" so the same team works on another country's format.
 */
import type { DefenseFormat, Juror } from "./defense-formats.js";

export type FamilyId =
  | "salud"
  | "farmacia"
  | "psicologia"
  | "veterinaria"
  | "derecho"
  | "educacion"
  | "ingenieria-civil"
  | "arquitectura"
  | "industrial-sistemas"
  | "minas-geologia"
  | "agrarias-ambientales"
  | "electrica-mecanica"
  | "quimica-procesos"
  | "ciencias"
  | "economia"
  | "administracion"
  | "contabilidad"
  | "comunicacion"
  | "ciencias-sociales"
  | "humanidades"
  | "arte-diseno"
  | "turismo"
  | "militar-policial";

type Seat = "presidente" | "metodologo" | "especialista";

export interface SeatProfile {
  /** The role on the record, in Spanish: masculine and feminine. */
  role: { m: string; f: string };
  /** What this juror presses on in the discipline (English, for the prompt). */
  focus: string;
}

export interface JuryTeam {
  presidente: SeatProfile;
  metodologo: SeatProfile;
  especialista: SeatProfile;
  /** The ground a jury in this field usually covers (English). */
  themes: string;
  /** Words a jury in this field uses (Spanish). */
  vocabulary: string;
  /** The research paradigms usual in the field (English). */
  paradigms: string;
}

export interface CareerFamily {
  id: FamilyId;
  /** The family's name, in Spanish, for the screen. */
  name: string;
  team: JuryTeam;
  /**
   * Word stems that point at the family when no career name matches, as in a
   * postgraduate program or a faculty name. Normalised: no accents, lower case.
   */
  keywords: readonly string[];
  /** Topic words in a title that suggest the family, when nothing else does. */
  hints: readonly string[];
}

export interface Career {
  id: string;
  /** The canonical program name. */
  name: string;
  /** Other names the same program goes by, including the professional title. */
  synonyms: readonly string[];
  family: FamilyId;
}

/* ------------------------------------------------------------------------- */
/* The jury teams                                                            */
/* ------------------------------------------------------------------------- */

const CHAIR_ROLE = { m: "Presidente del jurado", f: "Presidenta del jurado" };

/** The chair runs the session everywhere; what they weigh changes by field. */
function chair(weighs: string): SeatProfile {
  return {
    role: CHAIR_ROLE,
    focus: `form, coherence and the university's regulation; ${weighs}; runs the session, keeps time and closes it`,
  };
}

const NO_FORCED_STATS =
  "never demands statistics or hypotheses from a design that does not call for them";

export const FAMILIES: Record<FamilyId, CareerFamily> = {
  salud: {
    id: "salud",
    name: "Ciencias de la salud",
    team: {
      presidente: chair(
        "the ethical approval (comité de ética, consentimiento informado) and whether the findings matter for patients and the health service",
      ),
      metodologo: {
        role: { m: "Metodólogo en investigación en salud", f: "Metodóloga en investigación en salud" },
        focus:
          "epidemiology and biostatistics: the study type (descriptivo, transversal, casos y controles, cohorte, cuasiexperimental, ensayo clínico), the sample size calculation and sampling, inclusion and exclusion criteria, bias and confounding, the validation of the instruments, the measures of association (OR, RR, chi-cuadrado, regresión logística) with confidence intervals, and research ethics: comité de ética approval, consentimiento informado, confidentiality of the historias clínicas",
      },
      especialista: {
        role: { m: "Especialista clínico", f: "Especialista clínica" },
        focus:
          "the clinical or care area of the thesis: the pathophysiology or care model behind it, the current clinical guidelines (guías de práctica clínica, normas técnicas del MINSA or the local health ministry), how the results compare with national and international studies, and what changes in practice — for the patient, the nursing care process (proceso de atención de enfermería), the obstetric, dental, rehabilitation or nutritional practice — because of them",
      },
      themes:
        "the clinical relevance of the problem, why that population and health facility, sample size and representativeness, bias and confounders, ethical approval and informed consent, how a result changes clinical or nursing practice, comparison with other studies",
      vocabulary:
        "historia clínica, consentimiento informado, comité de ética, criterios de inclusión y exclusión, prevalencia, factor de riesgo, odds ratio, intervalo de confianza, establecimiento de salud, MINSA, guía de práctica clínica",
      paradigms:
        "Health research is mostly quantitative and observational (descriptive, cross-sectional, analytical case-control or cohort studies), with some quasi-experimental studies and clinical trials; nursing and obstetrics also accept qualitative studies (phenomenology, grounded theory) on care experiences.",
    },
    keywords: ["medic", "salud", "clinic", "enfermer", "odontolog", "estomatolog", "obstetr", "nutricion", "tecnologia medica", "rehabilitacion", "cirug", "epidemiolog"],
    hints: ["pacientes", "paciente", "hospital", "gestantes", "puerperas", "diabetes", "hipertension", "anemia", "covid", "lactancia", "prenatal", "caries", "periodontal", "neonatos", "adultos mayores", "cancer", "tuberculosis", "obesidad", "desnutricion", "cuidado de enfermeria"],
  },
  farmacia: {
    id: "farmacia",
    name: "Farmacia y bioquímica",
    team: {
      presidente: chair("whether the result could reach a medicine, a product or a public-health decision"),
      metodologo: {
        role: { m: "Metodólogo en investigación experimental", f: "Metodóloga en investigación experimental" },
        focus:
          "the experimental design: controls, replicates, randomisation, the validation of the analytical methods (linealidad, precisión, exactitud, límites de detección y cuantificación), the statistics for experimental data (ANOVA, post hoc tests, IC50, DL50), the reproducibility of the procedure and the ethics of animal models (bioterio, the 3R)",
      },
      especialista: {
        role: { m: "Especialista en ciencias farmacéuticas", f: "Especialista en ciencias farmacéuticas" },
        focus:
          "the pharmacological, phytochemical, bromatological or toxicological basis: the active compound and its mechanism of action, the extraction and identification techniques (marcha fitoquímica, HPLC, espectrofotometría), pharmacopoeia standards, the regulation of medicines (DIGEMID, buenas prácticas de manufactura, or the local equivalent) and the pharmaceutical care angle (atención farmacéutica, farmacovigilancia)",
      },
      themes:
        "why that plant, compound or drug, the extraction and the dose, positive and negative controls, method validation, the animal model and its ethics, statistical significance against pharmacological relevance, regulatory and pharmaceutical-care implications",
      vocabulary:
        "extracto, principio activo, marcha fitoquímica, actividad antioxidante, actividad antimicrobiana, grupo control, dosis, DL50, farmacopea, DIGEMID, atención farmacéutica, buenas prácticas de manufactura",
      paradigms:
        "Mostly experimental (in vitro, and in vivo with animal models) and analytical laboratory work, plus quantitative observational studies on dispensing, pharmaceutical care and drug use.",
    },
    keywords: ["farmac", "bioquimic", "toxicolog", "bromatolog"],
    hints: ["extracto", "actividad antioxidante", "actividad antimicrobiana", "fitoquimic", "medicamentos", "automedicacion", "dispensacion", "aceite esencial"],
  },
  psicologia: {
    id: "psicologia",
    name: "Psicología",
    team: {
      presidente: chair("the ethics of working with participants and whether the findings can guide an intervention"),
      metodologo: {
        role: { m: "Metodólogo en psicometría", f: "Metodóloga en psicometría" },
        focus:
          "psychometrics and design: the instruments and their evidence of validity (contenido, constructo, análisis factorial confirmatorio) and reliability (alfa de Cronbach, omega), their adaptation and norms (baremos) for this population, the correlational, comparative or explanatory design, sampling, the statistics (normality, Spearman or Pearson, regression, structural equations) and consent (consentimiento, and asentimiento informado for minors)",
      },
      especialista: {
        role: { m: "Especialista en psicología", f: "Especialista en psicología" },
        focus:
          "the psychological theory behind the constructs — which model or author defines each variable and its dimensions — the clinical, educational, organisational or social area of the thesis, how the results compare with prior studies, and the implications for intervention or prevention programmes",
      },
      themes:
        "why that instrument and whether it was validated for this population, construct definitions and dimensions, correlation is not causation, sample and generalisation, ethics with vulnerable participants, practical implications for intervention",
      vocabulary:
        "constructo, dimensiones, instrumento, baremos, validez, confiabilidad, alfa de Cronbach, análisis factorial, correlación, muestra, consentimiento informado, asentimiento informado",
      paradigms:
        "Mostly quantitative (correlational, comparative, explanatory and psychometric or instrumental studies), with qualitative studies (case studies, phenomenology) accepted in clinical and social psychology.",
    },
    keywords: ["psicolog", "salud mental"],
    hints: ["ansiedad", "depresion", "autoestima", "resiliencia", "inteligencia emocional", "bienestar psicologico", "personalidad", "estres", "dependencia emocional", "agresividad", "habilidades sociales", "funcionamiento familiar", "procrastinacion"],
  },
  veterinaria: {
    id: "veterinaria",
    name: "Veterinaria y zootecnia",
    team: {
      presidente: chair("animal welfare and the economic and public-health consequences for producers"),
      metodologo: {
        role: { m: "Metodólogo en investigación pecuaria", f: "Metodóloga en investigación pecuaria" },
        focus:
          "the experimental or observational design in animals: experimental units, treatments and controls, randomised designs (DCA, DBCA), sample size in herds and flocks, diagnostic test accuracy (sensibilidad, especificidad), the statistics (ANOVA, Tukey, chi-cuadrado, prevalence with confidence intervals) and animal welfare and ethics approval",
      },
      especialista: {
        role: { m: "Especialista en medicina veterinaria y producción animal", f: "Especialista en medicina veterinaria y producción animal" },
        focus:
          "the clinical, sanitary or productive area: the disease, its epidemiology and zoonotic risk, diagnosis and treatment, nutrition, reproduction or genetic improvement, productive parameters (ganancia de peso, conversión alimenticia), the animal-health norms (SENASA or the local equivalent), and the economic and public-health consequences",
      },
      themes:
        "why that species and production system, the experimental units and treatments, the diagnostic technique, zoonotic and public-health risk, productive and economic results, animal welfare",
      vocabulary:
        "prevalencia, seroprevalencia, zoonosis, unidad experimental, tratamiento, ganancia de peso, conversión alimenticia, SENASA, bienestar animal, hato, crianza, camélidos sudamericanos",
      paradigms:
        "Experimental (feeding, treatment and reproduction trials with randomised designs) and quantitative observational studies (prevalence, risk factors); qualitative work is rare.",
    },
    keywords: ["veterinar", "zootecn", "pecuari", "acuicol", "acuicultura", "produccion animal"],
    hints: ["bovinos", "ovinos", "cuyes", "alpacas", "llamas", "pollos", "porcinos", "caninos", "felinos", "perros", "gatos", "vacas", "parasitos", "mastitis", "truchas", "tilapia", "gallinas", "lechera"],
  },
  derecho: {
    id: "derecho",
    name: "Derecho y ciencia política",
    team: {
      presidente: chair(
        "the coherence between the legal problem, the objectives and the conclusions, and whether the proposal (a reform, a criterion, a bill) is viable and constitutional",
      ),
      metodologo: {
        role: { m: "Metodólogo en investigación jurídica", f: "Metodóloga en investigación jurídica" },
        focus:
          "the legal research method, which is often not quantitative: the type of research (dogmática, jurídico-propositiva, socio-jurídica, comparada), the methods of interpretation (literal, sistemático, teleológico, histórico), how the case law and the files were selected and analysed (análisis documental, fichas), the categories and subcategories when it is qualitative, the experts interviewed and why them, and — only when the thesis is empirical — the sample and the statistics; " +
          NO_FORCED_STATS,
      },
      especialista: {
        role: { m: "Especialista en derecho", f: "Especialista en derecho" },
        focus:
          "the legal dogmatics of the branch: the doctrine and authors cited, the current legislation (Constitución, códigos, leyes and reglamentos — checking that they are in force and not repealed), the binding case law (Tribunal Constitucional, Corte Suprema, precedentes vinculantes, plenos casatorios, acuerdos plenarios, or the local equivalents) and the international instruments, and whether the conclusions and the proposal follow from that analysis",
      },
      themes:
        "the legal problem and why it matters, whether the cited norms are in force, the precedents and plenos that bear on it, the interpretation used, comparative law, the viability and constitutionality of the proposal, counter-arguments from the doctrine",
      vocabulary:
        "doctrina, jurisprudencia, precedente vinculante, pleno casatorio, acuerdo plenario, Tribunal Constitucional, ratio decidendi, ponderación, ordenamiento jurídico, norma vigente, propuesta legislativa, categorías y subcategorías",
      paradigms:
        "Legal research is mostly qualitative and documentary — dogmatic, propositional and comparative analysis of norms, doctrine and case law, sometimes with expert interviews — and only socio-legal studies use surveys and statistics. Political science and international relations add qualitative case studies and some quantitative analysis.",
    },
    keywords: ["derecho", "juridic", "abogad", "legal", "penal", "constitucional", "ciencia politica", "ciencias politicas", "relaciones internacionales", "criminolog"],
    hints: ["delito", "proceso penal", "codigo civil", "codigo penal", "jurisprudencia", "tribunal constitucional", "contrato", "derechos fundamentales", "feminicidio", "prision preventiva", "pension de alimentos", "violencia familiar", "arbitraje", "notarial"],
  },
  educacion: {
    id: "educacion",
    name: "Educación",
    team: {
      presidente: chair("whether the proposal can be applied in a real classroom and what it changes for the students"),
      metodologo: {
        role: { m: "Metodólogo en investigación educativa", f: "Metodóloga en investigación educativa" },
        focus:
          "the design (descriptivo-correlacional, cuasiexperimental with pretest and postest, investigación-acción), the instruments (cuestionarios, rúbricas, listas de cotejo, pruebas) with their validity by expert judgement (juicio de expertos, V de Aiken) and their reliability (KR-20, alfa de Cronbach), sampling of students and classrooms, the statistics, and permissions and assent when the participants are minors",
      },
      especialista: {
        role: { m: "Especialista en educación", f: "Especialista en educación" },
        focus:
          "the pedagogical approach and the learning theories behind it (constructivismo, aprendizaje significativo, enfoque por competencias), the national curriculum (Currículo Nacional de Educación Básica — competencias, capacidades y desempeños — or the local equivalent), the didactic strategy or programme proposed, how it was applied in the classroom, and what a teacher would do differently because of the results",
      },
      themes:
        "the pedagogical approach, the instruments and their validity, the programme or strategy and its sessions, control and experimental groups, application in the classroom, alignment with the curriculum and its competencies",
      vocabulary:
        "competencias, capacidades, desempeños, Currículo Nacional, sesión de aprendizaje, estrategia didáctica, pretest y postest, grupo experimental y grupo control, juicio de expertos, rúbrica, aprendizaje significativo, institución educativa, UGEL",
      paradigms:
        "Mostly quantitative (correlational and quasi-experimental pretest/postest designs), with a strong tradition of investigación-acción and qualitative studies of teaching practice.",
    },
    keywords: ["educacion", "educativ", "docencia", "pedagog", "didactic", "ensenanza", "curricul", "psicopedagog"],
    hints: ["estudiantes", "alumnos", "aprendizaje", "institucion educativa", "docentes", "comprension lectora", "estrategia didactica", "rendimiento academico", "nivel inicial", "educacion primaria", "competencias matematicas", "material didactico", "aula"],
  },
  "ingenieria-civil": {
    id: "ingenieria-civil",
    name: "Ingeniería civil",
    team: {
      presidente: chair("whether the proposal is technically and economically viable and could actually be built"),
      metodologo: {
        role: { m: "Metodólogo en investigación aplicada", f: "Metodóloga en investigación aplicada" },
        focus:
          "the applied or experimental design: the tests and their standards (ensayos de laboratorio under NTP, ASTM, AASHTO), the number of specimens (probetas) and replicates, the control sample, data processing, the comparison of results with the norm's limits, and statistics only where the design calls for them — a structural design or a case study is judged on calculation and standards, not on hypothesis tests",
      },
      especialista: {
        role: { m: "Especialista en ingeniería civil", f: "Especialista en ingeniería civil" },
        focus:
          "the engineering behind the thesis: the calculations and the models (structural, seismic, hydraulic, geotechnical, pavement, traffic), the technical regulation (Reglamento Nacional de Edificaciones — E.030 sismorresistente, E.060 concreto armado — and the MTC manuals, or the local equivalents), the materials and their properties, constructability, viability and costs (metrados, presupuesto, análisis de precios unitarios), and safety and environmental implications",
      },
      themes:
        "why those tests and how many specimens, compliance with the RNE and NTP/ASTM, the assumptions in the calculation and the software used (ETABS, SAP2000, HEC-RAS, Civil 3D), comparison with the control sample, costs and viability, seismic and safety considerations",
      vocabulary:
        "resistencia a la compresión, probetas, f'c, diseño de mezcla, RNE, norma E.030, E.060, ensayo, ASTM, NTP, análisis sísmico, deriva, pavimento, CBR, metrado, presupuesto, análisis de precios unitarios, expediente técnico",
      paradigms:
        "Applied and experimental quantitative research (laboratory tests on materials, simulations, design proposals with a calculation report); the evidence is calculation and compliance with standards rather than surveys, though construction-management theses use questionnaires.",
    },
    keywords: ["ingenieria civil", "construccion", "estructur", "sanitaria", "topograf", "hidraulic", "obras civiles", "geotecn", "transportes"],
    hints: ["concreto", "pavimento", "asfalt", "sismic", "albanileria", "puente", "drenaje", "edificacion", "carretera", "agregados", "cemento", "vivienda multifamiliar", "muros", "canal", "subrasante", "mezcla asfaltica"],
  },
  arquitectura: {
    id: "arquitectura",
    name: "Arquitectura y urbanismo",
    team: {
      presidente: chair("whether the project answers the needs it set out to and could be built and managed"),
      metodologo: {
        role: { m: "Metodólogo en investigación arquitectónica", f: "Metodóloga en investigación arquitectónica" },
        focus:
          "how the project is grounded: the site and user analysis (análisis del lugar, estudio de usuario, programa arquitectónico), the analogous cases (casos análogos) and how they were analysed, the criteria and variables that lead to the design decisions, and — when the thesis is research rather than a project — its qualitative or quantitative design; " +
          NO_FORCED_STATS,
      },
      especialista: {
        role: { m: "Especialista en arquitectura y urbanismo", f: "Especialista en arquitectura y urbanismo" },
        focus:
          "the architectural proposal itself: the concept and partido arquitectónico, zoning and functional relations, form, space, structure and materials, bioclimatic and sustainability criteria, accessibility and the Reglamento Nacional de Edificaciones (A.010, A.120 and the norm for each use) or the local equivalent, the urban insertion, and the feasibility and cost of the project",
      },
      themes:
        "the concept and how it derives from the site, the programme and the user, analogous cases, zoning and circulation, compliance with the building code, bioclimatic decisions, urban impact, viability and management",
      vocabulary:
        "partido arquitectónico, concepto, programa arquitectónico, zonificación, casos análogos, emplazamiento, usuario, RNE, confort térmico, bioclimática, planta, corte, elevación, maqueta, memoria descriptiva, intervención urbana",
      paradigms:
        "Mostly project-based (an architectural project or urban plan grounded in site, user and case analysis), with some qualitative research and quantitative studies of comfort or perception; the defence centres on the design decisions.",
    },
    keywords: ["arquitect", "urbanis", "urbano", "planificacion urbana"],
    hints: ["centro cultural", "equipamiento", "espacio publico", "vivienda social", "confort termico", "bioclimatic", "proyecto arquitectonico", "malecon", "centro de salud mental"],
  },
  "industrial-sistemas": {
    id: "industrial-sistemas",
    name: "Ingeniería industrial y de sistemas",
    team: {
      presidente: chair("whether the solution actually improved the organisation and is worth what it costs"),
      metodologo: {
        role: { m: "Metodólogo en investigación tecnológica", f: "Metodóloga en investigación tecnológica" },
        focus:
          "the applied or pre-experimental design (pretest and postest on indicators), how the indicators are defined and measured (productividad, eficiencia, eficacia, tiempo de respuesta, nivel de servicio), the data collection period and its comparability, the statistics on before/after data (t de Student, Wilcoxon), and for software: how the system was evaluated (ISO/IEC 25010, user acceptance, performance tests)",
      },
      especialista: {
        role: { m: "Especialista en ingeniería industrial y de sistemas", f: "Especialista en ingeniería industrial y de sistemas" },
        focus:
          "the engineering solution: the methodology applied (Lean, 5S, SMED, TPM, Six Sigma, gestión por procesos, simulación, investigación de operaciones; or SCRUM, RUP, XP, software architecture, database design, machine learning models) and why it fits the problem, how it was implemented, the economic evaluation (VAN, TIR, beneficio/costo), and standards such as ISO 9001, ISO 27001 or the data-protection law",
      },
      themes:
        "the diagnosis of the problem (Ishikawa, Pareto, VSM), why that methodology, how the indicators were measured before and after, the implementation, the economic evaluation, for software the requirements, architecture and quality evaluation",
      vocabulary:
        "productividad, eficiencia, eficacia, indicadores, diagrama de Ishikawa, Pareto, VSM, 5S, Lean, mejora continua, VAN, TIR, costo-beneficio, SCRUM, sprint, requerimientos, arquitectura de software, base de datos, ISO 25010, ISO 27001",
      paradigms:
        "Applied, technological research: pre-experimental or quasi-experimental before/after designs on process indicators, development of a software system evaluated against quality models, and simulation or optimisation; qualitative work is rare.",
    },
    keywords: ["industrial", "sistemas", "informatic", "software", "computac", "ciberseguridad", "ciencia de datos", "inteligencia artificial", "empresarial", "logistic", "tecnologias de la informacion"],
    hints: ["productividad", "lean", "5s", "sistema web", "aplicativo", "aplicacion movil", "aplicacion web", "machine learning", "aprendizaje automatico", "redes neuronales", "mantenimiento preventivo", "inventarios", "cadena de suministro", "chatbot", "base de datos", "seguridad de la informacion"],
  },
  "minas-geologia": {
    id: "minas-geologia",
    name: "Minas, geología, metalurgia y petróleo",
    team: {
      presidente: chair("safety, the environmental and community impact, and the economic viability of the operation"),
      metodologo: {
        role: { m: "Metodólogo en investigación aplicada", f: "Metodóloga en investigación aplicada" },
        focus:
          "the applied or experimental design: sampling of ore or rock (muestreo, representatividad, QA/QC), laboratory and pilot tests (pruebas metalúrgicas, ensayos geomecánicos) and their replicates, the process variables, the statistics or geostatistics (kriging, variogramas), and how the results were validated in the field",
      },
      especialista: {
        role: { m: "Especialista en ingeniería de minas y geociencias", f: "Especialista en ingeniería de minas y geociencias" },
        focus:
          "the technical core: geology and the deposit model, mine design and planning (método de explotación, perforación y voladura, ventilación, sostenimiento, RMR and Q classifications), mineral processing and metallurgy (chancado, molienda, flotación, lixiviación, recuperación), reservoir and production engineering for oil and gas, mining safety and environmental regulation (Reglamento de Seguridad y Salud Ocupacional en Minería D.S. 024-2016-EM, estudios de impacto ambiental, or the local equivalents), and costs and economic viability",
      },
      themes:
        "representativeness of the samples, the geomechanical or metallurgical tests, safety factors and regulation, recovery and grade, cost per tonne and NPV, environmental and community impact",
      vocabulary:
        "yacimiento, ley de mineral, recuperación, flotación, lixiviación, perforación y voladura, sostenimiento, RMR, macizo rocoso, ventilación, D.S. 024-2016-EM, EIA, relaves, ley de corte, costo por tonelada, pozos, reservorio",
      paradigms:
        "Applied quantitative research: laboratory and pilot tests, field measurements, simulations and techno-economic evaluations; the evidence is test results, geostatistics and engineering calculations.",
    },
    keywords: ["minas", "miner", "geolog", "metalurg", "petrol", "geofisic", "materiales", "gas natural"],
    hints: ["voladura", "flotacion", "lixiviacion", "mina", "unidad minera", "yacimiento", "relaves", "sostenimiento", "perforacion", "concentrado", "cianuracion", "macizo rocoso", "pozo petrolero"],
  },
  "agrarias-ambientales": {
    id: "agrarias-ambientales",
    name: "Ingenierías agrarias, forestales y ambientales",
    team: {
      presidente: chair("whether the proposal is viable for farmers, communities or the company and sustainable for the environment"),
      metodologo: {
        role: { m: "Metodólogo en investigación agraria y ambiental", f: "Metodóloga en investigación agraria y ambiental" },
        focus:
          "the field or laboratory experimental design (DCA, DBCA, factorial arrangements, parcelas), treatments, replicates and controls, the sampling protocol for soil, water or air, the statistics (ANOVA, Tukey or Duncan, regression), and the comparison of measurements with the standards (Estándares de Calidad Ambiental, Límites Máximos Permisibles, or the local equivalents)",
      },
      especialista: {
        role: { m: "Especialista en ciencias agrarias y ambientales", f: "Especialista en ciencias agrarias y ambientales" },
        focus:
          "the agronomic, forestry or environmental area: crop physiology, soils and fertilisation, pest management, forest inventory and management, hydrology and irrigation, water and waste treatment, environmental impact assessment and environmental law (Ley General del Ambiente, OEFA, SENACE, or the local equivalents), climate change and sustainability",
      },
      themes:
        "why those treatments and doses, the experimental design in the field, soil or water sampling, comparison with ECA and LMP, yield and cost, environmental and social viability, climate and seasonality",
      vocabulary:
        "tratamientos, repeticiones, DBCA, rendimiento, parcela, fertilización, análisis de suelo, ECA, LMP, calidad de agua, biorremediación, huella de carbono, impacto ambiental, inventario forestal, riego, cuenca",
      paradigms:
        "Mostly experimental (field and greenhouse trials, laboratory treatments) and quantitative monitoring; environmental management theses also use surveys and qualitative social analysis.",
    },
    keywords: ["agronom", "agrar", "agricol", "forestal", "ambiental", "recursos naturales", "agroforestal", "ecolog", "medio ambiente"],
    hints: ["cultivo", "rendimiento del cultivo", "fertiliz", "suelo", "riego", "residuos solidos", "aguas residuales", "contaminacion", "compost", "biochar", "variedades", "papa", "maiz", "quinua", "cafe", "cacao", "plagas", "reforestacion", "metales pesados", "humedal"],
  },
  "electrica-mecanica": {
    id: "electrica-mecanica",
    name: "Ingenierías eléctrica, electrónica, mecánica y mecatrónica",
    team: {
      presidente: chair("whether the design works, is safe and is worth what it costs"),
      metodologo: {
        role: { m: "Metodólogo en investigación tecnológica", f: "Metodóloga en investigación tecnológica" },
        focus:
          "the technological design: the requirements and specifications, the prototype or simulation and how it was tested (protocolos de prueba, mediciones, error, repeatability), the measuring instruments and their calibration, and the analysis of the test data; a design thesis is judged on its tests and calculations, not on surveys",
      },
      especialista: {
        role: { m: "Especialista en ingeniería eléctrica y mecánica", f: "Especialista en ingeniería eléctrica y mecánica" },
        focus:
          "the engineering core: circuit, control, power, telecommunications or mechanical design and its calculations (dimensionamiento, selección de componentes, simulation in MATLAB/Simulink, SolidWorks, ETAP), the technical standards (Código Nacional de Electricidad, IEC, IEEE, ASME, ISO, or the local equivalents), energy efficiency, safety, maintenance and the cost of the solution",
      },
      themes:
        "the specifications and why those components, the calculations and simulations, the tests of the prototype and the measurement error, the standards complied with, efficiency, safety, maintenance and cost",
      vocabulary:
        "prototipo, diseño, simulación, controlador PID, PLC, microcontrolador, sensores, potencia, eficiencia energética, Código Nacional de Electricidad, IEC, ASME, mantenimiento, confiabilidad, presupuesto",
      paradigms:
        "Applied technological research: design, simulation and construction of a prototype or system validated by tests and measurements; some theses evaluate an implemented solution with before/after indicators.",
    },
    keywords: ["electr", "mecanic", "mecatron", "telecomunicacion", "biomedic", "naval", "aeronautic", "energia", "automotriz", "redes y comunicaciones"],
    hints: ["prototipo", "controlador", "motor", "energia solar", "fotovoltaic", "plc", "arduino", "automatizacion", "subestacion", "transformador", "turbina", "caldera", "sistema de control", "antena", "fibra optica", "iot"],
  },
  "quimica-procesos": {
    id: "quimica-procesos",
    name: "Ingenierías química, alimentaria y de procesos",
    team: {
      presidente: chair("whether the process or product could be scaled up and is viable"),
      metodologo: {
        role: { m: "Metodólogo en investigación experimental", f: "Metodóloga en investigación experimental" },
        focus:
          "the experimental design of the process (diseño factorial, superficie de respuesta, optimisation), the variables and their levels, replicates, the analytical methods (fisicoquímico, microbiológico, sensorial) and the statistics (ANOVA, Tukey, sensory panels with Friedman or Kruskal-Wallis)",
      },
      especialista: {
        role: { m: "Especialista en ingeniería de procesos", f: "Especialista en ingeniería de procesos" },
        focus:
          "the process itself: unit operations, mass and energy balances, kinetics and yields, product formulation and shelf life (vida útil), food safety and quality standards (HACCP, BPM, NTP, Codex Alimentarius, DIGESA, SANIPES, or the local equivalents), textile or chemical process standards, scaling up, and the techno-economic viability of the plant or product",
      },
      themes:
        "why those process variables and levels, the balances and yields, the analyses of the product, sensory evaluation, shelf life, food safety, scaling up and costs",
      vocabulary:
        "balance de materia y energía, rendimiento, operaciones unitarias, formulación, vida útil, evaluación sensorial, análisis fisicoquímico, HACCP, BPM, DIGESA, diseño factorial, superficie de respuesta, escalamiento",
      paradigms:
        "Experimental laboratory and pilot-plant research (formulation, optimisation, process design) with quantitative analysis; plant-design theses rest on balances and techno-economic evaluation.",
    },
    keywords: ["ingenieria quimica", "alimentari", "alimentos", "agroindustr", "pesquer", "textil", "procesos"],
    hints: ["harina", "yogur", "mermelada", "nectar", "galletas", "formulacion", "vida util", "secado", "deshidratado", "fermentacion", "evaluacion sensorial", "bebida", "pulpa", "adsorcion", "biodiesel", "tenido"],
  },
  ciencias: {
    id: "ciencias",
    name: "Ciencias exactas y naturales",
    team: {
      presidente: chair("what the result adds to knowledge and how it would be published"),
      metodologo: {
        role: { m: "Metodólogo en investigación científica", f: "Metodóloga en investigación científica" },
        focus:
          "the scientific method of the thesis: the hypothesis and how it was tested, the experimental or field design, controls and replicates, sampling, measurement error and uncertainty, the statistics, and reproducibility; for a theoretical or mathematical thesis, the rigour of the demonstrations rather than empirical statistics",
      },
      especialista: {
        role: { m: "Especialista en ciencias", f: "Especialista en ciencias" },
        focus:
          "the scientific core of the field — the biological, physical, chemical, mathematical or statistical theory behind the thesis — the techniques (molecular, spectroscopic, computational, field taxonomy), the state of the art in indexed literature, and what the result adds to knowledge or to its application",
      },
      themes:
        "the hypothesis and how it was tested, controls and replicates, uncertainty, the techniques and their limits, the theory and the proofs, the state of the art, the contribution and what comes next",
      vocabulary:
        "hipótesis, diseño experimental, réplicas, control, incertidumbre, error experimental, modelo, simulación, demostración, teorema, especie, muestreo, secuenciación, espectroscopía, publicación indexada",
      paradigms:
        "Experimental and observational natural science, theoretical and computational work, and formal mathematics where proof replaces statistics.",
    },
    keywords: ["biolog", "fisica", "quimica", "matematic", "estadistic", "microbiolog", "genetic", "biotecnolog", "ciencias naturales", "computacion cientifica", "meteorolog", "oceanograf"],
    hints: ["teorema", "ecuacion", "espectroscop", "nanoparticulas", "bacterias", "especies", "taxonomia", "secuenciacion", "molecular", "cepas", "modelo matematico", "simulacion numerica", "biodiversidad"],
  },
  economia: {
    id: "economia",
    name: "Economía",
    team: {
      presidente: chair("the policy implications and how far the conclusions reach"),
      metodologo: {
        role: { m: "Metodólogo en econometría", f: "Metodóloga en econometría" },
        focus:
          "the econometrics: the specification of the model and its theoretical justification, the data sources (INEI, BCRP, ENAHO, World Bank, or the local equivalents) and the period, the estimation method (MCO, series de tiempo, datos de panel, VAR, logit/probit), the tests (estacionariedad, cointegración, heterocedasticidad, autocorrelación, multicolinealidad), endogeneity, and causality versus correlation",
      },
      especialista: {
        role: { m: "Especialista en economía", f: "Especialista en economía" },
        focus:
          "the economic theory and the literature behind the model, the transmission mechanisms, how the coefficients are interpreted, comparison with empirical studies, the policy implications (monetary, fiscal, social, sectoral) and the limits of the conclusions",
      },
      themes:
        "the theoretical model, the data and the period, the estimation method and its tests, endogeneity and causality, the interpretation of coefficients, policy implications",
      vocabulary:
        "modelo econométrico, variable dependiente, elasticidad, estacionariedad, cointegración, MCO, datos de panel, PBI, inflación, BCRP, INEI, ENAHO, política económica, crecimiento económico, causalidad",
      paradigms:
        "Mostly quantitative and econometric (time series, panel data, microeconometrics with survey data), with some theoretical modelling and qualitative political-economy work.",
    },
    keywords: ["econom"],
    hints: ["crecimiento economico", "pbi", "inflacion", "exportaciones", "pobreza", "tipo de cambio", "gasto publico", "inversion publica", "recaudacion", "desempleo", "remesas", "canon minero"],
  },
  administracion: {
    id: "administracion",
    name: "Administración, negocios y marketing",
    team: {
      presidente: chair("whether the recommendations are concrete, costed and useful to the organisation"),
      metodologo: {
        role: { m: "Metodólogo en investigación de negocios", f: "Metodóloga en investigación de negocios" },
        focus:
          "the design (descriptivo, correlacional, explicativo, sometimes mixed), the population of workers, clients or firms and the sampling, the questionnaires (escala de Likert) with their validity by expert judgement and their reliability, the operationalisation of the variables into dimensions and indicators, and the statistics (Rho de Spearman, chi-cuadrado, regression)",
      },
      especialista: {
        role: { m: "Especialista en administración y negocios", f: "Especialista en administración y negocios" },
        focus:
          "the management theory behind the variables (gestión del talento, clima organizacional, calidad de servicio SERVQUAL, marketing mix, planeamiento estratégico, cadena de suministro, comercio exterior, gestión pública), the context of the organisation or sector, the comparison with prior studies, and concrete recommendations for the company or public entity, with their cost and feasibility",
      },
      themes:
        "the definition of the variables and their dimensions, the questionnaire and its validity, the sample of workers or clients, correlation against causation, the organisation's context, practical and costed recommendations; for a business plan, the market study and the financial evaluation",
      vocabulary:
        "gestión, clima organizacional, desempeño laboral, satisfacción del cliente, calidad de servicio, marketing mix, plan de negocios, FODA, cadena de suministro, exportación, mypes, rentabilidad, escala de Likert, Rho de Spearman",
      paradigms:
        "Mostly quantitative (correlational studies with questionnaires in one organisation), plus business plans, case studies and some qualitative and mixed studies.",
    },
    keywords: ["administra", "gestion", "negocio", "empresa", "gerencia", "marketing", "mercadotecnia", "comercio", "recursos humanos", "talento humano", "emprendimiento"],
    hints: ["clima organizacional", "desempeno laboral", "satisfaccion del cliente", "calidad de servicio", "calidad del servicio", "marketing", "ventas", "plan de negocios", "fidelizacion", "motivacion laboral", "liderazgo", "gestion del talento", "posicionamiento", "municipalidad", "exportacion"],
  },
  contabilidad: {
    id: "contabilidad",
    name: "Contabilidad y finanzas",
    team: {
      presidente: chair("the effect of the findings on the company's statements and its compliance"),
      metodologo: {
        role: { m: "Metodólogo en investigación contable", f: "Metodóloga en investigación contable" },
        focus:
          "the design (descriptive, correlational or case study), the documentary analysis of financial statements and records, the questionnaires to accountants or managers with their validity and reliability, the period analysed and the ratios computed, and the statistics where they apply",
      },
      especialista: {
        role: { m: "Especialista en contabilidad y finanzas", f: "Especialista en contabilidad y finanzas" },
        focus:
          "the accounting and financial standards: NIIF/IFRS and NIC (NIIF para pymes, NIC 16, NIIF 15, NIIF 16), tax regulation (Ley del Impuesto a la Renta, IGV, SUNAT criteria and tax audits, or the local tax authority), control interno (COSO), auditing standards (NIA), financial analysis (ratios, flujo de caja, rentabilidad, liquidez) and the impact on the company's statements",
      },
      themes:
        "which NIIF or tax norm applies and how, the financial statements and the period, the ratios and what they show, internal control, tax contingencies, the effect on profitability and liquidity",
      vocabulary:
        "estados financieros, NIIF, NIC, SUNAT, IGV, impuesto a la renta, tributación, control interno, COSO, auditoría, NIA, ratios financieros, liquidez, rentabilidad, flujo de caja, costos, pymes",
      paradigms:
        "Quantitative and documentary: analysis of financial statements and ratios over a period, correlational surveys of accountants, and case studies of one company; the legal-tax analysis is partly documentary.",
    },
    keywords: ["contab", "contable", "contador", "tribut", "financ", "auditor", "finanz", "banca"],
    hints: ["tributari", "sunat", "niif", "control interno", "estados financieros", "rentabilidad", "liquidez", "costos", "detracciones", "impuesto", "igv", "evasion tributaria", "flujo de caja"],
  },
  comunicacion: {
    id: "comunicacion",
    name: "Comunicación y periodismo",
    team: {
      presidente: chair("what the findings mean for a newsroom, a brand, an institution or a community"),
      metodologo: {
        role: { m: "Metodólogo en investigación en comunicación", f: "Metodóloga en investigación en comunicación" },
        focus:
          "the design (análisis de contenido, análisis del discurso, estudio de recepción, encuestas, entrevistas, grupos focales, etnografía digital), the corpus or sample and how it was selected, the categories and the coding (fichas de análisis), and statistics only when the study is quantitative; " +
          NO_FORCED_STATS,
      },
      especialista: {
        role: { m: "Especialista en comunicación", f: "Especialista en comunicación" },
        focus:
          "the communication theories behind the thesis (agenda setting, framing, recepción, semiótica, comunicación para el desarrollo, comunicación organizacional), the media, platforms or campaigns studied, journalistic ethics and the regulation of media and advertising, and what the findings mean for practice",
      },
      themes:
        "the theory, the corpus and why it is representative, the categories of analysis, the audience, the platform, ethics, what a communicator would do differently; for an audiovisual or advertising product, the concept and its execution",
      vocabulary:
        "análisis de contenido, encuadre, agenda setting, audiencia, recepción, discurso, redes sociales, engagement, campaña, comunicación organizacional, periodismo, ética periodística, corpus, categorías",
      paradigms:
        "Qualitative (content and discourse analysis, interviews, focus groups, case studies) and quantitative (audience surveys, content counts), often mixed; audiovisual and advertising programmes also accept a product with its report.",
    },
    keywords: ["comunicacion", "periodis", "publicid", "audiovisual", "relaciones publicas"],
    hints: ["redes sociales", "noticias", "audiencia", "campana publicitaria", "tiktok", "instagram", "facebook", "diario", "noticiero", "imagen institucional", "comunicacion interna", "influencer", "podcast"],
  },
  "ciencias-sociales": {
    id: "ciencias-sociales",
    name: "Ciencias sociales",
    team: {
      presidente: chair("the ethics of research with communities and the implications for public policy"),
      metodologo: {
        role: { m: "Metodólogo en ciencias sociales", f: "Metodóloga en ciencias sociales" },
        focus:
          "the approach and its consistency (cualitativo, cuantitativo or mixto), the fieldwork (trabajo de campo, observación participante, entrevistas a profundidad, historias de vida, grupos focales; or the survey design and sampling), the selection of informants and saturation, the analysis (categorías, codificación, triangulación) and the ethics of research with communities and vulnerable groups; " +
          NO_FORCED_STATS,
      },
      especialista: {
        role: { m: "Especialista en ciencias sociales", f: "Especialista en ciencias sociales" },
        focus:
          "the social theory and the authors the thesis argues from, the territorial, historical and cultural context, the categories of analysis, the dialogue with Peruvian and Latin American scholarship, and the implications for public policy, social intervention or the communities studied; in archaeology, the stratigraphy, the material record and its interpretation",
      },
      themes:
        "the theoretical position, access to the field and the informants, saturation and triangulation, the researcher's position, ethics with communities, the context, implications for policy and intervention",
      vocabulary:
        "trabajo de campo, informantes, entrevista a profundidad, observación participante, categorías de análisis, saturación, triangulación, comunidad, territorio, interculturalidad, intervención social, política pública, excavación, contexto arqueológico",
      paradigms:
        "Predominantly qualitative (ethnography, interviews, life histories, case studies), with quantitative surveys in sociology and social work, and stratigraphic and material analysis in archaeology.",
    },
    keywords: ["sociolog", "antropolog", "arqueolog", "trabajo social", "servicio social", "geograf", "ciencias sociales", "desarrollo social"],
    hints: ["comunidad campesina", "comunidades nativas", "migracion", "identidad cultural", "etnografia", "programa social", "vulnerabilidad", "conflicto social", "genero", "ritual", "excavacion", "sitio arqueologico", "ceramica"],
  },
  humanidades: {
    id: "humanidades",
    name: "Humanidades",
    team: {
      presidente: chair("the originality of the interpretation and the quality of the writing and citation"),
      metodologo: {
        role: { m: "Metodólogo en investigación humanística", f: "Metodóloga en investigación humanística" },
        focus:
          "the method of the discipline, which is interpretive rather than statistical: the hermeneutic, historiographic, philological or argumentative method, the sources (archival, primary and secondary) and their criticism, the corpus and why it is representative, the analytical framework (narratología, semiótica, análisis del discurso, descripción lingüística), and the rigour of the argument; " +
          NO_FORCED_STATS,
      },
      especialista: {
        role: { m: "Especialista en humanidades", f: "Especialista en humanidades" },
        focus:
          "the authors, works, periods or languages studied, the critical and theoretical debates around them, how the thesis positions itself against the established readings, the originality of its interpretation, and the quality of the writing and the citation",
      },
      themes:
        "the sources and their criticism, the corpus, the theoretical framework, the position against established readings, the strength of the argument, the originality of the interpretation",
      vocabulary:
        "fuentes primarias, archivo, historiografía, hermenéutica, corpus, crítica literaria, narratología, análisis del discurso, argumentación, estado de la cuestión, interpretación, edición crítica",
      paradigms:
        "Interpretive and documentary: hermeneutics, historiographic analysis of sources, literary criticism, philosophical argument, and descriptive linguistics with corpora or fieldwork.",
    },
    keywords: ["histori", "filosof", "literat", "linguist", "letras", "humanidades", "traduccion", "teolog", "bibliotecolog", "lenguas"],
    hints: ["novela", "poesia", "poemario", "narrativa", "cuentos", "archivo", "siglo xix", "siglo xx", "colonial", "virreinato", "quechua", "aimara", "etica", "hermeneutica", "ontologia"],
  },
  "arte-diseno": {
    id: "arte-diseno",
    name: "Arte, diseño y música",
    team: {
      presidente: chair("the coherence between the concept, the process and the finished work"),
      metodologo: {
        role: { m: "Metodólogo en investigación artística", f: "Metodóloga en investigación artística" },
        focus:
          "how the work was researched and made: the creative process and its documentation (bitácora, bocetos, prototipos), the references and how they informed the proposal, the research-through-practice or design method (design thinking, user research, tests with users), and how the piece or product was evaluated; " +
          NO_FORCED_STATS,
      },
      especialista: {
        role: { m: "Especialista en arte y diseño", f: "Especialista en arte y diseño" },
        focus:
          "the proposal itself: the concept and its coherence, the artistic or design references (referentes) and the tradition it dialogues with, the formal decisions (composition, colour, materials, typography, sound, movement), technique and execution, the audience or user, and the contribution or market viability of the work",
      },
      themes:
        "the concept, the creative process, the referents, the formal and technical decisions, the audience or user, how the work was evaluated, its contribution",
      vocabulary:
        "propuesta, concepto, referentes, proceso creativo, bitácora, bocetos, composición, paleta, tipografía, identidad visual, prototipo, usuario, obra, puesta en escena, interpretación, curaduría",
      paradigms:
        "Practice-based research (investigación-creación) and design projects with a written report, plus qualitative studies of art history, music and visual culture; quantitative work appears in user tests and market studies.",
    },
    keywords: ["arte", "artes", "diseno", "music", "danza", "teatro", "escenic", "fotograf", "cine", "animacion", "conservacion y restauracion"],
    hints: ["obra", "diseno grafico", "identidad visual", "branding", "musica", "composicion", "coleccion de moda", "pintura", "escultura", "puesta en escena", "videojuego", "ilustracion"],
  },
  turismo: {
    id: "turismo",
    name: "Turismo, hotelería y gastronomía",
    team: {
      presidente: chair("whether the proposal is viable and sustainable for the destination and its community"),
      metodologo: {
        role: { m: "Metodólogo en investigación turística", f: "Metodóloga en investigación turística" },
        focus:
          "the design (descriptive surveys of tourists or businesses, correlational studies, mixed studies with interviews to stakeholders), the sampling of visitors, the questionnaires and their validity, and the statistics; for a project or business plan, the market study and the financial evaluation",
      },
      especialista: {
        role: { m: "Especialista en turismo y hotelería", f: "Especialista en turismo y hotelería" },
        focus:
          "the tourism and hospitality area: tourism product and destination management, the tourist profile and demand, service quality in hotels and restaurants, sustainable and community-based tourism, cultural heritage and its protection, gastronomy, the sector regulation (MINCETUR, PENTUR, categorisation of establishments, or the local equivalents) and the viability of the proposal",
      },
      themes:
        "the tourist resource and its inventory, the demand and the tourist profile, service quality, sustainability and the community, the viability of the product or business",
      vocabulary:
        "destino turístico, producto turístico, demanda turística, perfil del turista, recurso turístico, inventario turístico, turismo vivencial, turismo comunitario, calidad de servicio, hotelería, MINCETUR, PENTUR, gastronomía, patrimonio",
      paradigms:
        "Mostly descriptive and correlational surveys, plus mixed and qualitative studies with communities and businesses, and tourism or business projects.",
    },
    keywords: ["turis", "hotel", "gastronom", "culinari", "ecoturismo"],
    hints: ["turistas", "destino turistico", "recurso turistico", "hotel", "restaurante", "turismo rural", "turismo vivencial", "circuito turistico", "agencias de viaje"],
  },
  "militar-policial": {
    id: "militar-policial",
    name: "Ciencias militares y policiales",
    team: {
      presidente: chair("the applicability of the proposal to the service and its legal framework"),
      metodologo: {
        role: { m: "Metodólogo en investigación", f: "Metodóloga en investigación" },
        focus:
          "the design (descriptive, correlational, case studies or mixed), the access to institutional information and its confidentiality, the questionnaires to personnel with their validity and reliability, and the statistics",
      },
      especialista: {
        role: { m: "Especialista en ciencias militares y policiales", f: "Especialista en ciencias militares y policiales" },
        focus:
          "the doctrine and regulations of the institution, the operational, administrative, logistic or citizen-security problem studied, the legal framework (Constitución, leyes orgánicas, derechos humanos and the use of force), and the applicability of the proposal to the service",
      },
      themes: "the doctrine, the operational problem, the legal framework and human rights, access to information, applicability to the service",
      vocabulary: "doctrina, mando, operaciones, logística, seguridad ciudadana, orden interno, uso de la fuerza, derechos humanos, personal, institución, reglamento",
      paradigms: "Mostly quantitative surveys of personnel and qualitative analysis of doctrine and cases.",
    },
    keywords: ["militar", "policial", "policia", "naval", "aeronautica militar", "seguridad ciudadana"],
    hints: ["seguridad ciudadana", "patrullaje", "policia nacional", "fuerzas armadas", "ejercito"],
  },
};

/* ------------------------------------------------------------------------- */
/* The catalogue                                                             */
/* ------------------------------------------------------------------------- */

const c = (id: string, name: string, family: FamilyId, synonyms: readonly string[] = []): Career => ({ id, name, synonyms, family });

export const CAREERS: readonly Career[] = [
  // Ciencias de la salud
  c("medicina-humana", "Medicina Humana", "salud", ["Medicina", "Médico Cirujano", "Médica Cirujana", "Ciencias Médicas"]),
  c("enfermeria", "Enfermería", "salud", ["Enfermera", "Enfermero", "Ciencias de la Enfermería"]),
  c("obstetricia", "Obstetricia", "salud", ["Obstetra", "Obstetriz", "Obstetricia y Puericultura"]),
  c("odontologia", "Odontología", "salud", ["Estomatología", "Cirujano Dentista", "Cirujana Dentista", "Odontólogo"]),
  c("tecnologia-medica", "Tecnología Médica", "salud", ["Tecnólogo Médico", "Tecnóloga Médica"]),
  c("tm-laboratorio-clinico", "Tecnología Médica en Laboratorio Clínico y Anatomía Patológica", "salud", ["Laboratorio Clínico y Anatomía Patológica", "Laboratorio Clínico", "Tecnología Médica especialidad Laboratorio Clínico"]),
  c("tm-terapia-fisica", "Tecnología Médica en Terapia Física y Rehabilitación", "salud", ["Terapia Física y Rehabilitación", "Terapia Física", "Fisioterapia", "Fisioterapia y Rehabilitación"]),
  c("tm-radiologia", "Tecnología Médica en Radiología", "salud", ["Radiología", "Radio Imagen", "Imagenología", "Radiología e Imagenología"]),
  c("tm-terapia-lenguaje", "Tecnología Médica en Terapia de Lenguaje", "salud", ["Terapia de Lenguaje", "Terapia del Lenguaje", "Fonoaudiología"]),
  c("tm-terapia-ocupacional", "Tecnología Médica en Terapia Ocupacional", "salud", ["Terapia Ocupacional"]),
  c("tm-optometria", "Tecnología Médica en Optometría", "salud", ["Optometría", "Optometría y Contactología"]),
  c("nutricion", "Nutrición", "salud", ["Nutrición Humana", "Nutrición y Dietética", "Ciencias de la Nutrición", "Bromatología y Nutrición", "Nutricionista"]),
  c("salud-publica", "Salud Pública", "salud", ["Salud Pública y Administración", "Gestión en Salud", "Administración en Salud"]),
  c("medicina-complementaria", "Medicina Complementaria", "salud", ["Medicina Tradicional y Complementaria"]),
  // Farmacia y bioquímica
  c("farmacia-bioquimica", "Farmacia y Bioquímica", "farmacia", ["Farmacia", "Química Farmacéutica", "Químico Farmacéutico", "Ciencias Farmacéuticas", "Ciencias Farmacéuticas y Bioquímica"]),
  c("toxicologia", "Toxicología", "farmacia"),
  c("ciencia-alimentos", "Ciencia de los Alimentos", "farmacia", ["Bromatología"]),
  // Psicología
  c("psicologia", "Psicología", "psicologia", ["Psicólogo", "Psicóloga", "Psicología Clínica", "Psicología Educativa", "Psicología Social", "Psicología Humana"]),
  c("psicologia-organizacional", "Psicología Organizacional y de la Gestión Humana", "psicologia", ["Psicología Organizacional", "Psicología del Trabajo y las Organizaciones"]),
  // Veterinaria y zootecnia
  c("medicina-veterinaria", "Medicina Veterinaria", "veterinaria", ["Médico Veterinario", "Médica Veterinaria", "Veterinaria"]),
  c("medicina-veterinaria-zootecnia", "Medicina Veterinaria y Zootecnia", "veterinaria", ["Médico Veterinario Zootecnista", "Veterinaria y Zootecnia"]),
  c("zootecnia", "Zootecnia", "veterinaria", ["Ingeniería Zootecnista", "Ingeniería Zootécnica", "Ingeniería en Zootecnia", "Ciencias Pecuarias"]),
  c("ingenieria-acuicola", "Ingeniería Acuícola", "veterinaria", ["Acuicultura", "Ingeniería en Acuicultura"]),
  // Derecho y ciencia política
  c("derecho", "Derecho", "derecho", ["Abogado", "Abogada", "Derecho y Ciencias Políticas", "Derecho y Ciencia Política", "Ciencias Jurídicas", "Derecho y Ciencias Jurídicas", "Derecho Corporativo"]),
  c("ciencia-politica", "Ciencia Política", "derecho", ["Ciencias Políticas", "Ciencia Política y Gobierno", "Gobierno"]),
  c("relaciones-internacionales", "Relaciones Internacionales", "derecho", ["Gobierno y Relaciones Internacionales", "Relaciones Internacionales y Diplomacia", "Diplomacia"]),
  // Educación
  c("educacion", "Educación", "educacion", ["Ciencias de la Educación", "Educación Básica", "Educación Básica Regular"]),
  c("educacion-inicial", "Educación Inicial", "educacion", ["Educación de la Primera Infancia", "Educación Infantil", "Educación Inicial y Primaria", "Educación Inicial Intercultural Bilingüe"]),
  c("educacion-primaria", "Educación Primaria", "educacion", ["Educación Primaria Intercultural Bilingüe", "Educación Primaria y Problemas de Aprendizaje"]),
  c("educacion-secundaria", "Educación Secundaria", "educacion", ["Educación Secundaria especialidad Matemática", "Educación Secundaria especialidad Lengua y Literatura", "Educación Secundaria especialidad Ciencias Sociales", "Educación Secundaria especialidad Ciencias Naturales"]),
  c("educacion-especial", "Educación Especial", "educacion", ["Educación Inclusiva"]),
  c("educacion-fisica", "Educación Física", "educacion", ["Educación Física y Deportes", "Ciencias del Deporte", "Ciencias de la Actividad Física y el Deporte"]),
  c("educacion-intercultural", "Educación Intercultural Bilingüe", "educacion", ["Educación Intercultural"]),
  c("educacion-idiomas", "Educación especialidad Idiomas", "educacion", ["Educación especialidad Inglés", "Enseñanza del Inglés", "Educación en Idiomas"]),
  c("educacion-tecnologica", "Educación Técnica", "educacion", ["Educación Tecnológica", "Educación para el Trabajo"]),
  c("educacion-artistica", "Educación Artística", "educacion", ["Educación Musical", "Educación por el Arte"]),
  c("psicopedagogia", "Psicopedagogía", "educacion", ["Problemas de Aprendizaje"]),
  // Ingeniería civil
  c("ingenieria-civil", "Ingeniería Civil", "ingenieria-civil", ["Ingeniería Civil Ambiental", "Ingeniería de Construcción Civil"]),
  c("ingenieria-sanitaria", "Ingeniería Sanitaria", "ingenieria-civil", ["Ingeniería Sanitaria y Ambiental"]),
  c("ingenieria-topografica", "Ingeniería Topográfica y Agrimensura", "ingenieria-civil", ["Ingeniería Topográfica", "Topografía y Agrimensura"]),
  c("ingenieria-hidraulica", "Ingeniería Hidráulica", "ingenieria-civil"),
  c("ingenieria-transportes", "Ingeniería de Transportes", "ingenieria-civil"),
  // Arquitectura
  c("arquitectura", "Arquitectura", "arquitectura", ["Arquitectura y Urbanismo", "Arquitecto", "Arquitecta", "Arquitectura, Urbanismo y Artes"]),
  c("urbanismo", "Urbanismo", "arquitectura", ["Planificación Urbana", "Planificación Urbana y Regional"]),
  // Ingeniería industrial y de sistemas
  c("ingenieria-industrial", "Ingeniería Industrial", "industrial-sistemas", ["Ingeniería Industrial y de Sistemas", "Ingeniería Industrial y Comercial", "Ingeniería de Producción", "Ingeniería Industrial y de Gestión"]),
  c("ingenieria-sistemas", "Ingeniería de Sistemas", "industrial-sistemas", ["Ingeniería en Sistemas", "Ingeniería de Sistemas y Cómputo", "Ingeniería de Sistemas Computacionales", "Ingeniería de Computación y Sistemas", "Ingeniería en Computación y Sistemas", "Ingeniería de Tecnologías de la Información", "Ingeniería de Tecnologías de la Información y Sistemas"]),
  c("ingenieria-sistemas-informatica", "Ingeniería de Sistemas e Informática", "industrial-sistemas", ["Ingeniería de Sistemas y Informática", "Ingeniería Informática y de Sistemas"]),
  c("ingenieria-software", "Ingeniería de Software", "industrial-sistemas", ["Ingeniería del Software", "Ingeniería de Software con Inteligencia Artificial"]),
  c("ingenieria-informatica", "Ingeniería Informática", "industrial-sistemas", ["Informática", "Ingeniería en Informática"]),
  c("ingenieria-computacion", "Ingeniería de Computación", "industrial-sistemas", ["Ingeniería de Computadoras", "Ingeniería en Computación"]),
  c("ciencia-computacion", "Ciencia de la Computación", "industrial-sistemas", ["Ciencias de la Computación"]),
  c("ingenieria-ciberseguridad", "Ingeniería de Ciberseguridad", "industrial-sistemas", ["Ciberseguridad", "Ingeniería de Seguridad y Auditoría Informática"]),
  c("ciencia-datos", "Ciencia de Datos", "industrial-sistemas", ["Ingeniería de Ciencia de Datos", "Data Science", "Ingeniería de Datos"]),
  c("ingenieria-inteligencia-artificial", "Ingeniería de Inteligencia Artificial", "industrial-sistemas", ["Ingeniería en Inteligencia Artificial", "Inteligencia Artificial"]),
  c("ingenieria-empresarial", "Ingeniería Empresarial", "industrial-sistemas", ["Ingeniería de Gestión Empresarial", "Ingeniería Empresarial y de Sistemas"]),
  c("ingenieria-logistica", "Ingeniería Logística", "industrial-sistemas", ["Ingeniería Logística y de Transporte", "Ingeniería de Gestión Logística"]),
  c("ingenieria-seguridad-industrial", "Ingeniería de Seguridad Industrial y Minera", "industrial-sistemas", ["Ingeniería de Seguridad y Salud en el Trabajo", "Ingeniería de Seguridad Industrial"]),
  // Minas, geología, metalurgia y petróleo
  c("ingenieria-minas", "Ingeniería de Minas", "minas-geologia", ["Ingeniería Minera", "Ingeniería de Minas y Metalurgia"]),
  c("ingenieria-geologica", "Ingeniería Geológica", "minas-geologia", ["Geología", "Ingeniería Geológica y Geotecnia", "Ingeniería Geológica y Minera"]),
  c("ingenieria-metalurgica", "Ingeniería Metalúrgica", "minas-geologia", ["Ingeniería Metalúrgica y de Materiales", "Metalurgia"]),
  c("ingenieria-materiales", "Ingeniería de Materiales", "minas-geologia", ["Ciencia e Ingeniería de Materiales"]),
  c("ingenieria-petroleo", "Ingeniería de Petróleo", "minas-geologia", ["Ingeniería de Petróleo y Gas Natural", "Ingeniería Petrolera", "Ingeniería del Petróleo"]),
  c("ingenieria-petroquimica", "Ingeniería Petroquímica", "minas-geologia"),
  c("ingenieria-geofisica", "Ingeniería Geofísica", "minas-geologia", ["Geofísica"]),
  // Agrarias, forestales y ambientales
  c("agronomia", "Agronomía", "agrarias-ambientales", ["Ingeniería Agronómica", "Ingeniero Agrónomo", "Ingeniería Agronómica Tropical", "Ingeniería Agraria", "Ciencias Agrarias", "Ingeniería Agrónoma"]),
  c("ingenieria-agricola", "Ingeniería Agrícola", "agrarias-ambientales"),
  c("ingenieria-forestal", "Ingeniería Forestal", "agrarias-ambientales", ["Ciencias Forestales", "Ingeniería en Ciencias Forestales", "Ingeniería Forestal y Ambiental", "Ingeniería Forestal y del Medio Ambiente"]),
  c("ingenieria-ambiental", "Ingeniería Ambiental", "agrarias-ambientales", ["Ingeniería del Medio Ambiente", "Ingeniería Ambiental y de Recursos Naturales", "Ingeniería en Gestión Ambiental", "Gestión Ambiental", "Ingeniería Ambiental y Sanitaria", "Ciencias Ambientales", "Ingeniería Ambiental y Prevención de Riesgos"]),
  c("ingenieria-recursos-naturales", "Ingeniería en Recursos Naturales Renovables", "agrarias-ambientales", ["Recursos Naturales Renovables", "Ingeniería de Recursos Naturales"]),
  c("ingenieria-agroforestal", "Ingeniería Agroforestal", "agrarias-ambientales", ["Ingeniería Agroforestal Acuícola", "Agroforestería"]),
  c("ingenieria-ecologia", "Ingeniería en Ecología", "agrarias-ambientales", ["Ecología", "Ingeniería Ecológica"]),
  // Eléctrica, electrónica, mecánica y mecatrónica
  c("ingenieria-electronica", "Ingeniería Electrónica", "electrica-mecanica", ["Ingeniería Electrónica y Eléctrica", "Ingeniería Electrónica Industrial"]),
  c("ingenieria-electrica", "Ingeniería Eléctrica", "electrica-mecanica", ["Ingeniería Eléctrica y de Potencia"]),
  c("ingenieria-mecanica", "Ingeniería Mecánica", "electrica-mecanica", ["Ingeniería Mecánica de Mantenimiento"]),
  c("ingenieria-mecanica-electrica", "Ingeniería Mecánica Eléctrica", "electrica-mecanica", ["Ingeniería Mecánica y Eléctrica", "Ingeniería Electromecánica", "Ingeniería Mecánica-Eléctrica"]),
  c("ingenieria-mecatronica", "Ingeniería Mecatrónica", "electrica-mecanica", ["Mecatrónica"]),
  c("ingenieria-telecomunicaciones", "Ingeniería de Telecomunicaciones", "electrica-mecanica", ["Ingeniería en Telecomunicaciones", "Ingeniería Electrónica y Telecomunicaciones", "Ingeniería Electrónica y de Telecomunicaciones", "Ingeniería de Telecomunicaciones y Redes", "Ingeniería de Redes y Comunicaciones", "Ingeniería de Telecomunicaciones y Telemática"]),
  c("ingenieria-biomedica", "Ingeniería Biomédica", "electrica-mecanica"),
  c("ingenieria-naval", "Ingeniería Naval", "electrica-mecanica"),
  c("ingenieria-aeronautica", "Ingeniería Aeronáutica", "electrica-mecanica", ["Ingeniería Aeroespacial", "Ingeniería Aeronáutica y Espacial"]),
  c("ingenieria-energia", "Ingeniería en Energía", "electrica-mecanica", ["Ingeniería de Energía", "Ingeniería en Energías Renovables", "Ingeniería de Energías Renovables", "Ingeniería Energética"]),
  c("ingenieria-automotriz", "Ingeniería Automotriz", "electrica-mecanica"),
  c("ingenieria-mecanica-fluidos", "Ingeniería Mecánica de Fluidos", "electrica-mecanica"),
  // Química, alimentaria y procesos
  c("ingenieria-quimica", "Ingeniería Química", "quimica-procesos", ["Ingeniería Química Industrial", "Ingeniería Química del Gas Natural y Energía", "Ingeniería Química Ambiental"]),
  c("ingenieria-industrias-alimentarias", "Ingeniería en Industrias Alimentarias", "quimica-procesos", ["Ingeniería de Industrias Alimentarias", "Industrias Alimentarias", "Ingeniería de Alimentos", "Ingeniería Alimentaria", "Ciencia y Tecnología de Alimentos", "Ingeniería en Ciencias Alimentarias"]),
  c("ingenieria-agroindustrial", "Ingeniería Agroindustrial", "quimica-procesos", ["Agroindustria", "Ingeniería Agroindustrial y Comercio Exterior", "Ingeniería en Agroindustria"]),
  c("ingenieria-pesquera", "Ingeniería Pesquera", "quimica-procesos", ["Ingeniería Pesquera Tecnológica", "Ingeniería en Industrias Pesqueras"]),
  c("ingenieria-textil", "Ingeniería Textil", "quimica-procesos", ["Ingeniería Textil y de Confecciones", "Ingeniería Textil y Confecciones"]),
  // Ciencias exactas y naturales
  c("matematica", "Matemática", "ciencias", ["Matemáticas", "Matemática Pura", "Matemática Aplicada", "Ciencias Matemáticas"]),
  c("fisica", "Física", "ciencias", ["Ciencias Físicas", "Física Aplicada"]),
  c("quimica", "Química", "ciencias", ["Ciencias Químicas"]),
  c("biologia", "Biología", "ciencias", ["Ciencias Biológicas", "Biología Ambiental", "Biólogo"]),
  c("biologia-marina", "Biología Marina", "ciencias", ["Biología Pesquera", "Oceanografía"]),
  c("microbiologia", "Microbiología y Parasitología", "ciencias", ["Microbiología"]),
  c("genetica-biotecnologia", "Genética y Biotecnología", "ciencias", ["Genética"]),
  c("biotecnologia", "Biotecnología", "ciencias", ["Ingeniería Biotecnológica", "Ingeniería en Biotecnología"]),
  c("estadistica", "Estadística", "ciencias", ["Ingeniería Estadística", "Ingeniería Estadística e Informática", "Estadística e Informática"]),
  c("computacion-cientifica", "Computación Científica", "ciencias"),
  c("investigacion-operativa", "Investigación Operativa", "ciencias"),
  c("ingenieria-fisica", "Ingeniería Física", "ciencias"),
  c("meteorologia", "Meteorología", "ciencias", ["Ingeniería Meteorológica", "Meteorología y Climatología"]),
  // Economía
  c("economia", "Economía", "economia", ["Economista", "Ciencias Económicas", "Economía y Finanzas", "Economía y Negocios Internacionales", "Economía Pública", "Economía Agraria", "Economía Internacional"]),
  c("ingenieria-economica", "Ingeniería Económica", "economia"),
  // Administración, negocios y marketing
  c("administracion", "Administración", "administracion", ["Administración de Empresas", "Ciencias Administrativas", "Administración y Gestión", "Gestión Empresarial", "Administración y Gestión Empresarial", "Administración de Negocios", "Administración y Emprendimiento", "Licenciado en Administración"]),
  c("negocios-internacionales", "Negocios Internacionales", "administracion", ["Administración de Negocios Internacionales", "Administración y Negocios Internacionales", "Comercio Exterior", "Comercio Internacional", "Comercio y Negocios Internacionales"]),
  c("marketing", "Marketing", "administracion", ["Administración y Marketing", "Mercadotecnia", "Marketing y Dirección de Empresas", "Marketing y Negocios Digitales"]),
  c("gestion-publica", "Gestión Pública", "administracion", ["Administración Pública", "Gestión Pública y Desarrollo Social"]),
  c("recursos-humanos", "Administración y Gestión del Talento Humano", "administracion", ["Gestión del Talento Humano", "Administración de Recursos Humanos", "Gestión de Recursos Humanos"]),
  c("agronegocios", "Agronegocios", "administracion", ["Gestión de Agronegocios", "Administración de Agronegocios", "Ingeniería en Agronegocios"]),
  c("ingenieria-comercial", "Ingeniería Comercial", "administracion"),
  // Contabilidad y finanzas
  c("contabilidad", "Contabilidad", "contabilidad", ["Ciencias Contables", "Contabilidad y Finanzas", "Ciencias Contables y Financieras", "Contador Público", "Contadora Pública", "Contabilidad y Auditoría", "Contabilidad Empresarial", "Contabilidad y Tributación"]),
  c("finanzas", "Finanzas", "contabilidad", ["Banca y Finanzas", "Finanzas y Banca", "Gestión Financiera", "Administración Financiera", "Banca y Seguros"]),
  // Comunicación y periodismo
  c("ciencias-comunicacion", "Ciencias de la Comunicación", "comunicacion", ["Comunicación", "Comunicación Social", "Comunicación y Periodismo", "Comunicador Social", "Ciencias de la Comunicación Social"]),
  c("periodismo", "Periodismo", "comunicacion", ["Periodismo y Comunicación Multimedia"]),
  c("comunicacion-audiovisual", "Comunicación Audiovisual", "comunicacion", ["Comunicación Audiovisual y Medios Interactivos", "Comunicación Audiovisual Multimedia", "Comunicación y Producción Audiovisual"]),
  c("publicidad", "Publicidad", "comunicacion", ["Comunicación y Publicidad", "Publicidad y Multimedia", "Comunicación Publicitaria", "Publicidad y Medios Digitales"]),
  c("relaciones-publicas", "Relaciones Públicas", "comunicacion", ["Comunicación Corporativa", "Comunicación Organizacional", "Comunicación e Imagen Empresarial", "Comunicación y Relaciones Públicas"]),
  c("comunicacion-desarrollo", "Comunicación para el Desarrollo", "comunicacion"),
  c("comunicacion-marketing", "Comunicación y Marketing", "comunicacion", ["Comunicación y Marketing Digital"]),
  // Ciencias sociales
  c("sociologia", "Sociología", "ciencias-sociales"),
  c("antropologia", "Antropología", "ciencias-sociales", ["Antropología Social", "Antropología Cultural"]),
  c("arqueologia", "Arqueología", "ciencias-sociales"),
  c("trabajo-social", "Trabajo Social", "ciencias-sociales", ["Servicio Social", "Trabajadora Social", "Trabajador Social"]),
  c("geografia", "Geografía", "ciencias-sociales", ["Ingeniería Geográfica", "Geografía y Medio Ambiente"]),
  c("ciencias-sociales", "Ciencias Sociales", "ciencias-sociales", ["Desarrollo Social", "Estudios Interculturales"]),
  // Humanidades
  c("historia", "Historia", "humanidades", ["Ciencias Históricas", "Historia y Gestión Cultural"]),
  c("filosofia", "Filosofía", "humanidades", ["Filosofía y Teología"]),
  c("literatura", "Literatura", "humanidades", ["Letras", "Lengua y Literatura", "Literatura y Lingüística", "Literatura Hispánica", "Letras y Ciencias Humanas"]),
  c("linguistica", "Lingüística", "humanidades", ["Lingüística Aplicada", "Lingüística Andina", "Lingüística y Literatura"]),
  c("traduccion", "Traducción e Interpretación", "humanidades", ["Traducción", "Traducción e Interpretación Profesional", "Lenguas Modernas", "Idiomas"]),
  c("teologia", "Teología", "humanidades", ["Ciencias Religiosas"]),
  c("bibliotecologia", "Bibliotecología y Ciencias de la Información", "humanidades", ["Bibliotecología", "Ciencias de la Información", "Archivística"]),
  c("humanidades", "Humanidades", "humanidades", ["Gestión Cultural", "Historia del Arte"]),
  // Arte, diseño y música
  c("artes-plasticas", "Artes Plásticas", "arte-diseno", ["Artes Plásticas y Visuales", "Artes Visuales", "Bellas Artes", "Pintura", "Escultura", "Grabado", "Arte"]),
  c("diseno-grafico", "Diseño Gráfico", "arte-diseno", ["Diseño Gráfico Publicitario", "Comunicación y Diseño Gráfico", "Diseño y Comunicación Visual", "Diseño Profesional Gráfico", "Diseño Gráfico y Multimedia"]),
  c("diseno-interiores", "Diseño de Interiores", "arte-diseno", ["Arquitectura de Interiores", "Diseño Profesional de Interiores", "Diseño de Interiores y Ambientes"]),
  c("diseno-modas", "Diseño de Modas", "arte-diseno", ["Diseño de Moda", "Diseño y Gestión en Moda", "Diseño de Indumentaria"]),
  c("diseno-industrial", "Diseño Industrial", "arte-diseno", ["Diseño de Producto", "Diseño de Productos"]),
  c("musica", "Música", "arte-diseno", ["Interpretación Musical", "Composición Musical", "Musicología", "Artista Profesional en Música", "Música y Tecnología"]),
  c("danza", "Danza", "arte-diseno", ["Danza Folclórica", "Artista Profesional en Danza"]),
  c("artes-escenicas", "Artes Escénicas", "arte-diseno", ["Teatro", "Actuación", "Arte Dramático"]),
  c("conservacion-restauracion", "Conservación y Restauración", "arte-diseno", ["Conservación y Restauración de Bienes Culturales"]),
  c("fotografia", "Fotografía", "arte-diseno", ["Fotografía Profesional"]),
  c("cine", "Cine", "arte-diseno", ["Cine y Audiovisuales", "Realización Cinematográfica", "Cinematografía"]),
  c("animacion-digital", "Animación Digital", "arte-diseno", ["Diseño y Desarrollo de Videojuegos", "Animación y Videojuegos", "Arte Digital"]),
  // Turismo, hotelería y gastronomía
  c("turismo", "Turismo", "turismo", ["Turismo y Hotelería", "Administración en Turismo y Hotelería", "Administración de Turismo", "Turismo, Hotelería y Gastronomía", "Administración Turística", "Turismo Sostenible y Hotelería"]),
  c("hoteleria", "Hotelería", "turismo", ["Administración Hotelera", "Hotelería y Administración", "Administración Hotelera y de Restaurantes"]),
  c("gastronomia", "Gastronomía", "turismo", ["Gastronomía y Gestión de Restaurantes", "Artes Culinarias", "Gastronomía y Arte Culinario", "Cocina Peruana"]),
  c("ecoturismo", "Ecoturismo", "turismo", ["Ingeniería en Ecoturismo"]),
  // Ciencias militares y policiales
  c("ciencias-militares", "Ciencias Militares", "militar-policial", ["Escuela Militar de Chorrillos"]),
  c("ciencias-navales", "Ciencias Navales", "militar-policial", ["Ciencias Marítimas Navales"]),
  c("ciencias-aeronauticas", "Ciencias Aeronáuticas", "militar-policial", ["Ciencias de la Aviación"]),
  c("ciencias-policiales", "Ciencias Administrativas y Policiales", "militar-policial", ["Ciencias Policiales", "Escuela de Oficiales de la PNP"]),
];

const CAREER_BY_ID = new Map(CAREERS.map((career) => [career.id, career]));

export function findCareer(id: unknown): Career | null {
  return typeof id === "string" ? (CAREER_BY_ID.get(id) ?? null) : null;
}

export function isFamilyId(id: unknown): id is FamilyId {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(FAMILIES, id);
}

/* ------------------------------------------------------------------------- */
/* Matching                                                                  */
/* ------------------------------------------------------------------------- */

export interface CareerMatch {
  /** Null when only the family is known (a postgraduate program, a faculty). */
  careerId: string | null;
  family: FamilyId;
  /** 0–1: 0.95 a program named as such, down to 0.5 for a keyword or a title. */
  confidence: number;
}

/** Lower case, no accents, words separated by single spaces. */
export function normalizeCareerText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, " ")
    .replace(/\bingenier[oa]s?\b/g, "ingenieria")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The phrases that open a segment of a cover. What follows "facultad de" is
 * the faculty — weaker evidence than the school or the title — and what
 * follows "mención en" qualifies the program before it.
 */
const PROGRAM_MARKERS = [
  "escuela academico profesional de",
  "escuela academica profesional de",
  "escuela profesional de",
  "escuela de formacion profesional de",
  "escuela de",
  "e a p de",
  "e a p",
  "eap de",
  "eap",
  "e p de",
  "e p",
  "programa de estudios de",
  "programa academico de",
  "programa profesional de",
  "programa de",
  "carrera profesional de",
  "carrera de",
  "para optar el titulo profesional de",
  "para optar el titulo de",
  "para optar el grado academico de",
  "para optar el grado de",
  "para obtener el titulo profesional de",
  "para obtener el titulo de",
  "titulo profesional de",
  "titulo de",
  "grado academico de",
  "bachiller en",
  "licenciado en",
  "licenciada en",
  "licenciatura en",
  "segunda especialidad en",
  "maestria en",
  "doctorado en",
  "magister en",
  "maestro en",
  "doctor en",
];
const FACULTY_MARKERS = ["facultad de", "facultad"];
const QUALIFIER_MARKERS = ["con mencion en", "mencion en", "mencion"];

type SegmentKind = "program" | "qualifier" | "faculty";

function segments(normalized: string): { text: string; kind: SegmentKind }[] {
  const markers = [
    ...PROGRAM_MARKERS.map((marker) => ({ marker, kind: "program" as const })),
    ...FACULTY_MARKERS.map((marker) => ({ marker, kind: "faculty" as const })),
    ...QUALIFIER_MARKERS.map((marker) => ({ marker, kind: "qualifier" as const })),
  ].sort((a, b) => b.marker.length - a.marker.length);
  const pattern = new RegExp(`\\b(${markers.map((entry) => entry.marker).join("|")})\\b`, "g");
  const out: { text: string; kind: SegmentKind }[] = [];
  let kind: SegmentKind = "program";
  let last = 0;
  for (const match of normalized.matchAll(pattern)) {
    out.push({ text: normalized.slice(last, match.index).trim(), kind });
    kind = markers.find((entry) => entry.marker === match[1])!.kind;
    last = match.index! + match[0].length;
  }
  out.push({ text: normalized.slice(last).trim(), kind });
  return out.filter((segment) => segment.text !== "");
}

/** Every catalogue phrase, normalised, longest first. */
const PHRASES: { phrase: string; career: Career }[] = CAREERS.flatMap((career) =>
  [career.name, ...career.synonyms].map((name) => ({ phrase: normalizeCareerText(name), career })),
).sort((a, b) => b.phrase.length - a.phrase.length);

const RANK: Record<SegmentKind, number> = { program: 2, qualifier: 1, faculty: 0 };

function containsWord(haystack: string, needle: string): number {
  const index = ` ${haystack} `.indexOf(` ${needle} `);
  return index;
}

function keywordFamily(normalized: string, field: "keywords" | "hints"): { family: FamilyId; score: number; runnerUp: number } | null {
  const scores = new Map<FamilyId, number>();
  const padded = ` ${normalized} `;
  for (const family of Object.values(FAMILIES)) {
    let score = 0;
    for (const stem of family[field]) {
      if (padded.includes(` ${stem.trim()}`)) score += 1;
    }
    if (score > 0) scores.set(family.id, score);
  }
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (!top) return null;
  return { family: top[0], score: top[1], runnerUp: sorted[1]?.[1] ?? 0 };
}

/**
 * The career a cover line names: "Escuela Profesional de Ingeniería Civil",
 * "FACULTAD DE CIENCIAS DE LA SALUD — E.P. DE ENFERMERÍA", "Título
 * profesional de Contador Público". Null when nothing in it points anywhere.
 */
export function matchCareer(text: string | null | undefined): CareerMatch | null {
  if (!text) return null;
  const normalized = normalizeCareerText(text);
  if (normalized === "") return null;

  let best: { career: Career; rank: number; starts: boolean; exact: boolean; length: number } | null = null;
  for (const segment of segments(normalized)) {
    for (const { phrase, career } of PHRASES) {
      const index = containsWord(segment.text, phrase);
      if (index < 0) continue;
      const candidate = {
        career,
        rank: RANK[segment.kind],
        starts: index === 0,
        exact: segment.text === phrase,
        length: phrase.length,
      };
      if (
        !best ||
        candidate.rank > best.rank ||
        (candidate.rank === best.rank && Number(candidate.starts) > Number(best.starts)) ||
        (candidate.rank === best.rank && candidate.starts === best.starts && candidate.length > best.length)
      ) {
        best = candidate;
      }
    }
  }
  if (best) {
    const confidence = best.rank === 0 ? 0.6 : best.exact ? 0.95 : best.starts ? 0.9 : 0.75;
    return { careerId: best.career.id, family: best.career.family, confidence };
  }

  const keyword = keywordFamily(normalized, "keywords");
  if (keyword && keyword.score > keyword.runnerUp) {
    return { careerId: null, family: keyword.family, confidence: 0.5 };
  }
  return null;
}

/* ------------------------------------------------------------------------- */
/* Resolution                                                                */
/* ------------------------------------------------------------------------- */

/** Below this, the generic panel is the safer guess. */
export const APPLY_THRESHOLD = 0.5;

export interface CareerResolution extends CareerMatch {
  careerName: string | null;
  familyName: string;
  /** Where it came from: the student's choice, the cover, the field, the title. */
  source: "override" | "cover" | "field" | "title";
}

function resolved(match: CareerMatch, source: CareerResolution["source"]): CareerResolution {
  return {
    ...match,
    careerName: match.careerId ? (CAREER_BY_ID.get(match.careerId)?.name ?? null) : null,
    familyName: FAMILIES[match.family].name,
    source,
  };
}

/**
 * The career a thesis belongs to, with no setup: the student's own choice
 * when they made one (a career id or a family id), else the cover, else the
 * field the analysis named, else the title's topic. Null when unsure — the
 * generic panel then sits, as before.
 */
export function resolveCareer(
  analysis: { career?: string | null; field?: string | null; title?: string | null },
  override?: string | null,
): CareerResolution | null {
  const chosen = findCareer(override);
  if (chosen) return resolved({ careerId: chosen.id, family: chosen.family, confidence: 1 }, "override");
  if (isFamilyId(override)) return resolved({ careerId: null, family: override, confidence: 1 }, "override");

  const cover = matchCareer(analysis.career);
  if (cover && cover.confidence >= APPLY_THRESHOLD) return resolved(cover, "cover");

  const field = matchCareer(analysis.field);
  if (field) {
    const confidence = Math.round(field.confidence * 0.9 * 100) / 100;
    if (confidence >= APPLY_THRESHOLD) return resolved({ ...field, confidence }, "field");
  }

  const topic = normalizeCareerText(`${analysis.title ?? ""} ${analysis.field ?? ""}`);
  const hinted = keywordFamily(topic, "hints");
  if (hinted && hinted.score >= 2 && (hinted.runnerUp === 0 || hinted.score >= hinted.runnerUp + 2)) {
    return resolved({ careerId: null, family: hinted.family, confidence: APPLY_THRESHOLD }, "title");
  }
  return null;
}

/* ------------------------------------------------------------------------- */
/* The panel                                                                 */
/* ------------------------------------------------------------------------- */

/** A juror the format calls "Dra." or "Profa." takes the feminine role. */
function isFeminine(name: string): boolean {
  return /^(Dra|Profa|Mg\.ª|Lic\.ª|Ing\.ª)\b/.test(name);
}

/**
 * The country's panel with the family's team in its seats: the names stay
 * the country's; the focus becomes the discipline's everywhere; the role on
 * the record becomes the discipline's in Peru, where the catalogue comes
 * from — elsewhere the institutional titles ("Avaliador externo", "Jurado
 * evaluador") are what the record carries. The family's vocabulary joins the
 * country's in Spanish formats.
 */
export function withFamily(format: DefenseFormat, family: FamilyId | null | undefined): DefenseFormat {
  if (!family || !isFamilyId(family)) return format;
  const team = FAMILIES[family].team;
  const seat = (tag: Seat): Juror => {
    const base = format.jurors[tag];
    const profile = team[tag];
    return {
      name: base.name,
      role: format.country === "PE" ? (isFeminine(base.name) ? profile.role.f : profile.role.m) : base.role,
      focus: profile.focus,
    };
  };
  return {
    ...format,
    jurors: { presidente: seat("presidente"), metodologo: seat("metodologo"), especialista: seat("especialista") },
    vocabulary: format.language === "es" ? `${format.vocabulary}, ${team.vocabulary}` : format.vocabulary,
  };
}

/** The career a defence was set up with, as the session keeps it. */
export interface DefenseCareer {
  id: string | null;
  name: string;
  family: FamilyId;
}

export function defenseCareer(resolution: CareerResolution | null): DefenseCareer | null {
  if (!resolution) return null;
  return { id: resolution.careerId, name: resolution.careerName ?? resolution.familyName, family: resolution.family };
}

/** The prompt's note on how this discipline does research. */
export function disciplineBlock(career: DefenseCareer): string {
  const family = FAMILIES[career.family];
  if (!family) return "";
  return `THE DISCIPLINE: This thesis comes from ${career.name} (${family.name}). ${family.team.paradigms} The ground a jury in this field usually covers: ${family.team.themes}. Judge the method by this discipline's standards: never demand statistics, hypotheses or a sample from a thesis whose design does not call for them — ask instead whether the method it chose was done well.`;
}

/** The evaluator's version of the same note. */
export function disciplineBar(career: DefenseCareer | null | undefined): string {
  if (!career || !isFamilyId(career.family)) return "";
  return ` The thesis is from ${career.name} (${FAMILIES[career.family].name}); grade its methodology by that field's standards: ${FAMILIES[career.family].team.paradigms}`;
}

/** What the browser needs to offer another career: names and the seats' roles. */
export function publicCareerCatalogue() {
  return {
    families: Object.values(FAMILIES).map((family) => ({
      id: family.id,
      name: family.name,
      roles: {
        presidente: family.team.presidente.role,
        metodologo: family.team.metodologo.role,
        especialista: family.team.especialista.role,
      },
    })),
    careers: CAREERS.map((career) => ({ id: career.id, name: career.name, family: career.family })),
  };
}
