import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import BlurText from "@/components/bits/BlurText";
import Magnet from "@/components/bits/Magnet";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { Action, FadeRise, HeroVideo } from "@/design-system";
import { LandingNav } from "./LandingNav";
import { LandingDashboard, LandingDegrees, LandingRoute } from "./LandingDashboard";
import { SiteFooter } from "./SiteFooter";
import { useLocale } from "@/hooks/useLocale";
import { scrollToSection } from "@/lib/scroll-to-section";
import { savePendingThesis } from "@/lib/pending-thesis";
import { Chip, Inset, Lede, MonoLabel, Screen, Title, Widget, Wrap } from "./marketing";

/** The same footage as the interview landing; `VITE_HERO_VIDEO` overrides both. */
const HERO_VIDEO = import.meta.env.VITE_HERO_VIDEO ?? "/hero-2.mp4";
const HERO_POSTER = "/hero-2.jpg";

/**
 * The front page for Sustentación, laid out the way product pages that sell
 * a thing rather than a promise are: Apple's one idea per screen, Stripe's
 * product shown as its own interface, Uber's black band for the one claim
 * that has to land, Airbnb's warmth in the details.
 *
 * What it does not do is the layout every generated page shares — a centred
 * eyebrow, a centred headline and a grid of icon cards, again and again. The
 * type is left-aligned and editorial, each section has its own shape, and
 * where there was a card describing a feature there is now the feature: the
 * call, the record, the diagnosis, the plan, drawn as the product draws them.
 *
 * Its own copy in Spanish, Portuguese and English, like the rest of the
 * defence screens; any other interface language reads the English.
 */
