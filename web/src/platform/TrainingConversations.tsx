import { useEffect, useState } from "react";
import { Globe2, GraduationCap, MessagesSquare, RotateCcw, Sparkles, Terminal } from "lucide-react";
import { Action, Badge, CheckItem, FadeRise, Field, InterviewerPresence, Meter, MonoLabel, Notice, Panel, Waveform } from "@/design-system";
import { Chip, IconTile, Inset, Widget } from "@/components/marketing";
import { useLocale } from "@/hooks/useLocale";
import { PageBody, PageHeader } from "./AppShell";

export interface ScenarioItem {
  id: string;
  domain: "education" | "professional";
  personal?: boolean;
  title: string;
  role: string;
  brief: string;
  goal: string;
}

export interface CultureItem {
  id: "neutral" | "latam" | "north-america";
  label: string;
  detail: string;
}

interface Turn {
  role: "user" | "assistant";
  text: string;
}

interface ConversationState {
  token: string;
  messages: Turn[];
  answers: number;
  maxAnswers: number;
  complete: boolean;
}

interface FeedbackData {
  summary: string;
  strengths: string[];
  improvements: string[];
  suggestedReply: string;
  nextPractice: string;
}

type TrackFilter = "all" | "tech" | "personal";

const SCENARIO_ES: Record<string, { title: string; role: string; brief: string; goal: string }> = {
  "group-project": {
    title: "Trabajo grupal desbalanceado",
    role: "Un compañero de clase que no entregó dos avances",
    brief: "La exposición es la próxima semana. Acuerda una división justa y específica sin terminar haciendo todo por tu cuenta.",
    goal: "Nombra hechos observables, pregunta qué bloquea el avance y acuerda responsables con una fecha de revisión.",
  },
  "grade-review": {
    title: "Pedir explicación de una calificación",
    role: "Un docente con poco tiempo de atención",
    brief: "Tu proyecto recibió menos puntaje del que esperabas. Tienes la rúbrica, pero no entiendes cómo se evaluó un criterio.",
    goal: "Pide evidencia concreta y cómo mejorar sin exigir una nota más alta.",
  },
  "research-uncertainty": {
    title: "Resultados que no respaldan tu hipótesis",
    role: "Un asesor de investigación que esperaba un resultado contundente",
    brief: "Tu estudio muestra resultados mixtos. Conversa con honestidad sobre las limitaciones y el siguiente paso metodológico.",
    goal: "Separa la evidencia de la interpretación y evita exagerar la certeza.",
  },
  "advisor-scope": {
    title: "Negociar el alcance de la tesis con tu asesor",
    role: "Un asesor que sugiere agregar un capítulo empírico cerca de la entrega",
    brief: "Tu fecha límite es en seis semanas. Tu asesor propone un experimento adicional que retrasaría tu sustentación.",
    goal: "Reconoce el valor académico, haz explícita la restricción de tiempo y propón llevar esa extensión a trabajo futuro.",
  },
  "oral-exam-question": {
    title: "Aclarar una pregunta ambigua en examen oral",
    role: "Un jurado que plantea una pregunta teórica amplia bajo presión de tiempo",
    brief: "Durante una defensa o seminario, un miembro del jurado hace una pregunta que puede responderse desde dos marcos distintos.",
    goal: "Explica brevemente tu interpretación, confirma el enfoque con el jurado y responde con estructura.",
  },
  "founder-no": {
    title: "Decirle que no a un founder",
    role: "Un founder que pide comprometer una fecha de lanzamiento",
    brief: "El founder quiere anunciar una funcionalidad grande este viernes, pero la versión actual todavía tiene riesgos de estabilidad.",
    goal: "Pon un límite claro, explica las consecuencias y ofrece una alternativa más pequeña y reversible.",
  },
  "engineering-scope": {
    title: "Negociar alcance con ingeniería y producto",
    role: "Un líder de producto que prometió un lanzamiento amplio",
    brief: "Dos desarrolladores tienen un sprint. El alcance pedido incluye una migración y tres funciones visibles para usuarios.",
    goal: "Aclara prioridades, visibiliza dependencias y acuerda qué queda fuera de esta entrega.",
  },
  "designer-feedback": {
    title: "Dar feedback difícil a un diseñador senior",
    role: "Un diseñador senior muy comprometido con su propuesta",
    brief: "En las pruebas de usabilidad las personas no encontraron la acción principal. Conversa sobre el diseño sin atacar a quien lo creó.",
    goal: "Usa observaciones concretas, invita a interpretar la señal y propón una iteración verificable.",
  },
  "stakeholder": {
    title: "Explicar un retraso técnico a un stakeholder",
    role: "Un stakeholder no técnico con un compromiso frente a clientes",
    brief: "Una integración externa está fallando. Explica el impacto en el negocio y las opciones sin jerga ni falsas promesas.",
    goal: "Traduce el riesgo técnico a consecuencias claras, verifica entendimiento y acuerda una decisión.",
  },
  "incomplete-data": {
    title: "Decidir con datos incompletos",
    role: "Una gerencia que pide una recomendación cerrada hoy",
    brief: "Los primeros datos de conversión parecen positivos, pero la muestra es pequeña y los tickets de soporte están subiendo.",
    goal: "Declara la incertidumbre, separa hipótesis de hechos y define un umbral claro para decidir.",
  },
  "family-money": {
    title: "Hablar de dinero con la familia",
    role: "Un familiar cercano que pide apoyo económico recurrente",
    brief: "Te importa tu familiar, pero no puedes sostener el monto que te pide. Practica cómo poner un límite sin hacer promesas que no puedas cumplir.",
    goal: "Cuida el vínculo, expresa tu límite con claridad y conversa sobre alternativas realistas.",
  },
  "in-laws": {
    title: "Poner límites con los suegros",
    role: "Un familiar político que espera pasar todas las fiestas juntos",
    brief: "Tú y tu pareja quieren organizar las fechas de fin de año de otra manera. Conversa sobre las expectativas sin culpar a tu pareja.",
    goal: "Plantea un límite compartido, escucha su postura y propón un acuerdo concreto.",
  },
  "inheritance": {
    title: "Desacuerdo por una herencia familiar",
    role: "Un hermano que quiere decidir rápido sobre un bien familiar",
    brief: "Necesitas revisar documentos y tiempo antes de aceptar. Practica la conversación enfocándote en la comunicación, no en asesoría legal.",
    goal: "Separa la carga emocional de los datos pendientes y sugiere un proceso profesional neutral.",
  },
  "conflict-avoidance": {
    title: "Abordar un conflicto que vienes evitando",
    role: "Una persona cercana que cree que el tema ya estaba resuelto",
    brief: "Has evitado hablar sobre una responsabilidad compartida que se volvió desigual. Abre la conversación con calma y haz un pedido concreto.",
    goal: "Describe el patrón sin adivinar intenciones, escucha su punto de vista y acuerda un primer paso pequeño.",
  },
};

