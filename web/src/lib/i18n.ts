/**
 * The language the interface is written in.
 *
 * Not the language the interviewer speaks — that is a different setting, it
 * lives on the interview and it is a paid feature. This one is free, because
 * a product built for Latin American candidates asking them to navigate it in
 * English is a strange thing to charge for.
 *
 * Deliberately not a library. The app has a few hundred strings, no plurals
 * that inflect differently across these three languages, and no runtime
 * locale loading — a dictionary and a lookup do the whole job, and the type
 * system catches a missing key at build time in a way a runtime i18n
 * framework never does.
 */

export type Locale = "en" | "es" | "pt";

export const LOCALES: { id: Locale; label: string }[] = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "pt", label: "Português" },
];

export const LOCALE_KEY = "realsessions.locale";

/** English is the source of truth: every other dictionary answers to its keys. */
const EN = {
  "nav.new": "New session",
  "nav.context": "Your context",
  "nav.progress": "Progress",
  "nav.history": "History",
  "nav.settings": "Settings",
  "nav.review": "Review",
  "nav.guest": "Practising as a guest",
  "nav.save": "Save my progress",
  "nav.signOut": "Sign out",
  "nav.sections": "Sections",

  "setup.title": "Start an interview",
  "setup.meta": "Seven turns, about ten minutes. You can stop at any point.",
  "setup.eyebrow": "Interview setup",
  "setup.begin": "Begin",
  "setup.freePlan": "You are on the free plan.",
  "setup.freePlanBody":
    "A general interview for your role, scored honestly. Targeting a company, your CV and live coaching are on the paid plan.",
  "setup.sixMonths": "Six months free",
  "setup.search": "Search a company, a role, or a past session to run again",
  "setup.clearSearch": "Clear search",

  "field.role": "Role",
  "field.roleHint": "What you are interviewing for. It also decides which rounds exist.",
  "field.stage": "Stage",
  "field.mode": "Mode",
  "field.interviewer": "Interviewer",
  "field.interviewerHint":
    "Only the people who actually run these rounds. A recruiter does not take a system design interview.",
  "field.interviewerLocked":
    "Each company sends the interviewer its culture implies. Picking your own is part of the paid plan.",
  "field.sector": "Sector",
  "field.sectorLocked": "Choosing a sector is part of the paid plan.",
  "field.sectorHint": "Sets the vocabulary and the numbers you will be asked for.",
  "field.company": "Company",
  "field.companyLocked": "Targeting a specific company is part of the paid plan.",
  "field.language": "Language",
  "field.languageHint":
    "What the interviewer speaks. The report comes back in English either way.",
  "field.languageLocked":
    "Interviewing in Spanish or Portuguese is part of the paid plan. Free runs the English interview.",
  "field.companyDefault": "Company default",
  "field.companyDefaultHint": "Stripe sends a skeptic. Airbnb sends a host.",
  "field.generalRole": "General role",
  "field.all": "All",
  "field.practice": "Practice",
  "field.practiceHint": "Coaching notes appear beside the transcript.",
  "field.real": "Real",
  "field.realHint": "No coaching until the end. Worth more XP.",

  "recent.heading": "Run one again",
  "recent.label": "Recent sessions",

  "call.mute": "Mute microphone",
  "call.unmute": "Unmute microphone",
  "call.cameraOn": "Turn camera on",
  "call.cameraOff": "Turn camera off",
  "call.cameraNote": "Only you ever see this. Nothing is sent or recorded.",
  "call.share": "Share your screen",
  "call.stopShare": "Stop sharing your screen",
  "call.shareNote": "Only you see it. Nothing is sent or recorded.",
  "call.showPanel": "Show transcript",
  "call.hidePanel": "Hide transcript",
  "call.leave": "Leave the interview",
  "call.endAndSee": "End and see feedback",
  "call.connecting": "Connecting",
  "call.connectingTo": "Connecting to your interviewer…",
  "call.turnOf": "Turn {turn} of {total}",
  "call.speaking": "{name} is speaking",
  "call.notSpeaking": "{name} is not speaking",
  "call.micLive": "Your microphone is picking you up",
  "call.listening": "Listening…",
  "call.blocked": "Your browser blocked audio until you interact with the page.",
  "call.playTurn": "Play this turn",
  "call.seeFeedback": "See feedback",
  "call.interviewer": "Interviewer",
  "call.you": "You",
  "call.selfView": "Your camera, visible only to you",
  "call.sharedScreen": "The screen you are sharing",

  "panel.transcript": "transcript",
  "panel.chat": "chat",
  "panel.label": "Session panel",
  "panel.empty": "What you both say appears here, as it is said.",
  "panel.typingNote":
    "Typing is the same interview — it just skips the microphone. Useful for a word you cannot say out loud yet.",
  "panel.placeholder": "Type your answer…",
  "panel.send": "Send",
  "panel.enterToSend": "Enter to send · Shift + Enter for a new line",
  "panel.thinking": "Thinking…",
  "panel.speaking": "Speaking…",

  "tour.close": "Close the tour",
  "tour.label": "Guided tour",
  "tour.back": "Back",
  "tour.skip": "Skip",
  "tour.next": "Next",
  "tour.done": "Got it",
  "tour.stepOf": "{index} of {total}",

  "settings.title": "Settings",
  "settings.meta": "Account and practice preferences",
  "settings.appearance": "Appearance",
  "settings.theme": "Theme",
  "settings.themeSystem": "System",
  "settings.themeDark": "Dark",
  "settings.themeLight": "Light",
  "settings.themeFollowing": "Following your device, which is currently {theme}.",
  "settings.themeFixed": "Fixed, whatever your device does.",
  "settings.interfaceLanguage": "Interface language",
  "settings.interfaceLanguageHint":
    "The language of this app. What the interviewer speaks is chosen per interview.",
  "settings.tour": "Guided tour",
  "settings.tourHint": "The walkthrough shown the first time you open a session.",
  "settings.tourAgain": "Show it again",
  "settings.tourReset": "It will run next time",
} as const;