const ES = {
  lblProduct: "El producto",
  lblCall: "La videollamada",
  lblHow: "Cómo funciona",
  lblDiag: "Diagnóstico",
  lblJury: "Tu jurado",
  lblPlan: "Tu plan",
  lblMore: "Además",
  lblScenarios: "Escenarios",
  lblPrivacy: "Privacidad",
  lblPricing: "Precios",
  docTitle: "Mockio — Ensaya tu sustentación de tesis con un jurado de 3",
  navProduct: "El jurado",
  navHow: "Cómo funciona",
  navScenarios: "Grados",
  navPricing: "Precios",
  cta: "Sube tu tesis gratis",
  ctaHint: "PDF, Word o foto. Tu diagnóstico, apenas creas tu cuenta.",
  heroTitle: "Sustenta antes de sustentar.",
  heroSub: "Un jurado de 3 que leyó tu tesis te pregunta por voz, repregunta como el de verdad y te deja un acta de 0 a 20.",
  heroSecondary: "Cómo funciona",
  heroNote: "1 videollamada con el jurado gratis a la semana · sin tarjeta",
  countries: "Con el formato de jurado de",
  prodTitle: "Un jurado que leyó tu tesis. Completa.",
  prodBody: "Hasta 300 páginas, escaneadas o no. Cada pregunta sale de una página que puedes abrir, y cada repregunta, de lo que acabas de responder.",
  prod1: "Presidente, metodólogo y especialista según tu carrera, cada uno con su voz",
  prod2: "Videollamada individual o grupal, con preguntas que citan tu página",
  prod3: "Deliberación y acta con la escala de tu país",
  mockLive: "En vivo",
  mockJuror1: "Dr. Ramírez · Presidente del jurado",
  mockQuestion1: "En la página 18 plantea tres objetivos específicos, pero en las conclusiones solo responde a dos. ¿Qué ocurrió con el tercero?",
  mockAnswer1: "El tercer objetivo se aborda en la conclusión 2 junto con el análisis de costos de la tabla 9…",
  mockJuror: "Dra. Vidal · Metodóloga",
  mockQuestion: "En la página 41 aplica Pearson. ¿Verificó antes la normalidad de sus datos? No encuentro esa prueba en su tesis.",
  mockYou: "Tú",
  mockAnswer: "Sí, apliqué Kolmogorov-Smirnov; está en el anexo 4, pero no lo cité en el capítulo…",
  mockJuror3: "Dr. Paredes · Especialista",
  mockQuestion3: "En la discusión (p. 54) afirma que su propuesta reduce tiempos en 30%, pero no controla por estacionalidad. ¿Cómo lo sustenta?",
  mockAnswer3: "Comparamos el mismo trimestre contra el año base en la página 48 para aislar el factor estacional…",
  mockActa: "Acta simulada",
  mockVerdict: "Aprobado por mayoría",
  juror1: "Presidente",
  juror2: "Metodóloga",
  juror3: "Especialista",
  howTitle: "De tu PDF a tu acta en una tarde.",
  step1Title: "Sube tu tesis",
  step1Body: "PDF, Word o fotos de las páginas. En un minuto ves por dónde te va a atacar el jurado.",
  step2Title: "Sustenta por voz",
  step2Body: "Expones con tu tiempo real y respondes a tres jurados que se pasan la palabra.",
  step3Title: "Recibe el acta",
  step3Body: "Tu nota, lo que opinó cada jurado y la respuesta que deberías dar la próxima vez.",
  diagTitle: "Sabes qué te van a preguntar antes de entrar.",
  diagBody: "El diagnóstico lee tu tesis como un jurado: los puntos débiles por gravedad, la página de cada uno y la pregunta que viene. Gratis, desde que la subes.",
  diagMock: "Por dónde te van a preguntar",
  risk1: "Concluye causalidad con un diseño correlacional",
  risk2: "Pearson sin prueba de normalidad",
  risk3: "Muestra por conveniencia presentada como representativa",
  sevHigh: "Alta",
  sevMed: "Media",
  matrixLine: "Matriz de consistencia: 2 de 5 objetivos no cuadran con sus conclusiones",
  juryTitle: "El jurado de tu carrera. O el tuyo con nombre y apellido.",
  juryBody: "Desde el primer minuto tienes un jurado armado para tu carrera (Derecho, Medicina, Ingeniería, Administración y más). Y si ya sabes quiénes te van a evaluar, puedes poner sus nombres opcionalmente.",
  juryMockTitle: "Jurado por carrera + tus docentes reales (opcional)",
  jury1: "Dr. Huamán",
  jury1Field: "Gestión pública",
  jury2: "Dra. Rojas",
  jury2Field: "Estadística aplicada",
  jury2Note: "Siempre pregunta por el tamaño de muestra",
  jury3: "Mg. Quispe",
  jury3Field: "Marketing digital",
  planTitle: "Un plan hasta el día D.",
  planBody: "Pon la fecha y cada día tiene una tarea: el primer ensayo completo, tus puntos débiles uno por uno, el ensayo exigente, y la mañana de la sustentación, solo el calentamiento.",
  planMock: "Faltan 9 días",
  plan1: "Lee tu diagnóstico y marca 3 riesgos",
  plan2: "Primer ensayo completo, nivel estándar",
  plan3: "Prepara tu respuesta sobre la página 34",
  plan4: "Ensayo en modo exigente",
  planToday: "Hoy",
  moreTitle: "Y todo lo que viene antes y después.",
  more1Title: "Diapositivas",
  more1Body: "Revisadas contra tu tesis y contra el reloj.",
  more2Title: "Preguntas reales",
  more2Body: "Las que hicieron los jurados de tu universidad.",
  more3Title: "Tu ensayo en video",
  more3Body: "Grabado solo en tu dispositivo, pregunta por pregunta.",
  more4Title: "Observaciones",
  more4Body: "Cada una ubicada en su página, con qué hacer.",
  scenTitle: "Del plan de tesis al doctorado.",
  scenSub: "Cada grado tiene su jurado. El panel ajusta la profundidad, el tiempo de exposición y la exigencia de la nota.",
  scenMeta: "{minutes} min · {questions} preguntas",
  sc_proyecto: "Plan de tesis",
  sc_bachiller: "Bachiller",
  sc_titulo: "Título profesional",
  sc_suficiencia: "Suficiencia profesional",
  sc_maestria: "Maestría",
  sc_doctorado: "Doctorado",
  levelsTitle: "Y el jurado que elijas.",
  lv1: "Calentamiento",
  lv2: "Estándar",
  lv3: "Exigente",
  lv4: "Hostil",
  privacyTitle: "Tu tesis es tuya.",
  privacy1: "Solo se usa para tus ensayos.",
  privacy2: "Nunca entrena ningún modelo.",
  privacy3: "La borras con un clic.",
  privacyNote: "Mockio no escribe tu tesis ni te sopla respuestas en la sustentación real: te ayuda a llegar preparado.",
  pricingTitle: "Menos que una hora de asesoría.",
  pricingSub: "Pago único, sin suscripción. Empieza gratis.",
  freeName: "Gratis",
  freePrice: "S/ 0",
  freeUnit: "1 a la semana",
  free1: "1 videollamada semanal con el jurado de 3 (1:1 o grupal)",
  free2: "Jurado según tu carrera + diagnóstico de tu tesis",
  free3: "Sin tarjeta",
  freeCta: "Empezar gratis",
  packName: "Pack Sustentación",
  packPrice: "S/ 39",
  packUnit: "pago único",
  packBadge: "Recomendado",
  pack1: "5 sustentaciones con el panel de 3",
  pack2: "Tu jurado real y preguntas de tu universidad",
  pack3: "Acta, deliberación y respuestas sugeridas",
  pack4: "Levantar observaciones · 6 meses",
  packCta: "Elegir el Pack",
  intName: "Pase Intensivo",
  intPrice: "S/ 79",
  intUnit: "30 días",
  int1: "20 sustentaciones con el panel de 3",
  int2: "Todos los modos: autoría, preguntas trampa, coach estadístico",
  int3: "Presencial o virtual, para el último mes",
  intCta: "Elegir el Intensivo",
  passes: "Tesis grupal S/ 119: lo del Intensivo para 2 o 3 integrantes, con el ensayo en grupo.",
  giftLine: "¿Te lo regalan? Desde tu cuenta creas un enlace para que tu familia pague tu plan.",
  legal: "Mockio es una herramienta de práctica: no garantiza la aprobación, que es decisión de tu jurado. La IA puede equivocarse; verifica con tu asesor y el reglamento de tu universidad.",
  advisorTitle: "Programa de afiliados",
  advisorBody: "Asesores, docentes, creadores y academias: comparte tu enlace y gana el 30% de cada compra de los estudiantes que lleguen por ti.",
  advisorCta: "Conocer el programa",
  institutionTitle: "Para universidades e institutos",
  institutionBody: "Mockio dentro de tu Moodle, Canvas o Blackboard: tus alumnos entran con un clic y la nota vuelve al aula virtual.",
  institutionCta: "Ver la integración",
  navInstitutions: "Instituciones",
  ladderTitle: "Después de sustentar",
  ladderBody: "Entrevistas de trabajo y tus primeras reuniones, en español o en inglés.",
  ladderCta: "Practicar entrevistas",
  finalTitle: "Llega a tu sustentación habiendo sustentado.",
  finalSub: "Sube tu tesis y en un minuto sabes qué te van a preguntar.",
};