const CULTURE_ES: Record<CultureItem["id"], { label: string; detail: string }> = {
  neutral: {
    label: "Sin contexto regional específico",
    detail: "Pregunta por las preferencias individuales sin asumir normas regionales.",
  },
  latam: {
    label: "Latinoamérica",
    detail: "El contexto es Latinoamérica. Considera matices de cercanía, manejo de la armonía y respeto relacional sin caer en estereotipos.",
  },
  "north-america": {
    label: "Norteamérica",
    detail: "El contexto es Norteamérica. Considera acuerdos explícitos y comunicación directa adaptada a cada equipo o familia.",
  },
};

const SCENARIO_FR: Record<string, { title: string; role: string; brief: string; goal: string }> = {
  "group-project": {
    title: "Projet de groupe déséquilibré",
    role: "Un camarade de classe qui a manqué deux étapes",
    brief: "La présentation a lieu la semaine prochaine. Convenez d'une répartition juste et précise sans finir par tout faire vous-même.",
    goal: "Nommez des faits observables, demandez ce qui bloque l'avancement et fixez des responsables avec une date de suivi.",
  },
  "grade-review": {
    title: "Demander des explications sur une note",
    role: "Un enseignant pressé pendant sa permanence",
    brief: "Votre projet a reçu une note inférieure à vos attentes. Vous avez la grille d'évaluation, mais un critère reste flou.",
    goal: "Demandez des éléments concrets et des pistes d'amélioration sans exiger un changement de note.",
  },
  "research-uncertainty": {
    title: "Résultats ne confirmant pas votre hypothèse",
    role: "Un directeur de recherche qui attendait un résultat net",
    brief: "Votre étude montre des résultats mitigés. Discutez honnêtement des limites et de la prochaine étape méthodologique.",
    goal: "Séparez les preuves de l'interprétation et évitez de surévaluer la certitude.",
  },
  "advisor-scope": {
    title: "Négocier le périmètre de la thèse avec votre directeur",
    role: "Un directeur de thèse proposant d'ajouter un chapitre empirique près de la remise",
    brief: "Votre échéance est dans six semaines. Votre directeur suggère une expérience supplémentaire qui retarderait votre soutenance.",
    goal: "Reconnaissez la valeur académique, explicitez la contrainte de temps et proposez de placer cette piste en travaux futurs.",
  },
  "oral-exam-question": {
    title: "Clarifier une question ambiguë lors d'un oral",
    role: "Un membre du jury posant une question théorique large sous contrainte de temps",
    brief: "Pendant une soutenance ou un séminaire, un examinateur pose une question pouvant être abordée sous deux angles différents.",
    goal: "Exposez brièvement votre interprétation, validez l'angle avec le jury et répondez de façon structurée.",
  },
  "founder-no": {
    title: "Dire non à un fondateur",
    role: "Un fondateur qui demande un engagement de lancement",
    brief: "Le fondateur veut annoncer une fonctionnalité majeure ce vendredi, mais la version actuelle présente encore des risques de stabilité.",
    goal: "Posez une limite claire, expliquez les conséquences et proposez une alternative plus ciblée et réversible.",
  },
  "engineering-scope": {
    title: "Négocier le périmètre avec l'ingénierie et le produit",
    role: "Un responsable produit ayant promis un lancement large",
    brief: "Deux développeurs ont un sprint. Le périmètre demandé inclut une migration et trois fonctionnalités visibles par les utilisateurs.",
    goal: "Clarifiez les priorités, rendez visibles les dépendances et convenez de ce qui sort de cette livraison.",
  },
  "designer-feedback": {
    title: "Donner un retour difficile à un designer senior",
    role: "Un designer senior très attaché à sa proposition",
    brief: "Lors des tests d'utilisabilité, les participants n'ont pas trouvé l'action principale. Discutez du design sans attaquer la personne.",
    goal: "Appuyez-vous sur des observations concrètes, invitez à interpréter le signal et proposez une itération vérifiable.",
  },
  "stakeholder": {
    title: "Expliquer un retard technique à une partie prenante",
    role: "Un interlocuteur non technique ayant pris un engagement client",
    brief: "Une intégration externe échoue. Expliquez l'impact métier et les options sans jargon ni fausses promesses.",
    goal: "Traduisez le risque technique en conséquences claires, vérifiez la compréhension et convenez d'une décision.",
  },
  "incomplete-data": {
    title: "Décider avec des données incomplètes",
    role: "Une direction qui demande une recommandation tranchée aujourd'hui",
    brief: "Les premières conversions semblent positives, mais l'échantillon est faible et les tickets de support augmentent.",
    goal: "Annoncez l'incertitude, séparez les hypothèses des faits et définissez un seuil clair de décision.",
  },
  "family-money": {
    title: "Parler d'argent avec sa famille",
    role: "Un proche qui demande un soutien financier récurrent",
    brief: "Vous tenez à ce proche, mais vous ne pouvez pas assumer le montant demandé. Exercez-vous à poser une limite claire sans fausses promesses.",
    goal: "Préservez la relation, exprimez votre limite avec clarté et discutez d'alternatives réalistes.",
  },
  "in-laws": {
    title: "Poser des limites avec sa belle-famille",
    role: "Un beau-parent qui s'attend à passer toutes les fêtes ensemble",
    brief: "Votre partenaire et vous souhaitez organiser les fêtes autrement cette année. Parlez des attentes sans rejeter la faute sur votre partenaire.",
    goal: "Présentez une limite partagée, écoutez leur point de vue et proposez un accord concret.",
  },
  "inheritance": {
    title: "Désaccord autour d'un héritage familial",
    role: "Un frère ou une sœur qui veut décider vite au sujet d'un bien familial",
    brief: "Vous avez besoin de vérifier des documents et de prendre du temps avant d'accepter. Concentrez la conversation sur la communication.",
    goal: "Séparez la charge émotionnelle des éléments factuels en attente et proposez un cadre professionnel neutre.",
  },
  "conflict-avoidance": {
    title: "Aborder un conflit que vous évitiez",
    role: "Un proche qui pense que le sujet était déjà réglé",
    brief: "Vous avez évité de parler d'une responsabilité partagée devenue déséquilibrée. Ouvrez la discussion calmement avec une demande précise.",
    goal: "Décrivez la situation sans prêter d'intentions, écoutez son point de vue et convenez d'une première étape concrète.",
  },
};