export type MessageKey = keyof typeof EN;

/**
 * Spanish and Portuguese answer to the English keys.
 *
 * Typed against `EN`, so a key added there and forgotten here is a build
 * error rather than an English word appearing mid-sentence in production.
 */
const ES: Record<MessageKey, string> = {
  "nav.new": "Nueva sesión",
  "nav.context": "Tu contexto",
  "nav.progress": "Progreso",
  "nav.history": "Historial",
  "nav.settings": "Ajustes",
  "nav.review": "Revisión",
  "nav.guest": "Practicando como invitado",
  "nav.save": "Guardar mi progreso",
  "nav.signOut": "Cerrar sesión",
  "nav.sections": "Secciones",

  "setup.title": "Empezar una entrevista",
  "setup.meta": "Siete turnos, unos diez minutos. Podés parar cuando quieras.",
  "setup.eyebrow": "Configuración",
  "setup.begin": "Empezar",
  "setup.freePlan": "Estás en el plan gratuito.",
  "setup.freePlanBody":
    "Una entrevista general para tu rol, puntuada con honestidad. Apuntar a una empresa, subir tu CV y el coaching en vivo son del plan pago.",
  "setup.sixMonths": "Seis meses gratis",
  "setup.search": "Buscá una empresa, un rol, o una sesión pasada para repetir",
  "setup.clearSearch": "Limpiar búsqueda",

  "field.role": "Rol",
  "field.roleHint": "Para qué entrevistás. También decide qué rondas existen.",
  "field.stage": "Ronda",
  "field.mode": "Modo",
  "field.interviewer": "Entrevistador",
  "field.interviewerHint":
    "Sólo quienes realmente hacen estas rondas. Un reclutador no toma una entrevista de diseño de sistemas.",
  "field.interviewerLocked":
    "Cada empresa manda al entrevistador que su cultura implica. Elegir el tuyo es del plan pago.",
  "field.sector": "Sector",
  "field.sectorLocked": "Elegir un sector es del plan pago.",
  "field.sectorHint": "Define el vocabulario y los números que te van a pedir.",
  "field.company": "Empresa",
  "field.companyLocked": "Apuntar a una empresa concreta es del plan pago.",
  "field.language": "Idioma",
  "field.languageHint":
    "Lo que habla el entrevistador. El informe llega en inglés en cualquier caso.",
  "field.languageLocked":
    "Entrevistar en español o portugués es del plan pago. El gratuito corre la entrevista en inglés.",
  "field.companyDefault": "El de la empresa",
  "field.companyDefaultHint": "Stripe manda un escéptico. Airbnb, un anfitrión.",
  "field.generalRole": "Rol general",
  "field.all": "Todos",
  "field.practice": "Práctica",
  "field.practiceHint": "Las notas de coaching aparecen junto a la transcripción.",
  "field.real": "Real",
  "field.realHint": "Sin ayuda hasta el final. Vale más XP.",

  "recent.heading": "Repetir una",
  "recent.label": "Sesiones recientes",

  "call.mute": "Silenciar micrófono",
  "call.unmute": "Activar micrófono",
  "call.cameraOn": "Encender cámara",
  "call.cameraOff": "Apagar cámara",
  "call.cameraNote": "Sólo vos la ves. No se envía ni se graba.",
  "call.share": "Compartir pantalla",
  "call.stopShare": "Dejar de compartir",
  "call.shareNote": "Sólo vos la ves. No se envía ni se graba.",
  "call.showPanel": "Mostrar transcripción",
  "call.hidePanel": "Ocultar transcripción",
  "call.leave": "Salir de la entrevista",
  "call.endAndSee": "Terminar y ver el informe",
  "call.connecting": "Conectando",
  "call.connectingTo": "Conectando con tu entrevistador…",
  "call.turnOf": "Turno {turn} de {total}",
  "call.speaking": "{name} está hablando",
  "call.notSpeaking": "{name} no está hablando",
  "call.micLive": "Tu micrófono te está captando",
  "call.listening": "Escuchando…",
  "call.blocked": "Tu navegador bloqueó el audio hasta que interactúes con la página.",
  "call.playTurn": "Reproducir este turno",
  "call.seeFeedback": "Ver el informe",
  "call.interviewer": "Entrevistador",
  "call.you": "Vos",
  "call.selfView": "Tu cámara, visible sólo para vos",
  "call.sharedScreen": "La pantalla que estás compartiendo",

  "panel.transcript": "transcripción",
  "panel.chat": "chat",
  "panel.label": "Panel de la sesión",
  "panel.empty": "Lo que digan los dos aparece acá, a medida que se dice.",
  "panel.typingNote":
    "Escribir es la misma entrevista, sólo que sin micrófono. Sirve para una palabra que todavía no te sale en voz alta.",
  "panel.placeholder": "Escribí tu respuesta…",
  "panel.send": "Enviar",
  "panel.enterToSend": "Enter para enviar · Shift + Enter para otra línea",
  "panel.thinking": "Pensando…",
  "panel.speaking": "Hablando…",

  "tour.close": "Cerrar el tour",
  "tour.label": "Tour guiado",
  "tour.back": "Atrás",
  "tour.skip": "Saltar",
  "tour.next": "Siguiente",
  "tour.done": "Entendido",
  "tour.stepOf": "{index} de {total}",

  "settings.title": "Ajustes",
  "settings.meta": "Cuenta y preferencias de práctica",
  "settings.appearance": "Apariencia",
  "settings.theme": "Tema",
  "settings.themeSystem": "Sistema",
  "settings.themeDark": "Oscuro",
  "settings.themeLight": "Claro",
  "settings.themeFollowing": "Sigue a tu dispositivo, que ahora está en {theme}.",
  "settings.themeFixed": "Fijo, haga lo que haga tu dispositivo.",
  "settings.interfaceLanguage": "Idioma de la interfaz",
  "settings.interfaceLanguageHint":
    "El idioma de esta aplicación. Lo que habla el entrevistador se elige en cada entrevista.",
  "settings.tour": "Tour guiado",
  "settings.tourHint": "El recorrido que se muestra la primera vez que abrís una sesión.",
  "settings.tourAgain": "Mostrarlo de nuevo",
  "settings.tourReset": "Se va a mostrar la próxima vez",
};