type Key = keyof typeof ES;

const PT: Record<Key, string> = {
  lblProduct: "O produto",
  lblCall: "A videochamada",
  lblHow: "Como funciona",
  lblDiag: "Diagnóstico",
  lblJury: "Sua banca",
  lblPlan: "Seu plano",
  lblMore: "Além disso",
  lblScenarios: "Cenários",
  lblPrivacy: "Privacidade",
  lblPricing: "Preços",
  docTitle: "Mockio — Ensaie sua defesa com uma banca de 3",
  navProduct: "A banca",
  navHow: "Como funciona",
  navScenarios: "Níveis",
  navPricing: "Preços",
  cta: "Envie seu trabalho grátis",
  ctaHint: "PDF, Word ou foto. Seu diagnóstico, assim que criar sua conta.",
  heroTitle: "Defenda antes de defender.",
  heroSub: "Uma banca de 3 que leu seu trabalho pergunta por voz, faz réplicas como a de verdade e deixa uma ata com sua nota.",
  heroSecondary: "Como funciona",
  heroNote: "1 videochamada com a banca grátis por semana · sem cartão",
  countries: "Com o formato de banca de",
  prodTitle: "Uma banca que leu seu trabalho. Inteiro.",
  prodBody: "Até 300 páginas, digitalizadas ou não. Cada pergunta vem de uma página que você pode abrir, e cada réplica, do que você acabou de responder.",
  prod1: "Presidente, metodólogo e especialista predefinidos por área, cada um com sua voz",
  prod2: "Videochamada individual ou em grupo, com perguntas que citam sua página",
  prod3: "Deliberação e ata na escala do seu país",
  mockLive: "Ao vivo",
  mockJuror1: "Prof. Dr. Almeida · Presidente da banca",
  mockQuestion1: "Na página 18 você propõe três objetivos específicos, mas nas conclusões responde apenas a dois. O que houve com o terceiro?",
  mockAnswer1: "O terceiro objetivo é tratado na conclusão 2 junto com a análise de custos da tabela 9…",
  mockJuror: "Profa. Vidal · Metodóloga",
  mockQuestion: "Na página 41 você aplica Pearson. Verificou antes a normalidade dos dados? Não encontro esse teste no trabalho.",
  mockYou: "Você",
  mockAnswer: "Sim, apliquei Kolmogorov-Smirnov; está no anexo 4, mas não citei no capítulo…",
  mockJuror3: "Prof. Dr. Mendes · Especialista",
  mockQuestion3: "Na discussão (p. 54) você afirma que a proposta reduz prazos em 30%, mas não controla a sazonalidade. Como sustenta isso?",
  mockAnswer3: "Comparamos o mesmo trimestre com o ano-base na página 48 para isolar a sazonalidade…",
  mockActa: "Ata simulada",
  mockVerdict: "Aprovado por maioria",
  juror1: "Presidente",
  juror2: "Metodóloga",
  juror3: "Especialista",
  howTitle: "Do seu PDF à sua ata em uma tarde.",
  step1Title: "Envie seu trabalho",
  step1Body: "PDF, Word ou fotos das páginas. Em um minuto você vê onde a banca vai pressionar.",
  step2Title: "Defenda por voz",
  step2Body: "Você apresenta no tempo real e responde a três avaliadores que passam a palavra.",
  step3Title: "Receba a ata",
  step3Body: "Sua nota, o que cada avaliador achou e a resposta que você deveria dar da próxima vez.",
  diagTitle: "Você sabe o que vão perguntar antes de entrar.",
  diagBody: "O diagnóstico lê seu trabalho como uma banca: os pontos fracos por gravidade, a página de cada um e a pergunta que vem. Grátis, assim que você envia.",
  diagMock: "Onde a banca vai pressionar",
  risk1: "Conclui causalidade com um delineamento correlacional",
  risk2: "Pearson sem teste de normalidade",
  risk3: "Amostra por conveniência apresentada como representativa",
  sevHigh: "Alta",
  sevMed: "Média",
  matrixLine: "Matriz de consistência: 2 de 5 objetivos não fecham com as conclusões",
  juryTitle: "Bancas predefinidas por curso. Ou a sua com nome e sobrenome.",
  juryBody: "Desde o primeiro minuto você tem uma banca configurada para o seu curso. E se já souber quem estará na sua banca, pode personalizá-los opcionalmente.",
  juryMockTitle: "Banca por área + personalização opcional",
  jury1: "Prof. Dr. Almeida",
  jury1Field: "Gestão pública",
  jury2: "Profa. Dra. Lima",
  jury2Field: "Estatística aplicada",
  jury2Note: "Sempre pergunta pelo tamanho da amostra",
  jury3: "Prof. Me. Souza",
  jury3Field: "Marketing digital",
  planTitle: "Um plano até o dia D.",
  planBody: "Informe a data e cada dia tem uma tarefa: o primeiro ensaio completo, seus pontos fracos um a um, o ensaio exigente e, na manhã da defesa, só o aquecimento.",
  planMock: "Faltam 9 dias",
  plan1: "Leia seu diagnóstico e marque 3 riscos",
  plan2: "Primeiro ensaio completo, nível padrão",
  plan3: "Prepare sua resposta sobre a página 34",
  plan4: "Ensaio no modo exigente",
  planToday: "Hoje",
  moreTitle: "E tudo o que vem antes e depois.",
  more1Title: "Slides",
  more1Body: "Revisados contra o trabalho e contra o relógio.",
  more2Title: "Perguntas reais",
  more2Body: "As que as bancas da sua universidade fizeram.",
  more3Title: "Seu ensaio em vídeo",
  more3Body: "Gravado só no seu dispositivo, pergunta por pergunta.",
  more4Title: "Observações",
  more4Body: "Cada uma na sua página, com o que fazer.",
  scenTitle: "Do projeto ao doutorado.",
  scenSub: "Cada nível tem sua banca. Ela ajusta a profundidade, o tempo de apresentação e o rigor da nota.",
  scenMeta: "{minutes} min · {questions} perguntas",
  sc_proyecto: "Projeto de pesquisa",
  sc_bachiller: "TCC",
  sc_titulo: "Graduação",
  sc_suficiencia: "Relatório profissional",
  sc_maestria: "Mestrado",
  sc_doctorado: "Doutorado",
  levelsTitle: "E a banca que você escolher.",
  lv1: "Aquecimento",
  lv2: "Padrão",
  lv3: "Exigente",
  lv4: "Hostil",
  privacyTitle: "Seu trabalho é seu.",
  privacy1: "Usado só nos seus ensaios.",
  privacy2: "Nunca treina nenhum modelo.",
  privacy3: "Você apaga com um clique.",
  privacyNote: "O Mockio não escreve seu trabalho nem sopra respostas na defesa real: ajuda você a chegar preparado.",
  pricingTitle: "Menos que uma hora de orientação.",
  pricingSub: "Pagamento único, sem assinatura. Comece grátis.",
  freeName: "Grátis",
  freePrice: "US$ 0",
  freeUnit: "1 por semana",
  free1: "1 videochamada semanal com a banca de 3 (1:1 ou em grupo)",
  free2: "Bancas predefinidas por curso + diagnóstico do trabalho",
  free3: "Sem cartão",
  freeCta: "Começar grátis",
  packName: "Pacote Defesa",
  packPrice: "US$ 11",
  packUnit: "pagamento único",
  packBadge: "Recomendado",
  pack1: "5 defesas com a banca de 3",
  pack2: "Sua banca real e perguntas da sua universidade",
  pack3: "Ata, deliberação e respostas sugeridas",
  pack4: "Responder às observações · 6 meses",
  packCta: "Escolher o Pacote",
  intName: "Passe Intensivo",
  intPrice: "US$ 23",
  intUnit: "30 dias",
  int1: "20 defesas com a banca de 3",
  int2: "Todos os modos: autoria, perguntas armadilha, coach estatístico",
  int3: "Presencial ou virtual, para o último mês",
  intCta: "Escolher o Intensivo",
  passes: "Trabalho em grupo US$ 35: o Intensivo para 2 ou 3 integrantes, com o ensaio em grupo.",
  giftLine: "Alguém vai te dar de presente? Na sua conta você cria um link para a família pagar seu plano.",
  legal: "O Mockio é uma ferramenta de prática: não garante a aprovação, que é decisão da sua banca. A IA pode errar; confirme com seu orientador e o regulamento da sua universidade.",
  advisorTitle: "Programa de afiliados",
  advisorBody: "Orientadores, professores, criadores e cursinhos: compartilhe seu link e ganhe 30% de cada compra dos estudantes que chegarem por você.",
  advisorCta: "Conhecer o programa",
  institutionTitle: "Para universidades e faculdades",
  institutionBody: "O Mockio dentro do seu Moodle, Canvas ou Blackboard: os alunos entram com um clique e a nota volta ao ambiente virtual.",
  institutionCta: "Ver a integração",
  navInstitutions: "Instituições",
  ladderTitle: "Depois da defesa",
  ladderBody: "Entrevistas de emprego e suas primeiras reuniões, em português ou em inglês.",
  ladderCta: "Praticar entrevistas",
  finalTitle: "Chegue à sua defesa já tendo defendido.",
  finalSub: "Envie seu trabalho e em um minuto você sabe o que vão perguntar.",
};