const CULTURE_FR: Record<CultureItem["id"], { label: string; detail: string }> = {
  neutral: {
    label: "Sans contexte régional spécifique",
    detail: "Interrogez les préférences individuelles sans présumer de normes régionales.",
  },
  latam: {
    label: "Amérique latine",
    detail: "Le cadre est l'Amérique latine. Tenez compte de la proximité relationnelle et du tact sans tomber dans les stéréotypes.",
  },
  "north-america": {
    label: "Amérique du Nord",
    detail: "Le cadre est l'Amérique du Nord. Privilégiez des accords explicites et une communication directe adaptée à chaque équipe ou famille.",
  },
};

const SCENARIO_PT: Record<string, { title: string; role: string; brief: string; goal: string }> = {
  "group-project": {
    title: "Trabalho em grupo desequilibrado",
    role: "Um colega de turma que perdeu duas entregas",
    brief: "A apresentação é na próxima semana. Combine uma divisão justa e específica sem acabar fazendo tudo sozinho.",
    goal: "Cite fatos observáveis, pergunte o que está travando o avanço e defina responsáveis com data de revisão.",
  },
  "grade-review": {
    title: "Pedir explicação sobre uma nota",
    role: "Um professor com pouco tempo de atendimento",
    brief: "Seu projeto recebeu uma nota menor do que o esperado. Você tem a rubrica, mas não entendeu como um critério foi avaliado.",
    goal: "Peça evidências concretas e orientações de melhoria sem exigir aumento de nota.",
  },
  "research-uncertainty": {
    title: "Resultados que não sustentam sua hipótese",
    role: "Um orientador que esperava um resultado conclusivo",
    brief: "Seu estudo mostra resultados mistos. Converse com honestidade sobre as limitações e o próximo passo metodológico.",
    goal: "Separe a evidência da interpretação e evite exagerar a certeza.",
  },
  "advisor-scope": {
    title: "Negociar o escopo da tese com seu orientador",
    role: "Um orientador que sugere adicionar um capítulo empírico perto da entrega",
    brief: "Seu prazo final é em seis semanas. Seu orientador propõe um experimento extra que atrasaria sua defesa.",
    goal: "Reconheça o valor acadêmico, explicite a restrição de tempo e proponha levar essa extensão para trabalhos futuros.",
  },
  "oral-exam-question": {
    title: "Esclarecer uma pergunta ambígua em exame oral",
    role: "Um membro da banca que faz uma pergunta teórica ampla sob pressão de tempo",
    brief: "Durante uma defesa ou seminário, um avaliador faz uma pergunta que pode ser respondida por dois referenciais distintos.",
    goal: "Explique brevemente sua interpretação, confirme o recorte com a banca e responda com estrutura.",
  },
  "founder-no": {
    title: "Dizer não a um fundador",
    role: "Um fundador pedindo compromisso de lançamento",
    brief: "O fundador quer anunciar uma grande funcionalidade nesta sexta-feira, mas a versão atual ainda apresenta riscos de estabilidade.",
    goal: "Defina um limite claro, explique as consequências e ofereça uma alternativa menor e reversível.",
  },
  "engineering-scope": {
    title: "Negociar escopo com engenharia e produto",
    role: "Um líder de produto que prometeu um lançamento amplo",
    brief: "Dois desenvolvedores têm uma sprint. O escopo pedido inclui uma migração e três funcionalidades visíveis para usuários.",
    goal: "Esclareça prioridades, torne as dependências visíveis e combine o que fica fora desta entrega.",
  },
  "designer-feedback": {
    title: "Dar feedback difícil a um designer sênior",
    role: "Um designer sênior muito apegado à própria proposta",
    brief: "Nos testes de usabilidade as pessoas não encontraram a ação principal. Converse sobre o design sem atacar quem o criou.",
    goal: "Use observações concretas, convide a interpretar o sinal e proponha uma iteração verificável.",
  },
  "stakeholder": {
    title: "Explicar um atraso técnico a um stakeholder",
    role: "Um stakeholder não técnico com compromisso assumido com clientes",
    brief: "Uma integração externa está falhando. Explique o impacto no negócio e as opções sem jargão nem falsas promessas.",
    goal: "Traduza o risco técnico em consequências claras, confirme o entendimento e alinhe uma decisão.",
  },
  "incomplete-data": {
    title: "Decidir com dados incompletos",
    role: "Uma liderança que pede uma recomendação fechada hoje",
    brief: "Os primeiros dados de conversão parecem positivos, mas a amostra é pequena e os chamados de suporte estão subindo.",
    goal: "Declare a incerteza, separe hipóteses de fatos e defina um critério claro para decidir.",
  },
  "family-money": {
    title: "Conversar sobre dinheiro com a família",
    role: "Um familiar próximo pedindo ajuda financeira recorrente",
    brief: "Você se importa com esse familiar, mas não pode sustentar o valor pedido. Pratique como colocar um limite sem promessas irreais.",
    goal: "Cuide do vínculo, expresse seu limite com clareza e converse sobre alternativas realistas.",
  },
  "in-laws": {
    title: "Definir limites com os sogros",
    role: "Um familiar político que espera passar todas as festas junto",
    brief: "Você e sua parceria querem organizar as festas de fim de ano de outra forma. Converse sobre expectativas sem culpar sua parceria.",
    goal: "Apresente um limite compartilhado, ouça o outro lado e proponha um combinado concreto.",
  },
  "inheritance": {
    title: "Desacordo sobre herança familiar",
    role: "Um irmão que quer decidir rápido sobre um bem da família",
    brief: "Você precisa revisar documentos e ter tempo antes de aceitar. Pratique a conversa focando na comunicação, não em consultoria jurídica.",
    goal: "Separe a carga emocional das informações pendentes e sugira um processo profissional neutro.",
  },
  "conflict-avoidance": {
    title: "Abordar um conflito que você vem evitando",
    role: "Uma pessoa próxima que acredita que o assunto já estava resolvido",
    brief: "Você evitou falar sobre uma responsabilidade compartilhada que ficou desigual. Abra a conversa com calma e faça um pedido concreto.",
    goal: "Descreva o padrão sem supor intenções, ouça o ponto de vista da pessoa e combine um primeiro passo pequeno.",
  },
};