const PT: Record<MessageKey, string> = {
  "nav.new": "Nova sessão",
  "nav.context": "Seu contexto",
  "nav.progress": "Progresso",
  "nav.history": "Histórico",
  "nav.settings": "Ajustes",
  "nav.review": "Revisão",
  "nav.guest": "Praticando como convidado",
  "nav.save": "Salvar meu progresso",
  "nav.signOut": "Sair",
  "nav.sections": "Seções",

  "setup.title": "Começar uma entrevista",
  "setup.meta": "Sete turnos, cerca de dez minutos. Você pode parar quando quiser.",
  "setup.eyebrow": "Configuração",
  "setup.begin": "Começar",
  "setup.freePlan": "Você está no plano gratuito.",
  "setup.freePlanBody":
    "Uma entrevista geral para o seu cargo, avaliada com honestidade. Mirar uma empresa, enviar seu currículo e o coaching ao vivo são do plano pago.",
  "setup.sixMonths": "Seis meses grátis",
  "setup.search": "Busque uma empresa, um cargo, ou uma sessão anterior para repetir",
  "setup.clearSearch": "Limpar busca",

  "field.role": "Cargo",
  "field.roleHint": "Para o que você está entrevistando. Também define quais rodadas existem.",
  "field.stage": "Rodada",
  "field.mode": "Modo",
  "field.interviewer": "Entrevistador",
  "field.interviewerHint":
    "Apenas quem realmente conduz estas rodadas. Um recrutador não faz uma entrevista de design de sistemas.",
  "field.interviewerLocked":
    "Cada empresa manda o entrevistador que sua cultura implica. Escolher o seu é do plano pago.",
  "field.sector": "Setor",
  "field.sectorLocked": "Escolher um setor é do plano pago.",
  "field.sectorHint": "Define o vocabulário e os números que vão te pedir.",
  "field.company": "Empresa",
  "field.companyLocked": "Mirar uma empresa específica é do plano pago.",
  "field.language": "Idioma",
  "field.languageHint":
    "O que o entrevistador fala. O relatório volta em inglês de qualquer forma.",
  "field.languageLocked":
    "Entrevistar em espanhol ou português é do plano pago. O gratuito roda a entrevista em inglês.",
  "field.companyDefault": "O da empresa",
  "field.companyDefaultHint": "A Stripe manda um cético. O Airbnb, um anfitrião.",
  "field.generalRole": "Cargo geral",
  "field.all": "Todos",
  "field.practice": "Prática",
  "field.practiceHint": "As notas de coaching aparecem ao lado da transcrição.",
  "field.real": "Real",
  "field.realHint": "Sem ajuda até o final. Vale mais XP.",

  "recent.heading": "Repetir uma",
  "recent.label": "Sessões recentes",

  "call.mute": "Silenciar microfone",
  "call.unmute": "Ativar microfone",
  "call.cameraOn": "Ligar câmera",
  "call.cameraOff": "Desligar câmera",
  "call.cameraNote": "Só você vê. Nada é enviado nem gravado.",
  "call.share": "Compartilhar tela",
  "call.stopShare": "Parar de compartilhar",
  "call.shareNote": "Só você vê. Nada é enviado nem gravado.",
  "call.showPanel": "Mostrar transcrição",
  "call.hidePanel": "Ocultar transcrição",
  "call.leave": "Sair da entrevista",
  "call.endAndSee": "Encerrar e ver o relatório",
  "call.connecting": "Conectando",
  "call.connectingTo": "Conectando com seu entrevistador…",
  "call.turnOf": "Turno {turn} de {total}",
  "call.speaking": "{name} está falando",
  "call.notSpeaking": "{name} não está falando",
  "call.micLive": "Seu microfone está te captando",
  "call.listening": "Ouvindo…",
  "call.blocked": "Seu navegador bloqueou o áudio até você interagir com a página.",
  "call.playTurn": "Reproduzir este turno",
  "call.seeFeedback": "Ver o relatório",
  "call.interviewer": "Entrevistador",
  "call.you": "Você",
  "call.selfView": "Sua câmera, visível só para você",
  "call.sharedScreen": "A tela que você está compartilhando",

  "panel.transcript": "transcrição",
  "panel.chat": "chat",
  "panel.label": "Painel da sessão",
  "panel.empty": "O que vocês dois disserem aparece aqui, conforme é dito.",
  "panel.typingNote":
    "Escrever é a mesma entrevista, só que sem microfone. Útil para uma palavra que ainda não sai em voz alta.",
  "panel.placeholder": "Escreva sua resposta…",
  "panel.send": "Enviar",
  "panel.enterToSend": "Enter para enviar · Shift + Enter para outra linha",
  "panel.thinking": "Pensando…",
  "panel.speaking": "Falando…",

  "tour.close": "Fechar o tour",
  "tour.label": "Tour guiado",
  "tour.back": "Voltar",
  "tour.skip": "Pular",
  "tour.next": "Próximo",
  "tour.done": "Entendi",
  "tour.stepOf": "{index} de {total}",

  "settings.title": "Ajustes",
  "settings.meta": "Conta e preferências de prática",
  "settings.appearance": "Aparência",
  "settings.theme": "Tema",
  "settings.themeSystem": "Sistema",
  "settings.themeDark": "Escuro",
  "settings.themeLight": "Claro",
  "settings.themeFollowing": "Segue seu dispositivo, que agora está em {theme}.",
  "settings.themeFixed": "Fixo, faça o que fizer seu dispositivo.",
  "settings.interfaceLanguage": "Idioma da interface",
  "settings.interfaceLanguageHint":
    "O idioma deste aplicativo. O que o entrevistador fala é escolhido em cada entrevista.",
  "settings.tour": "Tour guiado",
  "settings.tourHint": "O passo a passo mostrado na primeira vez que você abre uma sessão.",
  "settings.tourAgain": "Mostrar de novo",
  "settings.tourReset": "Vai aparecer da próxima vez",
};

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = {
  en: EN,
  es: ES,
  pt: PT,
};