const EN: Record<Key, string> = {
  lblProduct: "The product",
  lblCall: "The video call",
  lblHow: "How it works",
  lblDiag: "Diagnosis",
  lblJury: "Your panel",
  lblPlan: "Your plan",
  lblMore: "And more",
  lblScenarios: "Scenarios",
  lblPrivacy: "Privacy",
  lblPricing: "Pricing",
  docTitle: "Mockio — Rehearse your thesis defence with a panel of three",
  navProduct: "The panel",
  navHow: "How it works",
  navScenarios: "Degrees",
  navPricing: "Pricing",
  cta: "Upload your thesis free",
  ctaHint: "PDF, Word or a photo. Your diagnosis, as soon as you have an account.",
  heroTitle: "Defend it before you defend it.",
  heroSub: "A panel of three that read your thesis questions you out loud, follows up like the real one and leaves you a graded record.",
  heroSecondary: "How it works",
  heroNote: "1 free video call with the jury per week · no card",
  countries: "With the panel format of",
  prodTitle: "A panel that read your thesis. All of it.",
  prodBody: "Up to 300 pages, scanned or not. Every question comes from a page you can open, and every follow-up from what you just said.",
  prod1: "Preset chair, methodologist and specialist by field, each with their own voice",
  prod2: "1:1 or group video call, with questions that cite your page",
  prod3: "Deliberation and a record on your country's scale",
  mockLive: "Live",
  mockJuror1: "Dr Ramírez · Chair of the panel",
  mockQuestion1: "On page 18 you set out three specific objectives, but your conclusions only answer two. What happened to the third?",
  mockAnswer1: "The third objective is addressed in conclusion 2 alongside the cost breakdown in table 9…",
  mockJuror: "Dr Vidal · Methodologist",
  mockQuestion: "On page 41 you use Pearson. Did you check the data were normal first? I can't find that test in your thesis.",
  mockYou: "You",
  mockAnswer: "Yes, I ran Kolmogorov-Smirnov; it's in appendix 4, but I didn't cite it in the chapter…",
  mockJuror3: "Dr Paredes · Specialist",
  mockQuestion3: "In the discussion (p. 54) you claim a 30% time reduction, without controlling for seasonality. How do you defend that?",
  mockAnswer3: "We compared the same quarter against the baseline year on page 48 to isolate seasonality…",
  mockActa: "Sample record",
  mockVerdict: "Passed by majority",
  juror1: "Chair",
  juror2: "Methodologist",
  juror3: "Specialist",
  howTitle: "From your PDF to your record in an afternoon.",
  step1Title: "Upload your thesis",
  step1Body: "PDF, Word or photos of the pages. In a minute you see where the panel will press.",
  step2Title: "Defend it out loud",
  step2Body: "Present to your real time slot and answer three examiners who pass the floor.",
  step3Title: "Get the record",
  step3Body: "Your grade, what each examiner thought, and the answer to give next time.",
  diagTitle: "Know what they'll ask before you walk in.",
  diagBody: "The diagnosis reads your thesis the way a panel does: weak points by severity, the page of each, and the question that follows. Free, the moment you upload.",
  diagMock: "Where they will press",
  risk1: "Claims causation from a correlational design",
  risk2: "Pearson without a normality test",
  risk3: "Convenience sample presented as representative",
  sevHigh: "High",
  sevMed: "Medium",
  matrixLine: "Consistency matrix: 2 of 5 aims don't match their conclusions",
  juryTitle: "Preset panels by degree. Or your own examiners by name.",
  juryBody: "From the start you get a panel tailored to your discipline (Law, Medicine, Engineering, Business and more). And if you already know who will examine you, you can optionally customise them.",
  juryMockTitle: "Preset by field + optional customisation",
  jury1: "Prof. Hughes",
  jury1Field: "Public management",
  jury2: "Dr Rojas",
  jury2Field: "Applied statistics",
  jury2Note: "Always asks about sample size",
  jury3: "Dr Patel",
  jury3Field: "Digital marketing",
  planTitle: "A plan to D-day.",
  planBody: "Set the date and every day has one task: the first full rehearsal, your weak points one by one, the demanding rehearsal, and on the morning itself, only the warm-up.",
  planMock: "9 days to go",
  plan1: "Read your diagnosis and mark 3 risks",
  plan2: "First full rehearsal, standard level",
  plan3: "Prepare your answer about page 34",
  plan4: "Rehearse on demanding",
  planToday: "Today",
  moreTitle: "And everything before and after.",
  more1Title: "Slides",
  more1Body: "Checked against your thesis and the clock.",
  more2Title: "Real questions",
  more2Body: "The ones your university's panels asked.",
  more3Title: "Your rehearsal on video",
  more3Body: "Recorded on your device only, question by question.",
  more4Title: "Observations",
  more4Body: "Each one placed on its page, with what to do.",
  scenTitle: "From the proposal to the doctorate.",
  scenSub: "Every degree has its own panel. It adjusts the depth, the presentation time and how strictly it grades.",
  scenMeta: "{minutes} min · {questions} questions",
  sc_proyecto: "Thesis proposal",
  sc_bachiller: "Bachelor's",
  sc_titulo: "Undergraduate thesis",
  sc_suficiencia: "Professional report",
  sc_maestria: "Master's",
  sc_doctorado: "Doctorate",
  levelsTitle: "And the panel you choose.",
  lv1: "Warm-up",
  lv2: "Standard",
  lv3: "Demanding",
  lv4: "Hostile",
  privacyTitle: "Your thesis is yours.",
  privacy1: "Used only for your rehearsals.",
  privacy2: "Never trains any model.",
  privacy3: "Deleted with one click.",
  privacyNote: "Mockio does not write your thesis or feed you answers in the real defence: it helps you arrive prepared.",
  pricingTitle: "Less than an hour with a tutor.",
  pricingSub: "One payment, no subscription. Start free.",
  freeName: "Free",
  freePrice: "US$ 0",
  freeUnit: "1 per week",
  free1: "1 weekly video call with the panel of 3 (1:1 or group)",
  free2: "Preset juries by field + full diagnosis of your thesis",
  free3: "No card",
  freeCta: "Start free",
  packName: "Defence Pack",
  packPrice: "US$ 11",
  packUnit: "one payment",
  packBadge: "Recommended",
  pack1: "5 defences with the panel of three",
  pack2: "Your real panel and your university's questions",
  pack3: "Record, deliberation and suggested answers",
  pack4: "Address observations · 6 months",
  packCta: "Choose the Pack",
  intName: "Intensive Pass",
  intPrice: "US$ 23",
  intUnit: "30 days",
  int1: "20 defences with the panel of three",
  int2: "Every mode: authorship, trick questions, statistics coach",
  int3: "In person or online, for the last month",
  intCta: "Choose the Intensive",
  passes: "Group thesis US$ 35: the Intensive Pass for 2 or 3 members, with the group rehearsal.",
  giftLine: "Someone paying for you? From your account you make a link so family can pay for your plan.",
  legal: "Mockio is a practice tool: it does not guarantee a pass, which is your panel's decision. AI can be wrong; check with your advisor and your university's regulations.",
  advisorTitle: "Affiliate programme",
  advisorBody: "Advisors, teachers, creators and tutoring schools: share your link and earn 30% of every purchase by the students who come through you.",
  advisorCta: "See the programme",
  institutionTitle: "For universities and colleges",
  institutionBody: "Mockio inside your Moodle, Canvas or Blackboard: students open it with one click and the grade goes back to the course.",
  institutionCta: "See the integration",
  navInstitutions: "Institutions",
  ladderTitle: "After the defence",
  ladderBody: "Job interviews and your first meetings, in your language or in English.",
  ladderCta: "Practise interviews",
  finalTitle: "Walk into your defence having already defended.",
  finalSub: "Upload your thesis and in a minute you know what they will ask.",
};

