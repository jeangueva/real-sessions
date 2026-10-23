import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import BlurText from "@/components/bits/BlurText";
import Magnet from "@/components/bits/Magnet";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { Action, AnimatedCounter, EASE_OUT, FadeRise, HeroVideo } from "@/design-system";
import { LandingNav } from "./LandingNav";
import { SiteFooter } from "./SiteFooter";
import { useLocale } from "@/hooks/useLocale";
import { scrollToSection } from "@/lib/scroll-to-section";
import { savePendingThesis } from "@/lib/pending-thesis";
import { SCENARIO_OPTIONS, type DefenseScenario } from "@/lib/defense-scenarios";
import { Lede, Screen, Title, Wrap } from "./marketing";

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

function ActaScreen({ c }: { c: Record<Key, string> }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const still = useReducedMotion();
  const rows = [
    { role: c.juror1, score: 16 },
    { role: c.juror2, score: 12 },
    { role: c.juror3, score: 14 },
  ];
  return (
    <Screen className="w-[17rem] p-5">
      <div ref={ref}>
        <p className="text-xs font-semibold text-cream-dim">{c.mockActa}</p>
        <p className="mt-1 flex items-baseline gap-1.5">
          <span className="text-5xl font-semibold tracking-[-0.04em] tabular-nums text-cream-bright">
            <AnimatedCounter value={14} duration={0.9} />
          </span>
          <span className="text-lg text-cream-faint">/ 20</span>
        </p>
        <p className="mt-2 inline-flex rounded-full bg-grow-soft px-2.5 py-0.5 text-xs font-semibold text-grow-text">{c.mockVerdict}</p>
        <div className="mt-4 flex flex-col gap-2.5">
          {rows.map((row, index) => (
            <div key={row.role}>
              <div className="flex justify-between text-xs">
                <span className="text-cream-dim">{row.role}</span>
                <span className="font-semibold tabular-nums text-cream-bright">{row.score}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-lift">
                <motion.div
                  className={`h-full origin-left rounded-full ${row.score >= 14 ? "bg-grow" : "bg-accent"}`}
                  style={{ width: `${(row.score / 20) * 100}%` }}
                  initial={still ? false : { scaleX: 0 }}
                  animate={still ? undefined : { scaleX: inView ? 1 : 0 }}
                  transition={{
                    duration: 0.7,
                    delay: 0.15 + index * 0.06,
                    ease: EASE_OUT,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Screen>
  );
}

function DiagnosisScreen({ c }: { c: Record<Key, string> }) {
  const risks = [
    { text: c.risk1, page: 34, high: true },
    { text: c.risk2, page: 41, high: true },
    { text: c.risk3, page: 31, high: false },
  ];
  return (
    <Screen className="p-5 sm:p-6">
      <p className="text-sm font-semibold text-cream-bright">{c.diagMock}</p>
      <ul className="mt-4 divide-y divide-[color:var(--line)]">
        {risks.map((risk) => (
          <li key={risk.page} className="flex items-center gap-3 py-3">
            <span
              className={`w-14 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold ${
                risk.high ? "bg-step-soft text-step-text" : "bg-surface-lift text-cream-dim"
              }`}
            >
              {risk.high ? c.sevHigh : c.sevMed}
            </span>
            <span className="min-w-0 flex-1 text-sm text-cream-bright">{risk.text}</span>
            <span className="shrink-0 rounded-md bg-surface-lift px-1.5 py-0.5 text-xs font-semibold tabular-nums text-cream-dim">
              p. {risk.page}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-xl bg-surface-lift px-3 py-2.5 text-xs text-cream-dim">{c.matrixLine}</p>
    </Screen>
  );
}

function JuryScreen({ c }: { c: Record<Key, string> }) {
  const seats = [
    { role: c.juror1, name: c.jury1, field: c.jury1Field, note: null },
    { role: c.juror2, name: c.jury2, field: c.jury2Field, note: c.jury2Note },
    { role: c.juror3, name: c.jury3, field: c.jury3Field, note: null },
  ];
  return (
    <Screen className="p-5 sm:p-6">
      <p className="text-sm font-semibold text-cream-bright">{c.juryMockTitle}</p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {seats.map((seat) => (
          <li key={seat.role} className="rounded-xl bg-surface-lift px-4 py-3">
            <p className="text-xs font-semibold text-accent-text">{seat.role}</p>
            <p className="mt-0.5 text-sm font-semibold text-cream-bright">
              {seat.name} <span className="font-normal text-cream-dim">· {seat.field}</span>
            </p>
            {seat.note && <p className="mt-1 text-xs italic text-cream-dim">“{seat.note}”</p>}
          </li>
        ))}
      </ul>
    </Screen>
  );
}

function PlanScreen({ c, locale }: { c: Record<Key, string>; locale: string }) {
  // Real days from today, in the reader's language.
  const day = (offset: number) =>
    new Date(Date.now() + offset * 86_400_000).toLocaleDateString(locale, { weekday: "short", day: "numeric" });
  const days = [
    { label: c.planToday, text: c.plan1, done: true },
    { label: day(1), text: c.plan2, done: false },
    { label: day(2), text: c.plan3, done: false },
    { label: day(3), text: c.plan4, done: false },
  ];
  return (
    <Screen className="p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-cream-bright">{c.planTitle.replace(/\.$/, "")}</p>
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text">{c.planMock}</span>
      </div>
      <ol className="mt-4 flex flex-col gap-1">
        {days.map((entry, index) => (
          <li key={entry.text} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${index === 0 ? "bg-surface-lift" : ""}`}>
            <span
              className={`mt-0.5 grid shrink-0 place-items-center rounded-[0.3rem] border ${
                entry.done ? "border-grow bg-grow text-white" : "border-cream-faint/50"
              }`}
              style={{ height: 18, width: 18 }}
            >
              {entry.done && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-cream-dim">{entry.label}</span>
              <span className={`block text-sm ${entry.done ? "text-cream-faint line-through" : "text-cream-bright"}`}>{entry.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </Screen>
  );
}

/** One feature: words on one side, the product on the other. */
function Feature({
  title,
  body,
  screen,
  flip = false,
}: {
  title: string;
  body: string;
  screen: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-24 [&>*]:min-w-0">
      <FadeRise className={flip ? "md:order-2" : ""}>
        <h3 className="text-balance text-[clamp(1.75rem,3.2vw,2.5rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-cream-bright">
          {title}
        </h3>
        <p className="mt-4 max-w-md text-pretty text-lg leading-relaxed text-cream-dim">{body}</p>
      </FadeRise>
      <FadeRise delay={0.08} className={flip ? "md:order-1" : ""}>
        {screen}
      </FadeRise>
    </div>
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

      {/* 2. Whose format: the strip a product page shows its customers in,
          made of something true — the countries the panel follows. */}
      <section className="border-b border-[color:var(--line)]">
        <Wrap className="flex flex-col gap-3 py-8 md:flex-row md:items-center md:gap-10">
          <p className="shrink-0 text-sm text-cream-dim">{c.countries}</p>
          <ul className="flex flex-wrap gap-x-7 gap-y-2">
            {countries.map((name) => (
              <li key={name} className="text-base font-semibold tracking-[-0.01em] text-cream-faint">
                {name}
              </li>
            ))}
          </ul>
        </Wrap>
      </section>

      {/* 3. The product itself: the call and the record, Stripe-style. */}
      <section id="panel" className="scroll-mt-16 py-20 md:py-32">
        <Wrap className="grid items-center gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
          <FadeRise>
            <Title>{c.prodTitle}</Title>
            <Lede className="mt-5 max-w-lg">{c.prodBody}</Lede>
            <ul className="mt-8 max-w-lg divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
              {[c.prod1, c.prod2, c.prod3].map((item) => (
                <li key={item} className="flex items-start gap-3 py-3.5 text-base text-cream-bright">
                  <Check aria-hidden className="mt-1 h-4 w-4 shrink-0 text-accent-text" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </FadeRise>
          <FadeRise delay={0.1} className="relative sm:pb-10 lg:pb-0 lg:pr-10">
            <CallScreen c={c} />
            {/* Overlapping the call's corner on a wide screen; on a phone it
                only tucks under the edge, so the question stays readable. */}
            <div className="relative -mt-5 ml-auto w-fit sm:absolute sm:-bottom-2 sm:-right-4 sm:mt-0 lg:-bottom-12 lg:-right-2">
              <ActaScreen c={c} />
            </div>
          </FadeRise>
        </Wrap>
      </section>

      {/* 4. How it works: three numbered columns on a hairline, no icons. */}
      <section id="how" className="scroll-mt-16 bg-surface-deep py-20 md:py-28">
        <Wrap>
          <FadeRise>
            <Title className="max-w-2xl">{c.howTitle}</Title>
          </FadeRise>
          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              { title: c.step1Title, body: c.step1Body },
              { title: c.step2Title, body: c.step2Body },
              { title: c.step3Title, body: c.step3Body },
            ].map((step, index) => (
              <li key={step.title} className="min-w-0">
                <FadeRise delay={index * 0.06} className="border-t border-[color:var(--line-strong)] pt-6">
                  <span className="text-sm font-semibold tabular-nums text-cream-faint">0{index + 1}</span>
                  <h3 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-cream-bright">{step.title}</h3>
                  <p className="mt-2 text-pretty text-base leading-relaxed text-cream-dim">{step.body}</p>
                </FadeRise>
              </li>
            ))}
          </ol>
        </Wrap>
      </section>

      {/* 5. Three features, one screen each, alternating sides. */}
      <section className="py-4 md:py-8">
        <Wrap className="divide-y divide-[color:var(--line)]">
          <Feature title={c.diagTitle} body={c.diagBody} screen={<DiagnosisScreen c={c} />} />
          <Feature title={c.juryTitle} body={c.juryBody} screen={<JuryScreen c={c} />} flip />
          <Feature title={c.planTitle} body={c.planBody} screen={<PlanScreen c={c} locale={locale} />} />
        </Wrap>
      </section>

      {/* 6. The rest, as a quiet four-up list rather than more cards. */}
      <section className="border-t border-[color:var(--line)] py-20 md:py-24">
        <Wrap>
          <FadeRise>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-cream-bright sm:text-3xl">{c.moreTitle}</h2>
          </FadeRise>
          <dl className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: c.more1Title, body: c.more1Body },
              { title: c.more2Title, body: c.more2Body },
              { title: c.more3Title, body: c.more3Body },
              { title: c.more4Title, body: c.more4Body },
            ].map((item, index) => (
              <FadeRise key={item.title} delay={index * 0.05}>
                <dt className="text-base font-semibold text-cream-bright">{item.title}</dt>
                <dd className="mt-1 text-pretty text-base text-cream-dim">{item.body}</dd>
              </FadeRise>
            ))}
          </dl>
        </Wrap>
      </section>

      {/* 7. Degrees and levels: a table, the way a spec sheet reads. */}
      <section id="scenarios" className="scroll-mt-16 bg-surface-deep py-20 md:py-28">
        <Wrap className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-20">
          <FadeRise>
            <Title>{c.scenTitle}</Title>
            <Lede className="mt-5 max-w-md">{c.scenSub}</Lede>
          </FadeRise>
          <FadeRise delay={0.08}>
            <ul className="divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
              {(Object.keys(SCENARIO_OPTIONS) as DefenseScenario[]).map((scenario) => (
                <li key={scenario} className="flex items-baseline justify-between gap-4 py-4">
                  <span className="text-lg font-semibold tracking-[-0.01em] text-cream-bright">{c[`sc_${scenario}` as Key]}</span>
                  <span className="shrink-0 text-sm tabular-nums text-cream-dim">
                    {c.scenMeta
                      .replace("{minutes}", String(SCENARIO_OPTIONS[scenario].exposition))
                      .replace("{questions}", String(SCENARIO_OPTIONS[scenario].questions))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-10 text-sm font-semibold text-cream-dim">{c.levelsTitle}</p>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl bg-surface-lift p-1 sm:grid-cols-4">
              {[c.lv1, c.lv2, c.lv3, c.lv4].map((level, index) => (
                <div
                  key={level}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold ${
                    index === 1 ? "bg-surface-card text-cream-bright shadow-card" : "text-cream-dim"
                  }`}
                >
                  <span aria-hidden className="flex items-end gap-0.5">
                    {[0, 1, 2, 3].map((bar) => (
                      <span
                        key={bar}
                        className={`w-1 rounded-sm ${bar <= index ? (index === 3 ? "bg-step" : "bg-grow-text") : "bg-cream-faint/30"}`}
                        style={{ height: `${6 + bar * 3}px` }}
                      />
                    ))}
                  </span>
                  {level}
                </div>
              ))}
            </div>
          </FadeRise>
        </Wrap>
      </section>

      {/* 8. The one claim that has to land, in a band of its own — Uber's
          black, which inverts with the theme. */}
      <section className="bg-cream-bright text-surface-base">
        <Wrap className="grid gap-10 py-20 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:py-28">
          <FadeRise>
            <h2 className="text-balance text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.02] tracking-[-0.04em]">
              {c.privacyTitle}
            </h2>
            <p className="mt-5 max-w-md text-pretty text-lg leading-relaxed opacity-70">{c.privacyNote}</p>
          </FadeRise>
          <FadeRise delay={0.08}>
            <ul className="divide-y divide-surface-base/15 border-y border-surface-base/15">
              {[c.privacy1, c.privacy2, c.privacy3].map((item) => (
                <li key={item} className="flex items-center gap-4 py-5 text-xl font-semibold tracking-[-0.015em]">
                  <Check aria-hidden className="h-5 w-5 shrink-0" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </FadeRise>
        </Wrap>
      </section>

      {/* 9. Pricing: three columns on hairlines, the middle one marked. */}
      <section id="pricing" className="scroll-mt-16 py-20 md:py-32">
        <Wrap>
          <FadeRise className="max-w-2xl">
            <Title>{c.pricingTitle}</Title>
            <Lede className="mt-4">{c.pricingSub}</Lede>
          </FadeRise>
          <div className="mt-14 grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
            {[
              { name: c.freeName, price: c.freePrice, unit: c.freeUnit, items: [c.free1, c.free2, c.free3], cta: c.freeCta, featured: false },
              { name: c.packName, price: c.packPrice, unit: c.packUnit, items: [c.pack1, c.pack2, c.pack3, c.pack4], cta: c.packCta, featured: true },
              { name: c.intName, price: c.intPrice, unit: c.intUnit, items: [c.int1, c.int2, c.int3], cta: c.intCta, featured: false },
            ].map((plan, index) => (
              <FadeRise key={plan.name} delay={index * 0.06} className="h-full">
                <div
                  className={`flex h-full flex-col rounded-card p-7 sm:p-8 ${
                    plan.featured
                      ? "bg-surface-card shadow-float ring-2 ring-cream-bright"
                      : "ring-1 ring-[color:var(--line)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-cream-bright">{plan.name}</h3>
                    {plan.featured && (
                      <span className="rounded-full bg-cream-bright px-2.5 py-0.5 text-xs font-semibold text-surface-base">{c.packBadge}</span>
                    )}
                  </div>
                  <p className="mt-5 flex items-baseline gap-2">
                    <span className="text-5xl font-semibold tracking-[-0.04em] tabular-nums text-cream-bright">{plan.price}</span>
                    <span className="text-sm text-cream-dim">{plan.unit}</span>
                  </p>
                  <ul className="mt-6 flex flex-1 flex-col gap-3 border-t border-[color:var(--line)] pt-6">
                    {plan.items.map((item) => (
                      <li key={item} className="flex gap-3 text-base text-cream">
                        <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-cream-bright" strokeWidth={2.5} />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link to={start} className="mt-8 self-start">
                    <Action tone={plan.featured ? "solid" : "glass"} withArrow={plan.featured}>
                      {plan.cta}
                    </Action>
                  </Link>
                </div>
              </FadeRise>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-2 text-sm text-cream-dim">
            <p className="text-cream">{c.passes}</p>
            <p>{c.giftLine}</p>
            <p className="max-w-3xl text-xs">{c.legal}</p>
          </div>
        </Wrap>
      </section>

      {/* 10. The people around the student, as three plain columns. */}
      <section className="border-t border-[color:var(--line)] py-16 md:py-20">
        <Wrap className="grid gap-10 md:grid-cols-3 md:gap-8">
          {[
            {
              title: c.advisorTitle,
              body: c.advisorBody,
              link: (
                <Link to="/afiliados" className={textLink}>
                  {c.advisorCta}
                  <ArrowRight aria-hidden className={arrow} />
                </Link>
              ),
            },
            {
              title: c.institutionTitle,
              body: c.institutionBody,
              link: (
                <Link to="/instituciones" className={textLink}>
                  {c.institutionCta}
                  <ArrowRight aria-hidden className={arrow} />
                </Link>
              ),
            },
            {
              title: c.ladderTitle,
              body: c.ladderBody,
              link: (
                <Link to="/entrevistas" className={textLink}>
                  {c.ladderCta}
                  <ArrowRight aria-hidden className={arrow} />
                </Link>
              ),
            },
          ].map((item, index) => (
            <FadeRise key={item.title} delay={index * 0.05} className="flex flex-col items-start gap-2">
              <h2 className="text-lg font-semibold text-cream-bright">{item.title}</h2>
              <p className="text-pretty text-base text-cream-dim">{item.body}</p>
              <div className="mt-2">{item.link}</div>
            </FadeRise>
          ))}
        </Wrap>
      </section>

      {/* 11. The close: one sentence and the way in. */}
      <section className="bg-surface-deep py-24 md:py-36">
        <Wrap>
          <FadeRise className="flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-balance text-[clamp(2.25rem,5.5vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-cream-bright">
                {c.finalTitle}
              </h2>
              <Lede className="mt-5 max-w-xl">{c.finalSub}</Lede>
            </div>
            <Magnet padding={70} magnetStrength={4} wrapperClassName="shrink-0">
              <Action withArrow onClick={pick} className="px-7 py-3.5 text-base">
                {c.cta}
              </Action>
            </Magnet>
          </FadeRise>
        </Wrap>
      </section>

      <SiteFooter />
    </main>
  );
}