const CULTURE_PT: Record<CultureItem["id"], { label: string; detail: string }> = {
  neutral: {
    label: "Sem contexto regional específico",
    detail: "Pergunte pelas preferências individuais sem assumir normas regionais.",
  },
  latam: {
    label: "América Latina",
    detail: "O contexto é a América Latina. Considere nuances de proximidade, harmonia e respeito relacional sem cair em estereótipos.",
  },
  "north-america": {
    label: "América do Norte",
    detail: "O contexto é a América do Norte. Considere acordos explícitos e comunicação direta adaptada a cada equipe ou família.",
  },
};

const COPY = {
  en: {
    eduEyebrow: "Education · Academic simulations",
    eduTitle: "Academic scenarios and high-stakes conversations",
    eduIntro: "Rehearse group project conflicts, rubric reviews, advisor scope negotiations and oral exam questions before they happen.",
    proEyebrow: "Professional · HardTalk Tech & Latam",
    proTitle: "High-stakes conversations for work and life",
    proIntro: "Practice stakeholder pushback in tech (saying no to a founder, negotiating engineering scope, giving senior design feedback) and culturally adapted personal conversations across Latin America and North America.",
    trackLabel: "Focus area",
    trackAll: "All scenarios",
    trackTech: "Tech & Stakeholder Lab",
    trackPersonal: "Personal & Cultural (HardTalk Latam / NA)",
    scenarioHeading: "1. Choose a scenario",
    cultureHeading: "2. Cultural context",
    languageHeading: "3. Rehearsal language",
    langEs: "Español",
    langEn: "English",
    langFr: "Français",
    langPt: "Português",
    partnerRole: "AI partner role",
    situation: "Situation",
    goal: "Your objective",
    startBtn: "Start rehearsal",
    startingBtn: "Opening conversation…",
    turnCount: (answers: number, max: number) => `Exchange ${answers} of ${max}`,
    partnerTag: "Counterpart",
    youTag: "You",
    replyLabel: "Your response",
    replyPlaceholder: "Write what you would actually say in this conversation…",
    sendBtn: "Send response",
    sendingBtn: "Responding…",
    feedbackBtn: "Get coaching feedback",
    feedbackLoading: "Preparing coaching feedback…",
    resetBtn: "Choose another scenario",
    feedbackEyebrow: "Coaching observation",
    feedbackTitle: "What worked and what to try next",
    strengths: "What worked well",
    improvements: "Where to sharpen",
    suggestedReply: "Alternative phrasing in your voice",
    nextPractice: "Next deliberate practice",
    loadingCatalogue: "Loading conversation catalogue…",
    personalBadge: "Personal & family",
    techBadge: "Tech & workplace",
    academicBadge: "Academic",
  },
  es: {
    eduEyebrow: "Educación · Simulaciones académicas",
    eduTitle: "Escenarios académicos y conversaciones de estudio",
    eduIntro: "Ensaya acuerdos en trabajos grupales, revisión de rúbricas con docentes, alcance de tesis con tu asesor y preguntas ambiguas de jurado.",
    proEyebrow: "Profesional · HardTalk Tech y Conversaciones Difíciles",
    proTitle: "Conversaciones de alto riesgo en tecnología y vida personal",
    proIntro: "Entrena conversaciones difíciles del mundo tech (decir que no a un founder, negociar alcance de ingeniería, dar feedback a un diseñador senior, alinear stakeholders con datos incompletos) y situaciones personales adaptadas al contexto cultural de Latinoamérica y Norteamérica.",
    trackLabel: "Área de práctica",
    trackAll: "Todos los escenarios",
    trackTech: "Mundo Tech · Stakeholder Lab",
    trackPersonal: "Personal y familiar · HardTalk Latam / NA",
    scenarioHeading: "1. Elige un escenario",
    cultureHeading: "2. Contexto cultural",
    languageHeading: "3. Idioma de la práctica",
    langEs: "Español",
    langEn: "English",
    langFr: "Français",
    langPt: "Português",
    partnerRole: "Rol de la contraparte",
    situation: "Situación",
    goal: "Tu objetivo",
    startBtn: "Comenzar simulación",
    startingBtn: "Iniciando simulación…",
    turnCount: (answers: number, max: number) => `Intercambio ${answers} de ${max}`,
    partnerTag: "Contraparte",
    youTag: "Tú",
    replyLabel: "Tu respuesta",
    replyPlaceholder: "Escribe lo que dirías con tus propias palabras…",
    sendBtn: "Enviar respuesta",
    sendingBtn: "Respondiendo…",
    feedbackBtn: "Pedir feedback de la práctica",
    feedbackLoading: "Preparando observaciones…",
    resetBtn: "Cambiar de escenario",
    feedbackEyebrow: "Observaciones de práctica",
    feedbackTitle: "Qué funcionó y qué ajustar en el siguiente intento",
    strengths: "Puntos sólidos",
    improvements: "Ajustes recomendados",
    suggestedReply: "Propuesta de respuesta con tu propia voz",
    nextPractice: "Siguiente ejercicio sugerido",
    loadingCatalogue: "Cargando catálogo de escenarios…",
    personalBadge: "Personal y familiar",
    techBadge: "Tech y trabajo",
    academicBadge: "Académico",
  },
  pt: {
    eduEyebrow: "Educação · Simulações acadêmicas",
    eduTitle: "Cenários acadêmicos e conversas de estudo",
    eduIntro: "Ensaie acordos em trabalhos em grupo, revisão de rubricas, escopo de tese com seu orientador e perguntas de banca.",
    proEyebrow: "Profissional · HardTalk Tech e Conversas Difíceis",
    proTitle: "Conversas de alto risco no trabalho e na vida pessoal",
    proIntro: "Pratique conversas difíceis em tecnologia (dizer não a um fundador, negociar escopo de engenharia, dar feedback a um designer sênior) e situações pessoais com contexto cultural da América Latina e da América do Norte.",
    trackLabel: "Área de prática",
    trackAll: "Todos os cenários",
    trackTech: "Mundo Tech · Stakeholder Lab",
    trackPersonal: "Pessoal e familiar · HardTalk Latam / NA",
    scenarioHeading: "1. Escolha um cenário",
    cultureHeading: "2. Contexto cultural",
    languageHeading: "3. Idioma da prática",
    langEs: "Español",
    langEn: "English",
    langFr: "Français",
    langPt: "Português",
    partnerRole: "Papel da contraparte",
    situation: "Situação",
    goal: "Seu objetivo",
    startBtn: "Iniciar simulação",
    startingBtn: "Iniciando simulação…",
    turnCount: (answers: number, max: number) => `Interação ${answers} de ${max}`,
    partnerTag: "Contraparte",
    youTag: "Você",
    replyLabel: "Sua resposta",
    replyPlaceholder: "Escreva o que você diria com suas próprias palavras…",
    sendBtn: "Enviar resposta",
    sendingBtn: "Respondendo…",
    feedbackBtn: "Solicitar feedback da prática",
    feedbackLoading: "Preparando observações…",
    resetBtn: "Escolher outro cenário",
    feedbackEyebrow: "Observações da prática",
    feedbackTitle: "O que funcionou e o que ajustar na próxima tentativa",
    strengths: "Pontos fortes",
    improvements: "Ajustes recomendados",
    suggestedReply: "Sugestão de resposta na sua voz",
    nextPractice: "Próximo exercício sugerido",
    loadingCatalogue: "Carregando catálogo de cenários…",
    personalBadge: "Pessoal e familiar",
    techBadge: "Tech e trabalho",
    academicBadge: "Acadêmico",
  },
  fr: {
    eduEyebrow: "Éducation · Simulations académiques",
    eduTitle: "Scénarios académiques et conversations d'études",
    eduIntro: "Répétez la gestion des projets de groupe, les revues de grilles d'évaluation, le périmètre de thèse avec votre directeur et les questions de jury.",
    proEyebrow: "Professionnel · HardTalk Tech & Conversations difficiles",
    proTitle: "Conversations à fort enjeu au travail et dans la vie personnelle",
    proIntro: "Entraînez-vous aux conversations difficiles dans la tech (dire non à un fondateur, négocier le périmètre d'ingénierie, donner un retour à un designer senior) et aux situations personnelles adaptées aux contextes culturels d'Amérique latine et d'Amérique du Nord.",
    trackLabel: "Domaine de pratique",
    trackAll: "Tous les scénarios",
    trackTech: "Monde Tech · Stakeholder Lab",
    trackPersonal: "Personnel et familial · HardTalk Latam / NA",
    scenarioHeading: "1. Choisissez un scénario",
    cultureHeading: "2. Contexte culturel",
    languageHeading: "3. Langue de la simulation",
    langEs: "Español",
    langEn: "English",
    langFr: "Français",
    langPt: "Português",
    partnerRole: "Rôle de l'interlocuteur IA",
    situation: "Situation",
    goal: "Votre objectif",
    startBtn: "Démarrer la simulation",
    startingBtn: "Ouverture de la simulation…",
    turnCount: (answers: number, max: number) => `Échange ${answers} sur ${max}`,
    partnerTag: "Interlocuteur",
    youTag: "Vous",
    replyLabel: "Votre réponse",
    replyPlaceholder: "Écrivez ce que vous diriez réellement dans cette conversation…",
    sendBtn: "Envoyer la réponse",
    sendingBtn: "Réponse en cours…",
    feedbackBtn: "Obtenir le retour de coaching",
    feedbackLoading: "Préparation des observations…",
    resetBtn: "Choisir un autre scénario",
    feedbackEyebrow: "Observations de coaching",
    feedbackTitle: "Ce qui a fonctionné et quoi ajuster au prochain essai",
    strengths: "Points forts",
    improvements: "Axes d'amélioration",
    suggestedReply: "Reformulation suggérée avec votre propre voix",
    nextPractice: "Prochain exercice recommandé",
    loadingCatalogue: "Chargement du catalogue de scénarios…",
    personalBadge: "Personnel et familial",
    techBadge: "Tech et travail",
    academicBadge: "Académique",
  },
} as const;