/**
 * The locale to start in, from what the browser says it prefers.
 *
 * `navigator.language` is a full tag — "es-419", "pt-BR" — so it is matched on
 * the primary subtag. Anything we do not speak lands on English rather than
 * on a half-translated screen.
 */
export function localeFromNavigator(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const primary = tag.toLowerCase().split("-")[0];
    if (primary === "es" || primary === "pt" || primary === "en") return primary;
  }
  return "en";
}

export function storedLocale(raw: string | null): Locale | null {
  return raw === "en" || raw === "es" || raw === "pt" ? raw : null;
}

export function readLocale(): Locale {
  try {
    const stored = storedLocale(localStorage.getItem(LOCALE_KEY));
    if (stored) return stored;
  } catch {
    // Blocked storage. Fall through to what the browser prefers.
  }
  return localeFromNavigator(
    typeof navigator === "undefined" ? [] : (navigator.languages ?? [navigator.language]),
  );
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    /* It applies for this visit and is forgotten. */
  }
}

/**
 * Looks up a message, filling `{placeholders}` from `values`.
 *
 * A missing key returns the English string rather than the key itself: a
 * screen that says "call.turnOf" is broken in a way that reaches the
 * candidate, and an English word in a Spanish sentence is merely untidy.
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  values?: Record<string, string | number>,
): string {
  const template = DICTIONARIES[locale][key] ?? EN[key];
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}

export { EN as EN_MESSAGES, DICTIONARIES };