const BY_LOCALE: Record<string, Record<Key, string>> = { es: ES, pt: PT, en: EN };

/** The countries whose formats the panel follows, named in the reader's language. */
const COUNTRIES = ["PE", "BR", "CO", "CL", "AR", "EC", "BO", "UY", "PA"];

/* ------------------------------------------------------------------------- */
/* Layout pieces                                                             */
/* ------------------------------------------------------------------------- */

/* ------------------------------------------------------------------------- */
/* The mock screens                                                          */
/* ------------------------------------------------------------------------- */

function CallScreen({ c }: { c: Record<Key, string> }) {
  const [active, setActive] = useState(1);
  const still = useReducedMotion();
  const turns = [
    { role: c.juror1, initials: "RA", speaker: c.mockJuror1, question: c.mockQuestion1, answer: c.mockAnswer1, turn: "2 / 12" },
    { role: c.juror2, initials: "VI", speaker: c.mockJuror, question: c.mockQuestion, answer: c.mockAnswer, turn: "3 / 12" },
    { role: c.juror3, initials: "PA", speaker: c.mockJuror3, question: c.mockQuestion3, answer: c.mockAnswer3, turn: "4 / 12" },
  ];

  useEffect(() => {
    if (still) return;
    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % 3);
    }, 5200);
    return () => window.clearInterval(id);
  }, [still]);

  const current = turns[active]!;

  return (
    <Screen dark>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs text-white/60">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 animate-live rounded-full bg-step" />
          {c.mockLive} · 08:42
        </span>
        <span className="tabular-nums">{current.turn}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 p-3" role="tablist" aria-label={c.navProduct}>
        {turns.map((entry, index) => {
          const isSpeaking = index === active;
          return (
            <button
              key={entry.role}
              type="button"
              role="tab"
              aria-selected={isSpeaking}
              onClick={() => setActive(index)}
              className={`focus-ring flex aspect-[4/3] flex-col items-center justify-center gap-1.5 rounded-xl transition-[background-color,box-shadow,transform] duration-150 ease-press active:scale-[0.97] ${
                isSpeaking ? "bg-white/10 ring-2 ring-accent-text" : "bg-white/5 hover:bg-white/[0.08]"
              }`}
            >
              <span
                className={`grid h-9 w-9 place-items-center rounded-full text-xs font-semibold transition-colors duration-200 ${
                  isSpeaking ? "bg-accent text-accent-ink" : "bg-white/10 text-white/70"
                }`}
              >
                {entry.initials}
              </span>
              <span className="text-xs text-white/70">{entry.role}</span>
              <span aria-hidden className={`flex h-2.5 items-center gap-0.5 transition-opacity duration-200 ${isSpeaking ? "opacity-100" : "opacity-0"}`}>
                {[0, 150, 300, 120].map((delay, barIndex) => (
                  <span
                    key={barIndex}
                    className="h-2.5 w-0.5 origin-center rounded-full bg-accent-text motion-safe:animate-speak"
                    style={{ animationDelay: `${delay}ms` }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div key={active} className="flex flex-col gap-2 px-4 pb-4 motion-safe:animate-swap">
        <p className="text-xs font-semibold text-accent-text">{current.speaker}</p>
        <p className="text-base leading-snug text-white">{current.question}</p>
        <div className="mt-2 rounded-xl bg-white/5 px-3 py-2.5">
          <p className="text-xs font-semibold text-white/50">{c.mockYou} · Cam ON</p>
          <p className="text-sm text-white/80">{current.answer}</p>
        </div>
      </div>
    </Screen>
  );
}






/* ------------------------------------------------------------------------- */
/* The page                                                                  */
/* ------------------------------------------------------------------------- */

export function DefenseLanding() {
  const { locale } = useLocale();
  const c = BY_LOCALE[locale] ?? EN;
  const start = "/app";
  const navigate = useNavigate();
  const pickerRef = useRef<HTMLInputElement>(null);
  // The thesis is chosen here, held in this browser, and uploaded by the
  // thesis screen once there is an account to own it. The app's own gate
  // sends a visitor without one to sign up first.
  const pick = () => pickerRef.current?.click();
  const picked = async (file: File) => {
    await savePendingThesis(file);
    navigate(start);
  };

  // An advisor's link: remembered until the student is inside the app, where
  // the link is made. Only a well-formed code is kept.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("asesor")?.trim().toUpperCase();
    if (!code || !/^[A-Z0-9]{6}$/.test(code)) return;
    try {
      localStorage.setItem("mockio.advisorRef", code);
    } catch {
      // Private mode: the student can still type the code later.
    }
  }, []);

  // The tab and the search result say what this page is.
  useEffect(() => {
    const previous = document.title;
    document.title = c.docTitle;
    return () => {
      document.title = previous;
    };
  }, [c.docTitle]);

  const countries = useMemo(() => {
    try {
      const names = new Intl.DisplayNames([locale], { type: "region" });
      return COUNTRIES.map((code) => names.of(code) ?? code);
    } catch {
      return COUNTRIES;
    }
  }, [locale]);

  const textLink =
    "focus-ring group inline-flex items-center gap-1 rounded-full text-base font-semibold text-accent-text transition-colors";
  const arrow = "h-4 w-4 transition-transform duration-200 ease-press group-hover:translate-x-0.5 rtl:-scale-x-100";

  return (
    <main className="bg-surface-base">
      <input
        ref={pickerRef}
        type="file"
        accept=".pdf,.docx,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void picked(file);
        }}
      />
      <LandingNav
        links={[
          { label: c.navProduct, href: "#panel" },
          { label: c.navHow, href: "#how" },
          { label: c.navScenarios, href: "#scenarios" },
          { label: c.navPricing, href: "#pricing" },
          { label: c.navInstitutions, href: "/instituciones" },
        ]}
        cta={{ label: c.cta, to: start }}
      />

      {/* 1. The hero: the footage edge to edge, the words in its dark upper
          left — Apple's product page, not a centred banner. */}
      <section className="on-media relative isolate flex min-h-[min(100svh,56rem)] flex-col overflow-hidden bg-black pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
        <HeroVideo bare focus="object-[50%_20%] md:object-[65%_15%]" src={HERO_VIDEO} poster={HERO_POSTER} />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/80 via-black/30 to-black/70 md:bg-gradient-to-r md:from-black/85 md:via-black/40 md:to-transparent" />
        <Wrap className="relative z-10 flex flex-1 flex-col justify-between gap-12 pb-10 pt-[clamp(2.5rem,10svh,7rem)]">
          <FadeRise className="max-w-2xl">
            <h1 className="text-balance text-[clamp(2.75rem,7vw,5.75rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-white">
              {/* Word by word, out of a blur, once: the headline is the one
                  sentence worth a moment of motion. Screen readers get the
                  sentence whole. */}
              <span className="sr-only">{c.heroTitle}</span>
              <span aria-hidden>
                <BlurText text={c.heroTitle} animateBy="words" direction="bottom" delay={70} stepDuration={0.32} trigger="load" />
              </span>
            </h1>
            <p className="mt-6 max-w-lg text-pretty text-lg leading-relaxed text-white/80 sm:text-xl">{c.heroSub}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Magnet padding={60} magnetStrength={4}>
                <Action withArrow onClick={pick} className="px-6 py-3 text-base">
                  {c.cta}
                </Action>
              </Magnet>
              <a
                href="#how"
                onClick={(event) => {
                  if (scrollToSection("#how")) event.preventDefault();
                }}
                className="focus-ring group inline-flex items-center gap-1 rounded-full text-base font-semibold text-white/90 transition-colors hover:text-white"
              >
                {c.heroSecondary}
                <ArrowRight aria-hidden className={arrow} />
              </a>
            </div>
            <p className="mt-4 text-sm text-white/60">{c.ctaHint}</p>
            <p className="mt-1 text-sm text-white/60">{c.heroNote}</p>
          </FadeRise>
        </Wrap>
      </section>

      {/* 2. Whose format: the countries the panel follows, as peach chips. */}
      <section className="py-8">
        <Wrap className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
          <MonoLabel className="shrink-0">{c.countries}</MonoLabel>
          <ul className="flex flex-wrap gap-2">
            {countries.map((name) => (
              <li key={name}>
                <Chip>{name}</Chip>
              </li>
            ))}
          </ul>
        </Wrap>
      </section>

      {/* 3. The product as the dashboard it is: one sample thesis, laid
          out the way the signed-in screen lays out a real one. */}
      <LandingDashboard locale={locale} call={<CallScreen c={c} />} onPick={pick} />

      {/* 4. The route from PDF to record, as four waypoints. */}
      <LandingRoute locale={locale} />

      {/* 5. The degrees, as tabs. */}
      <LandingDegrees locale={locale} />

      {/* 8. The one claim that has to land: an ink widget with amber checks. */}
      <section className="py-12 md:py-20">
        <Wrap>
          <FadeRise>
            <div className="grid gap-8 rounded-[1.375rem] bg-[#2E2D2A] p-6 text-[#F4F0E9] sm:p-10 md:grid-cols-2">
              <div>
                <p className="font-mono text-xs font-medium uppercase tracking-[0.06em] text-[#FBD06A]">
                  <span aria-hidden className="tracking-[-0.1em]">::</span>
                  {c.lblPrivacy}
                </p>
                <h2 className="mt-3 text-balance text-[clamp(2.25rem,5vw,4rem)] font-light leading-[1.02] tracking-[-0.045em]">
                  {c.privacyTitle}
                </h2>
                <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed opacity-75">{c.privacyNote}</p>
              </div>
              <ul className="flex flex-col gap-2 self-end">
                {[c.privacy1, c.privacy2, c.privacy3].map((item) => (
                  <li key={item} className="flex items-center gap-4 rounded-2xl bg-white/[0.06] px-4 py-4 text-lg">
                    <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#F6B733] text-[#2E2D2A]">
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeRise>
        </Wrap>
      </section>

      {/* 9. Pricing: three widgets, the middle one in amber. */}
      <section id="pricing" className="scroll-mt-16 py-12 md:py-20">
        <Wrap>
          <FadeRise className="max-w-2xl">
            <MonoLabel>{c.lblPricing}</MonoLabel>
            <Title className="mt-3">{c.pricingTitle}</Title>
            <Lede className="mt-4">{c.pricingSub}</Lede>
          </FadeRise>
          <div className="mt-8 grid gap-3 lg:grid-cols-3 [&>*]:min-w-0">
            {[
              { name: c.freeName, price: c.freePrice, unit: c.freeUnit, items: [c.free1, c.free2, c.free3], cta: c.freeCta, featured: false },
              { name: c.packName, price: c.packPrice, unit: c.packUnit, items: [c.pack1, c.pack2, c.pack3, c.pack4], cta: c.packCta, featured: true },
              { name: c.intName, price: c.intPrice, unit: c.intUnit, items: [c.int1, c.int2, c.int3], cta: c.intCta, featured: false },
            ].map((plan, index) => (
              <FadeRise key={plan.name} delay={index * 0.06} className="h-full">
                <Widget className={`h-full ${plan.featured ? "!ring-2 !ring-accent" : ""}`}>
                  <div className="flex items-center justify-between gap-3">
                    <MonoLabel>{plan.name}</MonoLabel>
                    {plan.featured && <Chip className="!bg-[#FBD06A]">{c.packBadge}</Chip>}
                  </div>
                  <Inset>
                    <p className="flex items-baseline gap-2">
                      <span className="text-5xl font-light tracking-[-0.045em] tabular-nums text-cream-bright">{plan.price}</span>
                      <span className="font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">{plan.unit}</span>
                    </p>
                  </Inset>
                  <ul className="flex flex-1 flex-col gap-3">
                    {plan.items.map((item) => (
                      <li key={item} className="flex gap-3 text-base text-cream">
                        <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" strokeWidth={2.5} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link to={start} className="mt-2 self-start">
                    <Action tone={plan.featured ? "solid" : "quiet"} withArrow={plan.featured}>
                      {plan.cta}
                    </Action>
                  </Link>
                </Widget>
              </FadeRise>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-2 text-sm text-cream-dim">
            <p className="text-cream">{c.passes}</p>
            <p>{c.giftLine}</p>
            <p className="max-w-3xl text-xs">{c.legal}</p>
          </div>
        </Wrap>
      </section>

      {/* 10. The people around the student: three widgets. */}
      <section className="py-12 md:py-16">
        <Wrap className="grid gap-3 md:grid-cols-3">
          {[
            { title: c.advisorTitle, body: c.advisorBody, to: "/afiliados", cta: c.advisorCta },
            { title: c.institutionTitle, body: c.institutionBody, to: "/instituciones", cta: c.institutionCta },
            { title: c.ladderTitle, body: c.ladderBody, to: "/entrevistas", cta: c.ladderCta },
          ].map((item, index) => (
            <FadeRise key={item.title} delay={index * 0.05} className="h-full">
              <Widget label={item.title} className="h-full">
                <p className="flex-1 text-pretty text-base text-cream-dim">{item.body}</p>
                <Link to={item.to} className={textLink}>
                  {item.cta}
                  <ArrowRight aria-hidden className={arrow} />
                </Link>
              </Widget>
            </FadeRise>
          ))}
        </Wrap>
      </section>

      {/* 11. The close: one amber card with the way in. */}
      <section className="pb-16 pt-6 md:pb-24">
        <Wrap>
          <FadeRise>
            <div className="flex flex-col items-start gap-8 rounded-[1.375rem] bg-accent p-6 text-[#2E2D2A] sm:p-10 md:flex-row md:items-end md:justify-between">
              <div className="max-w-3xl">
                <h2 className="text-balance text-[clamp(2.25rem,5.5vw,4.5rem)] font-light leading-[1.02] tracking-[-0.045em]">
                  {c.finalTitle}
                </h2>
                <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed opacity-80">{c.finalSub}</p>
              </div>
              <Magnet padding={70} magnetStrength={4} wrapperClassName="shrink-0">
                <Action tone="neutral" withArrow onClick={pick} className="px-7 py-3.5 text-base">
                  {c.cta}
                </Action>
              </Magnet>
            </div>
          </FadeRise>
        </Wrap>
      </section>

      <SiteFooter />
    </main>
  );
}