export function TrainingConversations({ domain }: { domain: "education" | "professional" }) {
  const { locale } = useLocale();
  const copy = locale === "es" ? COPY.es : locale === "pt" ? COPY.pt : locale === "fr" ? COPY.fr : COPY.en;

  const [scenarios, setScenarios] = useState<ScenarioItem[]>([]);
  const [cultures, setCultures] = useState<CultureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [track, setTrack] = useState<TrackFilter>("all");
  const [selectedId, setSelectedId] = useState<string>("");
  const [culture, setCulture] = useState<CultureItem["id"]>(domain === "professional" ? "latam" : "neutral");
  const [language, setLanguage] = useState<"es" | "en" | "fr" | "pt">(
    locale === "es" ? "es" : locale === "pt" ? "pt" : locale === "fr" ? "fr" : "en",
  );

  const [session, setSession] = useState<ConversationState | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<"start" | "answer" | "feedback" | null>(null);
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/training/catalogue")
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load training catalogue.");
        return (await res.json()) as { scenarios: ScenarioItem[]; cultures: CultureItem[] };
      })
      .then((data) => {
        if (!active) return;
        const domainScenarios = (data.scenarios ?? []).filter((s) => s.domain === domain);
        setScenarios(domainScenarios);
        setCultures(data.cultures ?? []);
        if (domainScenarios[0]) setSelectedId(domainScenarios[0].id);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Could not load catalogue.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [domain]);

  const filteredScenarios = scenarios.filter((s) => {
    if (domain !== "professional" || track === "all") return true;
    return track === "personal" ? Boolean(s.personal) : !s.personal;
  });

  const activeScenario =
    filteredScenarios.find((s) => s.id === selectedId) ??
    filteredScenarios[0] ??
    scenarios[0] ??
    null;

  function localizeScenario(item: ScenarioItem) {
    if (language === "es" && SCENARIO_ES[item.id]) return SCENARIO_ES[item.id]!;
    if (language === "fr" && SCENARIO_FR[item.id]) return SCENARIO_FR[item.id]!;
    if (language === "pt" && SCENARIO_PT[item.id]) return SCENARIO_PT[item.id]!;
    return item;
  }

  function localizeCulture(item: CultureItem) {
    if (language === "es" && CULTURE_ES[item.id]) return CULTURE_ES[item.id]!;
    if (language === "fr" && CULTURE_FR[item.id]) return CULTURE_FR[item.id]!;
    if (language === "pt" && CULTURE_PT[item.id]) return CULTURE_PT[item.id]!;
    return item;
  }

  async function handleStart() {
    if (!activeScenario) return;
    setBusy("start");
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/training/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenarioId: activeScenario.id,
          culture,
          language,
        }),
      });
      const body = (await res.json()) as ConversationState & { error?: string };
      if (!res.ok) throw new Error(body.error || "Could not start rehearsal.");
      setSession(body);
      setDraft("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not start rehearsal.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSend() {
    if (!session || !draft.trim()) return;
    setBusy("answer");
    setError(null);
    try {
      const res = await fetch("/api/training/conversations/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: session.token,
          answer: draft.trim(),
        }),
      });
      const body = (await res.json()) as ConversationState & { error?: string };
      if (!res.ok) throw new Error(body.error || "Could not send response.");
      setSession(body);
      setDraft("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send response.");
    } finally {
      setBusy(null);
    }
  }

  async function handleFeedback() {
    if (!session) return;
    setBusy("feedback");
    setError(null);
    try {
      const res = await fetch("/api/training/conversations/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: session.token }),
      });
      const body = (await res.json()) as { feedback?: FeedbackData; error?: string };
      if (!res.ok || !body.feedback) throw new Error(body.error || "Could not prepare feedback.");
      setFeedback(body.feedback);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not prepare feedback.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main>
      <PageHeader
        title={domain === "education" ? copy.eduTitle : copy.proTitle}
        meta={domain === "education" ? copy.eduIntro : copy.proIntro}
        actions={
          <Badge tone="live">
            <Sparkles className="h-3 w-3" aria-hidden />
            {domain === "education" ? copy.eduEyebrow : copy.proEyebrow}
          </Badge>
        }
      />

      <PageBody className="space-y-6 pt-2">
        {error && <Notice tone="error">{error}</Notice>}

        {loading ? (
          <Widget label="CATALOGUE" className="p-6">
            <p role="status" className="text-sm text-cream-dim">
              {copy.loadingCatalogue}
            </p>
          </Widget>
        ) : !session ? (
          <div className="grid gap-6 xl:grid-cols-12">
            {/* Left column: Track filter + Scenario catalogue */}
            <div className="space-y-5 xl:col-span-8">
              {domain === "professional" && (
                <Widget label={copy.trackLabel} className="p-5">
                  <fieldset className="flex flex-wrap gap-2">
                    <legend className="sr-only">{copy.trackLabel}</legend>
                    {(
                      [
                        ["all", copy.trackAll],
                        ["tech", copy.trackTech],
                        ["personal", copy.trackPersonal],
                      ] as const
                    ).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={track === id}
                        onClick={() => {
                          setTrack(id);
                          const nextList = scenarios.filter((s) =>
                            id === "all" ? true : id === "personal" ? Boolean(s.personal) : !s.personal,
                          );
                          if (nextList[0]) setSelectedId(nextList[0].id);
                        }}
                        className="focus-ring rounded-full border border-line bg-surface-base px-4 py-2 text-sm font-medium text-cream-bright transition-colors hover:border-line-bright aria-pressed:border-accent-border aria-pressed:bg-accent-soft aria-pressed:text-accent-text"
                      >
                        {label}
                      </button>
                    ))}
                  </fieldset>
                </Widget>
              )}

              <section aria-labelledby="scenario-picker-heading" className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 id="scenario-picker-heading" className="text-base font-medium text-cream-bright">
                    {copy.scenarioHeading}
                  </h2>
                  <MonoLabel>{String(filteredScenarios.length).padStart(2, "0")} SCENARIOS</MonoLabel>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {filteredScenarios.map((item, idx) => {
                    const localized = localizeScenario(item);
                    const selected = activeScenario?.id === item.id;
                    const Icon =
                      item.domain === "education"
                        ? GraduationCap
                        : item.personal
                          ? Globe2
                          : Terminal;
                    return (
                      <FadeRise key={item.id} delay={idx * 0.03}>
                        <button
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setSelectedId(item.id)}
                          className={`focus-ring flex h-full w-full flex-col justify-between rounded-[1.25rem] border p-5 text-left transition-all ${
                            selected
                              ? "border-accent-border bg-surface-lift shadow-card"
                              : "border-line bg-surface-card hover:border-line-bright hover:bg-surface-lift"
                          }`}
                        >
                          <div>
                            {/* The domain badge is gone on purpose. Every card
                                on this screen carried the same word in the
                                same place — five chips saying "académico"
                                where the heading already says it. The icon
                                stays, next to the title, because it is the
                                one mark that still separates the tracks. */}
                            <div className="flex items-center gap-2.5">
                              <Icon className="h-4 w-4 shrink-0 text-accent-text" aria-hidden />
                              <h3 className="text-base font-medium tracking-[-0.02em] text-cream-bright">
                                {localized.title}
                              </h3>
                            </div>
                            <p className="mt-1.5 text-xs leading-relaxed text-cream-dim">
                              {localized.brief}
                            </p>
                          </div>

                          <Inset className="mt-4 px-3 py-2">
                            <p className="text-xs text-cream-dim">
                              <span className="font-medium text-cream-bright">{copy.partnerRole}:</span>{" "}
                              {localized.role}
                            </p>
                          </Inset>
                        </button>
                      </FadeRise>
                    );
                  })}
                </div>
              </section>
            </div>

            {/* Right column: Cultural context + Language + Objective + Start */}
            <div className="xl:col-span-4">
              {/* Not sticky. The panel is taller than a laptop screen, and a
                  sticky panel taller than the viewport pins its top while its
                  primary button stays out of reach — the reader has to scroll
                  past the very thing the panel is holding still. */}
              <Widget
                label="SETUP · LIVE ROLEPLAY"
                className="space-y-6 p-6"
              >
                <fieldset>
                  <legend className="text-sm font-medium text-cream-bright">
                    {copy.cultureHeading}
                  </legend>
                  <div className="mt-3 space-y-2">
                    {cultures.map((cItem) => {
                      const loc = localizeCulture(cItem);
                      const checked = culture === cItem.id;
                      return (
                        <label
                          key={cItem.id}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${
                            checked
                              ? "border-accent-border bg-accent-soft"
                              : "border-line bg-surface-base hover:bg-surface-lift"
                          }`}
                        >
                          <input
                            type="radio"
                            name="culture-context"
                            value={cItem.id}
                            checked={checked}
                            onChange={() => setCulture(cItem.id)}
                            className="mt-1 text-sm"
                          />
                          <span>
                            <strong className="block text-sm font-medium text-cream-bright">
                              {loc.label}
                            </strong>
                            <span className="mt-0.5 block text-xs leading-relaxed text-cream-dim">
                              {loc.detail}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-sm font-medium text-cream-bright">
                    {copy.languageHeading}
                  </legend>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {(
                      [
                        ["es", copy.langEs],
                        ["en", copy.langEn],
                        ["fr", copy.langFr],
                        ["pt", copy.langPt],
                      ] as const
                    ).map(([code, label]) => (
                      <button
                        key={code}
                        type="button"
                        aria-pressed={language === code}
                        onClick={() => setLanguage(code)}
                        className="focus-ring rounded-full border border-line bg-surface-base px-4 py-1.5 text-sm font-medium text-cream-bright transition-colors aria-pressed:border-accent-border aria-pressed:bg-accent-soft aria-pressed:text-accent-text"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {activeScenario && (
                  <Inset className="p-4">
                    {/* The goal goes straight under its own label. It used to
                        sit below the scenario's name, so a panel called "your
                        objective" opened with the name of something else. */}
                    <MonoLabel>{copy.goal}</MonoLabel>
                    <p className="mt-1.5 text-sm leading-relaxed text-cream-bright">
                      {localizeScenario(activeScenario).goal}
                    </p>
                    <p className="mt-2 text-xs text-cream-dim">
                      {localizeScenario(activeScenario).title}
                    </p>
                  </Inset>
                )}

                <Action
                  type="button"
                  withArrow
                  disabled={!activeScenario || busy === "start"}
                  onClick={handleStart}
                  className="w-full justify-center"
                >
                  {busy === "start" ? copy.startingBtn : copy.startBtn}
                </Action>
              </Widget>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {activeScenario && (
              <Panel variant="raised" className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <InterviewerPresence
                      initials="AI"
                      speaking={busy === "answer"}
                      size={52}
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip>
                          {copy.turnCount(session.answers, session.maxAnswers)}
                        </Chip>
                        <Waveform
                          active={busy === "answer"}
                          level={() => (busy === "answer" ? 0.55 : 0.12)}
                          measured={() => false}
                          label={copy.partnerTag}
                          className="h-4 text-accent-text"
                        />
                      </div>
                      <h2 className="mt-1.5 text-lg font-medium text-cream-bright">
                        {localizeScenario(activeScenario).title}
                      </h2>
                      <p className="mt-0.5 text-xs text-cream-dim">
                        <strong className="text-cream-bright">{copy.goal}:</strong>{" "}
                        {localizeScenario(activeScenario).goal}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden w-36 sm:block">
                      <Meter
                        value={Math.round((session.answers / Math.max(1, session.maxAnswers)) * 100)}
                        label={copy.turnCount(session.answers, session.maxAnswers)}
                      />
                    </div>
                    <Action
                      type="button"
                      tone="quiet"
                      onClick={() => {
                        setSession(null);
                        setFeedback(null);
                        setError(null);
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                      {copy.resetBtn}
                    </Action>
                  </div>
                </div>
              </Panel>
            )}

            <div className="space-y-3" aria-live="polite">
              {session.messages.map((turn, idx) => (
                <Widget
                  key={idx}
                  label={`${turn.role === "assistant" ? copy.partnerTag : copy.youTag} · #${String(idx + 1).padStart(2, "0")}`}
                  className={`p-5 ${
                    turn.role === "user" ? "border-accent-border bg-accent-soft" : ""
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream-bright">
                    {turn.text}
                  </p>
                </Widget>
              ))}
            </div>

            {!session.complete && (
              <Widget
                label="RESPONSE"
                className="p-5 sm:p-6"
              >
                <div className="flex items-center gap-2.5">
                  <IconTile>
                    <MessagesSquare className="h-3.5 w-3.5" aria-hidden />
                  </IconTile>
                  <MonoLabel>{copy.replyLabel}</MonoLabel>
                </div>

                <Field label={copy.replyLabel} htmlFor="conversation-reply">
                  <textarea
                    id="conversation-reply"
                    rows={3}
                    maxLength={2000}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={copy.replyPlaceholder}
                    className="focus-ring mt-1 w-full rounded-xl border border-line bg-surface-base p-3.5 text-sm text-cream-bright"
                  />
                </Field>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <Action
                    type="button"
                    withArrow
                    disabled={!draft.trim() || busy !== null}
                    onClick={handleSend}
                  >
                    {busy === "answer" ? copy.sendingBtn : copy.sendBtn}
                  </Action>
                  {session.answers >= 1 && (
                    <Action
                      type="button"
                      tone="quiet"
                      disabled={busy !== null}
                      onClick={handleFeedback}
                    >
                      {busy === "feedback" ? copy.feedbackLoading : copy.feedbackBtn}
                    </Action>
                  )}
                </div>
              </Widget>
            )}

            {session.complete && !feedback && (
              <div className="flex justify-end">
                <Action
                  type="button"
                  withArrow
                  disabled={busy !== null}
                  onClick={handleFeedback}
                >
                  {busy === "feedback" ? copy.feedbackLoading : copy.feedbackBtn}
                </Action>
              </div>
            )}

            {feedback && (
              <Widget
                label="COACHING REPORT"
                className="p-6 sm:p-7"
              >
                <MonoLabel>{copy.feedbackEyebrow}</MonoLabel>
                <h3 className="mt-2 text-xl font-medium tracking-[-0.02em] text-cream-bright">
                  {copy.feedbackTitle}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-cream-dim">{feedback.summary}</p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Inset className="p-4">
                    <MonoLabel className="text-ok">{copy.strengths}</MonoLabel>
                    <ul className="mt-3 space-y-2">
                      {feedback.strengths.map((item, i) => (
                        <CheckItem key={i}>{item}</CheckItem>
                      ))}
                    </ul>
                  </Inset>
                  <Inset className="p-4">
                    <MonoLabel className="text-step">{copy.improvements}</MonoLabel>
                    <ul className="mt-3 space-y-2">
                      {feedback.improvements.map((item, i) => (
                        <CheckItem key={i}>{item}</CheckItem>
                      ))}
                    </ul>
                  </Inset>
                </div>

                <Inset className="mt-4 p-4">
                  <MonoLabel>{copy.suggestedReply}</MonoLabel>
                  <p className="mt-2 text-sm leading-relaxed text-cream-bright">
                    {feedback.suggestedReply}
                  </p>
                </Inset>

                <p className="mt-4 text-xs text-cream-dim">
                  <strong className="text-cream-bright">{copy.nextPractice}:</strong>{" "}
                  {feedback.nextPractice}
                </p>
              </Widget>
            )}
          </div>
        )}
      </PageBody>
    </main>
  );
}
