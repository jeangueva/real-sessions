import { useLocale } from "@/hooks/useLocale";

/**
 * The words of the defence simulator, in the three languages it is sold in.
 *
 * Kept out of the 14-language dictionary on purpose. Sustentación is built
 * for Spanish- and Portuguese-speaking universities, with English for
 * international programmes; translating every screen into Thai and Hebrew
 * would be fourteen times the copy for readers who do not defend a thesis in
 * those formats. Any other interface language reads these screens in English.
 */
const ES = {
  title: "Mi tesis",
  meta: "Súbela una vez. El jurado la lee antes de cada ensayo.",
  uploadTitle: "Sube tu tesis",
  uploadBody:
    "PDF o Word, hasta 300 páginas. La leemos página por página y te mostramos por dónde te va a atacar el jurado.",
  uploadCta: "Elegir archivo",
  uploading: "Leyendo tu tesis… puede tardar hasta dos minutos.",
  privacy:
    "Tu tesis es confidencial: solo se usa para tus ensayos, nunca para entrenar modelos, y la borras con un clic.",
  replace: "Subir otra versión",
  delete: "Borrar mi tesis",
  deleted: "Borrada. No queda ninguna copia.",
  pages: "{count} páginas",
  approx: "páginas aproximadas (Word)",
  page: "p. {page}",
  risksTitle: "Por aquí te van a atacar",
  risksBody: "Los puntos débiles que un jurado vería primero, del más grave al más leve.",
  severityAlta: "Grave",
  severityMedia: "Te costará puntos",
  severityBaja: "De forma",
  likely: "Pregunta probable",
  matrixTitle: "Matriz de consistencia",
  matrixBody: "Cada objetivo, con la hipótesis, el resultado y la conclusión que le corresponden.",
  objective: "Objetivo",
  hypothesis: "Hipótesis",
  result: "Resultado",
  conclusion: "Conclusión",
  none: "No hay",
  statusCoherente: "Coherente",
  statusDebil: "Débil",
  statusIncoherente: "Incoherente",
  fichaTitle: "Ficha de tu tesis",
  problem: "Problema",
  generalObjective: "Objetivo general",
  specificObjectives: "Objetivos específicos",
  hypotheses: "Hipótesis",
  variables: "Variables",
  design: "Diseño",
  sample: "Población y muestra",
  instruments: "Instrumentos",
  results: "Resultados principales",
  conclusions: "Conclusiones",
  chapters: "Capítulos",
  rehearse: "Ensayar mi sustentación",
  disclaimer:
    "Mockio es una herramienta de práctica. La IA puede equivocarse: verifica con tu asesor y con el reglamento de tu universidad.",
  error: "Algo salió mal. Inténtalo de nuevo.",
};

type Key = keyof typeof ES;

const PT: Record<Key, string> = {
  title: "Minha tese",
  meta: "Envie uma vez. A banca lê antes de cada ensaio.",
  uploadTitle: "Envie seu trabalho",
  uploadBody:
    "PDF ou Word, até 300 páginas. Lemos página por página e mostramos onde a banca vai pressionar.",
  uploadCta: "Escolher arquivo",
  uploading: "Lendo seu trabalho… pode levar até dois minutos.",
  privacy:
    "Seu trabalho é confidencial: usado só nos seus ensaios, nunca para treinar modelos, e você apaga com um clique.",
  replace: "Enviar outra versão",
  delete: "Apagar meu trabalho",
  deleted: "Apagado. Não ficou nenhuma cópia.",
  pages: "{count} páginas",
  approx: "páginas aproximadas (Word)",
  page: "p. {page}",
  risksTitle: "Por aqui a banca vai pressionar",
  risksBody: "Os pontos fracos que uma banca veria primeiro, do mais grave ao mais leve.",
  severityAlta: "Grave",
  severityMedia: "Vai custar nota",
  severityBaja: "De forma",
  likely: "Pergunta provável",
  matrixTitle: "Matriz de consistência",
  matrixBody: "Cada objetivo, com a hipótese, o resultado e a conclusão correspondentes.",
  objective: "Objetivo",
  hypothesis: "Hipótese",
  result: "Resultado",
  conclusion: "Conclusão",
  none: "Não há",
  statusCoherente: "Coerente",
  statusDebil: "Fraco",
  statusIncoherente: "Incoerente",
  fichaTitle: "Ficha do seu trabalho",
  problem: "Problema",
  generalObjective: "Objetivo geral",
  specificObjectives: "Objetivos específicos",
  hypotheses: "Hipóteses",
  variables: "Variáveis",
  design: "Delineamento",
  sample: "População e amostra",
  instruments: "Instrumentos",
  results: "Resultados principais",
  conclusions: "Conclusões",
  chapters: "Capítulos",
  rehearse: "Ensaiar minha defesa",
  disclaimer:
    "O Mockio é uma ferramenta de prática. A IA pode errar: confirme com seu orientador e com o regulamento da sua universidade.",
  error: "Algo deu errado. Tente de novo.",
};

const EN: Record<Key, string> = {
  title: "My thesis",
  meta: "Upload it once. The panel reads it before every rehearsal.",
  uploadTitle: "Upload your thesis",
  uploadBody:
    "PDF or Word, up to 300 pages. We read it page by page and show you where the panel will press.",
  uploadCta: "Choose file",
  uploading: "Reading your thesis… this can take up to two minutes.",
  privacy:
    "Your thesis is confidential: used only for your rehearsals, never to train models, and deleted with one click.",
  replace: "Upload another version",
  delete: "Delete my thesis",
  deleted: "Deleted. No copy is left.",
  pages: "{count} pages",
  approx: "approximate pages (Word)",
  page: "p. {page}",
  risksTitle: "Where the panel will press",
  risksBody: "The weak points a panel would see first, most serious first.",
  severityAlta: "Serious",
  severityMedia: "Will cost marks",
  severityBaja: "Form",
  likely: "Likely question",
  matrixTitle: "Consistency matrix",
  matrixBody: "Each objective, with the hypothesis, result and conclusion that go with it.",
  objective: "Objective",
  hypothesis: "Hypothesis",
  result: "Result",
  conclusion: "Conclusion",
  none: "None",
  statusCoherente: "Consistent",
  statusDebil: "Weak",
  statusIncoherente: "Inconsistent",
  fichaTitle: "Your thesis at a glance",
  problem: "Problem",
  generalObjective: "General objective",
  specificObjectives: "Specific objectives",
  hypotheses: "Hypotheses",
  variables: "Variables",
  design: "Design",
  sample: "Population and sample",
  instruments: "Instruments",
  results: "Main results",
  conclusions: "Conclusions",
  chapters: "Chapters",
  rehearse: "Rehearse my defence",
  disclaimer:
    "Mockio is a practice tool. AI can be wrong: check with your advisor and your university's regulations.",
  error: "Something went wrong. Try again.",
};

const BY_LOCALE: Record<string, Record<Key, string>> = { es: ES, pt: PT, en: EN };

export function useThesisT() {
  const { locale } = useLocale();
  const dictionary = BY_LOCALE[locale] ?? EN;
  return (key: Key, values?: Record<string, string | number>) =>
    dictionary[key].replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? ""));
}
