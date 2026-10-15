/**
 * The terms and the privacy policy.
 *
 * Kept out of the interface dictionary because it is long-form prose rather
 * than labels, and because it changes for a different reason — a legal review,
 * not a copy edit.
 *
 * Two rules held while writing this.
 *
 * Every factual claim about data is checked against the code rather than
 * copied from a template. The subprocessor list is the vendors the server
 * actually calls; the deletion section describes what `DELETE /api/account`
 * actually does, including the one thing it deliberately does not erase; and
 * the analytics line says exactly what PostHog receives (see
 * lib/analytics.ts), not what would sound better.
 *
 * And nothing here invents a legal fact. The entity, its country, the contact
 * address and the retention period are things only the operator knows, so they
 * are placeholders — and the page refuses to look finished while they are
 * still placeholders. A privacy policy naming the wrong company under the
 * wrong law is worse than an obviously unfinished one.
 */

/**
 * The languages the terms and the privacy policy exist in.
 *
 * Deliberately fewer than the interface has. A legal document is a set of
 * binding claims about who is responsible and what happens to someone's data,
 * and a machine translation of one is eleven documents nobody has read making
 * claims nobody has checked. The interface can afford a rough translation;
 * this cannot.
 *
 * Everything else falls back to English, which is what `legalLocale` is for.
 */
export type Locale = "en" | "es" | "pt";

/** Maps any interface language onto a language these documents exist in. */
export function legalLocale(locale: string): Locale {
  return locale === "es" || locale === "pt" ? locale : "en";
}

/**
 * The facts only the operator can supply.
 *
 * Fill these in and the draft banner disappears on its own. Leave any of them
 * and every legal page says, at the top and in the reader's language, that it
 * is not finished.
 */
export const OPERATOR = {
  /** The legal entity: a registered company, or a person trading under a name. */
  entity: "Mockio",
  /** Where a person writes to exercise their rights. */
  email: "hello@getmockio.com",
} as const;

/**
 * The two values that are facts in one language and translations in another.
 *
 * A country and a duration read as part of the sentence around them, so
 * holding them as one string would put "Perú" and "24 meses" in the middle of
 * the English document. Everything else about the operator — a company name,
 * an address — is the same word everywhere and stays in `OPERATOR`.
 */
const COUNTRY: Record<Locale, string> = {
  en: "Peru",
  es: "Perú",
  pt: "Peru",
};

const RETENTION: Record<Locale, string> = {
  en: "24 months",
  es: "24 meses",
  pt: "24 meses",
};

export const PLACEHOLDER = "[COMPLETAR";

export function isDraft(): boolean {
  const values = [
    ...Object.values(OPERATOR),
    ...Object.values(COUNTRY),
    ...Object.values(RETENTION),
  ];
  return values.some((value) => value.includes(PLACEHOLDER));
}

/** Last substantive change. Update it when the text changes, not on deploy. */
export const UPDATED = "2026-10-15";

export interface LegalSection {
  heading: string;
  /** Paragraphs. A nested array renders as a bulleted list. */
  body: (string | string[])[];
}

export interface LegalDocument {
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
}

const DRAFT_NOTICE: Record<Locale, string> = {
  en: "This document is not finished. The operator's legal name, country, contact address and retention period are still placeholders, and it must not be published in this state.",
  es: "Este documento no está terminado. La razón social, el país, el correo de contacto y el plazo de conservación siguen siendo marcadores, y no debe publicarse así.",
  pt: "Este documento não está finalizado. A razão social, o país, o e-mail de contato e o prazo de retenção ainda são marcadores, e ele não deve ser publicado assim.",
};

export function draftNotice(locale: Locale): string {
  return DRAFT_NOTICE[locale];
}

const UPDATED_LABEL: Record<Locale, string> = {
  en: "Last updated",
  es: "Última actualización",
  pt: "Última atualização",
};

export function updatedLabel(locale: Locale): string {
  return UPDATED_LABEL[locale];
}

/* ── Privacy ─────────────────────────────────────────────────────────── */

const PRIVACY: Record<Locale, LegalDocument> = {
  en: {
    title: "Privacy",
    updated: UPDATED,
    intro: `Mockio is operated by ${OPERATOR.entity}, in ${COUNTRY.en}. This describes what we hold, why, and how to get rid of it. It is written to be read rather than to be defensible.`,
    sections: [
      {
        heading: "What we collect",
        body: [
          "Only what the product needs to work, plus a minimal measure of how the site is used (see PostHog under Who else processes it). There is no advertising and nothing that follows you across other websites.",
          [
            "Your email address and a hash of your password, if you create an account. We never store the password itself.",
            "Your interviews: the questions asked, your answers as text, the score and written feedback, and measurements taken from your speech such as pace and filler rate.",
            "What you told the interviewer to expect — your target role, sector, company, and interview language.",
            "A CV or portfolio you choose to upload, and the short brief written from it. We keep both.",
            "Portfolio links you enter. We store them as text and do not visit them.",
            "Your XP, level and badges.",
            "If you turn your camera on during a session, a few small still frames are sent to the AI provider to read your camera presence — eye contact, posture, framing. The frames are not stored; only that reading is kept with the session.",
            "Subscription status, if you pay. Card details never reach us — see Payments.",
          ],
          "If you ask for a rehearsal to be filmed, the film is saved only in your own browser, on your device. It never reaches us, and clearing the browser's data deletes it.",
        ],
      },
      {
        heading: "Why we hold it",
        body: [
          "Your transcripts and scores exist so you can read your own feedback and see whether you are improving across sessions. That is the product; without keeping them there is nothing to compare.",
          "Your email exists to sign you in, to send you a password reset, and to tell you about your own account. We do not send marketing to it.",
          "Your CV exists so the interviewer asks about what you actually did. It is sent to the model that runs your interview, and to nobody else.",
        ],
      },
      {
        heading: "Who else processes it",
        body: [
          "Running an interview means sending your words to other companies. These are all of them, and what each one receives:",
          [
            "Render — hosting and the database. Everything above is stored on their infrastructure, in the United States.",
            "OpenRouter — routes your interview to the language model that answers. It receives the interview prompt and the conversation, which includes your answers and your CV brief.",
            "Deepgram — speech. It receives your microphone audio to transcribe, and the interviewer's text to speak aloud.",
            "Your browser — speech, when Deepgram is not in use. The browser's own speech recognition then handles your microphone, which in Chrome means Google receives the audio, and some of the voices that read the interviewer aloud are Google's too. Firefox cannot do this at all, and typing always works instead.",
            "Resend — email delivery. It receives your address and the contents of account emails.",
            "PostHog — product analytics, on servers in the United States. It receives which screens are opened, a handful of events we name ourselves (an account was created, an interview or rehearsal was started and finished, a purchase began), and heatmaps: where on a page people click and how far they scroll, as positions, never the text under them. When you are signed in these are tied to an internal account number, never your email. It never receives your answers, your transcript, your CV or your thesis, there is no session recording, and no cookie is set — the anonymous identifier is discarded when you close the tab. To opt out, turn on \"Do Not Track\" in your browser: PostHog then receives nothing.",
            "Google Cloud — speech in Brazilian Portuguese. When a rehearsal is in Portuguese, the jury's lines are sent to Google to be read aloud. It receives that text only, never your voice or your thesis.",
            "Mercado Pago — payments, if you subscribe. The card form now sits on our own page, but the card itself is not: Mercado Pago's script sends it straight from your browser to them and returns a single-use token, which is the only thing our servers ever receive. We hold a subscription status and nothing more.",
            "Paddle — payments outside Peru. Paddle is the seller of record: it receives your card and billing details directly, handles the taxes, and tells us only whether the payment went through.",
          ],
          "We do not sell your data, and we do not share it with anyone not on this list.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          `Interviews and their feedback are kept for ${RETENTION.en} from the day they finish, unless you delete them sooner. Your account details are kept while the account exists.`,
          "In-flight interview state and rate-limit counters live in a cache that expires on its own within hours.",
        ],
      },
      {
        heading: "Deleting everything",
        body: [
          "Settings → Delete account. It is immediate and there is no undo. It removes your interviews, transcripts and evaluations; your progress, XP, level and badges; your CV, your links and the brief written from them; your preferences; and it cancels any subscription first.",
          "One thing survives, and you should know why. Questions you contributed to the shared bank are not linked to you — what is stored beside them is a one-way hash that cannot be turned back into your identity — so there is nothing of yours left in them to remove, and deleting them would take away something other candidates rely on.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          `Write to ${OPERATOR.email} and we will answer. You can ask for a copy of what we hold, ask us to correct it, or ask us to erase it — though deleting your account already does the last one, immediately and without asking anyone.`,
        ],
      },
      {
        heading: "Your thesis",
        body: [
          "A thesis you upload for the defence simulator is unpublished work, and we treat it as confidential.",
          [
            "We keep its text, page by page, and the diagnosis, slide review and study material written from it, so the jury can quote your pages.",
            "It is used only for your own rehearsals. It is never used to train any model, never shown to another user, and never published.",
            "The AI providers that read it to run your rehearsals process it under the same terms as your interviews (see Who else processes it).",
            "You can delete it with one click on the thesis screen; that removes the text and everything written from it. Deleting your account removes it too.",
            "If you link a thesis advisor and choose to share your progress, they see your thesis title, the number of rehearsals, your grades and your readiness — never the thesis text or your answers. You can stop sharing at any time.",
          ],
        ],
      },
      {
        heading: "Group defences",
        body: [
          "When you invite classmates to a group defence, this is what happens to their data, and to yours:",
          [
            "Each member joins with the name they choose. The call's room — the names, and the state of the rehearsal on screen — lives in our server's memory only, and disappears within three hours.",
            "Cameras and voices go directly between the participants' devices. To connect, the devices exchange their network (IP) addresses with each other and use Google's STUN servers to find one another; the video and audio never pass through our servers.",
            "A member's spoken answer is transcribed by their own browser (in Chrome, Google receives that audio) and the text is sent to the host, where it becomes part of the host's rehearsal, under the member's name, like any answer.",
            "At the end, the members can read the simulated record of that rehearsal, including each member's simulated grade and feedback. They never see the transcript, the thesis or the host's account.",
          ],
        ],
      },
      {
        heading: "Cookies",
        body: [
          "One cookie, and it is how you stay signed in. It carries a signed identifier and nothing else. There are no advertising or analytics cookies, which is why this site has no cookie banner: there is nothing to consent to.",
          "Your theme, interface language and a few rehearsal preferences (your university, country format and fluency setting) are stored in your browser and never sent to us on their own.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "If this changes in a way that affects you, we will say so by email before it takes effect.",
        ],
      },
    ],
  },

  es: {
    title: "Privacidad",
    updated: UPDATED,
    intro: `Mockio es operado por ${OPERATOR.entity}, en ${COUNTRY.es}. Acá está qué guardamos, para qué, y cómo borrarlo. Está escrito para que se lea, no para defenderse.`,
    sections: [
      {
        heading: "Qué recolectamos",
        body: [
          "Solo lo que el producto necesita para funcionar, más una medición mínima de cómo se usa el sitio (ver PostHog en Quién más lo procesa). No hay publicidad ni nada que te siga por otros sitios web.",
          [
            "Tu correo y un hash de tu contraseña, si creas una cuenta. Nunca guardamos la contraseña.",
            "Tus entrevistas: las preguntas, tus respuestas en texto, el puntaje y la devolución escrita, y mediciones tomadas de tu habla como el ritmo y las muletillas.",
            "Lo que le dijiste al entrevistador: tu rol objetivo, sector, empresa e idioma de la entrevista.",
            "El CV o portfolio que decidas subir, y el resumen corto escrito a partir de él. Guardamos los dos.",
            "Los enlaces de portfolio que ingreses. Los guardamos como texto y no los visitamos.",
            "Tu XP, nivel e insignias.",
            "Si enciendes la cámara durante una sesión, unas pocas imágenes fijas pequeñas se envían al proveedor de IA para leer tu presencia en cámara: contacto visual, postura, encuadre. Las imágenes no se guardan; solo se guarda esa lectura con la sesión.",
            "El estado de tu suscripción, si pagas. Los datos de tu tarjeta nunca llegan a nosotros: ver Pagos.",
          ],
          "Si pides grabar un ensayo, la grabación se guarda solo en tu propio navegador, en tu dispositivo. Nunca nos llega, y borrar los datos del navegador la elimina.",
        ],
      },
      {
        heading: "Por qué lo guardamos",
        body: [
          "Tus transcripciones y puntajes existen para que puedas leer tu propia devolución y ver si estás mejorando entre sesiones. Eso es el producto; sin guardarlas no hay nada que comparar.",
          "Tu correo existe para iniciar sesión, para mandarte un restablecimiento de contraseña y para hablarte de tu propia cuenta. No te mandamos marketing.",
          "Tu CV existe para que el entrevistador pregunte por lo que realmente hiciste. Se le envía al modelo que corre tu entrevista, y a nadie más.",
        ],
      },
      {
        heading: "Quién más lo procesa",
        body: [
          "Correr una entrevista significa mandar tus palabras a otras empresas. Estas son todas, y qué recibe cada una:",
          [
            "Render — hosting y base de datos. Todo lo anterior se guarda en su infraestructura, en Estados Unidos.",
            "OpenRouter — enruta tu entrevista al modelo de lenguaje que responde. Recibe el prompt y la conversación, que incluye tus respuestas y el resumen de tu CV.",
            "Deepgram — voz. Recibe el audio de tu micrófono para transcribirlo, y el texto del entrevistador para decirlo en voz alta.",
            "Tu navegador — voz, cuando no se usa Deepgram. En ese caso el reconocimiento de voz del propio navegador procesa tu micrófono: en Chrome eso significa que Google recibe el audio, y algunas de las voces que leen al entrevistador también son de Google. Firefox no puede hacerlo, y escribir siempre funciona.",
            "Resend — envío de correo. Recibe tu dirección y el contenido de los mails de cuenta.",
            "PostHog — analítica de producto, en servidores de Estados Unidos. Recibe qué pantallas se abren, un puñado de eventos que nombramos nosotros (se creó una cuenta, se empezó y terminó una entrevista o un ensayo, empezó una compra) y mapas de calor: en qué parte de la página se hace clic y hasta dónde se baja, como posiciones, nunca el texto que hay debajo. Si iniciaste sesión, esto se asocia a un número interno de cuenta, nunca a tu correo. Nunca recibe tus respuestas, tu transcripción, tu CV ni tu tesis, no graba la sesión y no deja ninguna cookie: el identificador anónimo se descarta al cerrar la pestaña. Para excluirte, activa \"No rastrear\" (Do Not Track) en tu navegador: PostHog entonces no recibe nada.",
            "Google Cloud — voz en portugués de Brasil. Cuando un ensayo es en portugués, las frases del jurado se envían a Google para leerlas en voz alta. Recibe solo ese texto, nunca tu voz ni tu tesis.",
            "Mercado Pago — pagos, si te suscribes. El formulario de tarjeta ahora está en nuestra propia página, pero la tarjeta no: el script de Mercado Pago la manda directo de tu navegador a ellos y devuelve un token de un solo uso, que es lo único que llega a nuestros servidores. Nosotros guardamos un estado de suscripción y nada más.",
            "Paddle — pagos fuera de Perú. Paddle es el vendedor registrado: recibe directamente tu tarjeta y tus datos de facturación, se encarga de los impuestos, y a nosotros solo nos dice si el pago salió bien.",
          ],
          "No vendemos tus datos, y no los compartimos con nadie fuera de esta lista.",
        ],
      },
      {
        heading: "Cuánto tiempo lo guardamos",
        body: [
          `Las entrevistas y sus devoluciones se guardan por ${RETENTION.es} desde el día en que terminan, salvo que las borres antes. Los datos de tu cuenta se guardan mientras la cuenta exista.`,
          "El estado de las entrevistas en curso y los contadores de límite viven en un caché que expira solo en cuestión de horas.",
        ],
      },
      {
        heading: "Borrar todo",
        body: [
          "Ajustes → Eliminar cuenta. Es inmediato y no se puede deshacer. Borra tus entrevistas, transcripciones y evaluaciones; tu progreso, XP, nivel e insignias; tu CV, tus enlaces y el resumen escrito a partir de ellos; tus preferencias; y cancela primero cualquier suscripción.",
          "Una cosa sobrevive, y conviene que sepas por qué. Las preguntas que aportaste al banco compartido no están ligadas a ti: lo que se guarda al lado es un hash de una sola vía que no se puede revertir para saber quién eres, así que no queda nada tuyo en ellas para borrar, y eliminarlas le quitaría a otros candidatos algo en lo que se apoyan.",
        ],
      },
      {
        heading: "Tus derechos",
        body: [
          `Escribe a ${OPERATOR.email} y te respondemos. Puedes pedir una copia de lo que tenemos, pedir que lo corrijamos, o pedir que lo borremos, aunque eliminar tu cuenta ya hace lo último, en el momento y sin pedirle permiso a nadie.`,
        ],
      },
      {
        heading: "Tu tesis",
        body: [
          "La tesis que subes al simulador de sustentación es un trabajo inédito, y la tratamos como confidencial.",
          [
            "Guardamos su texto, página por página, y el diagnóstico, la revisión de diapositivas y el material de repaso hechos a partir de ella, para que el jurado pueda citar tus páginas.",
            "Se usa solo para tus propios ensayos. Nunca se usa para entrenar ningún modelo, nunca se muestra a otro usuario y nunca se publica.",
            "Los proveedores de IA que la leen para hacer tus ensayos la procesan en los mismos términos que tus entrevistas (ver Quién más lo procesa).",
            "Puedes borrarla con un clic en la pantalla de tu tesis; eso elimina el texto y todo lo generado a partir de ella. Borrar tu cuenta también la elimina.",
            "Si te vinculas con tu asesor y eliges compartir tu avance, él ve el título de tu tesis, cuántos ensayos hiciste, tus notas y tu índice de preparación; nunca el texto de la tesis ni tus respuestas. Puedes dejar de compartir cuando quieras.",
          ],
        ],
      },
      {
        heading: "Sustentaciones grupales",
        body: [
          "Cuando invitas a compañeros a una sustentación grupal, esto pasa con sus datos y con los tuyos:",
          [
            "Cada integrante entra con el nombre que elige. La sala de la llamada —los nombres y el estado del ensayo en pantalla— vive solo en la memoria de nuestro servidor y desaparece en un máximo de tres horas.",
            "Las cámaras y las voces van directamente entre los dispositivos de los participantes. Para conectarse, los dispositivos intercambian sus direcciones de red (IP) entre sí y usan los servidores STUN de Google para encontrarse; el video y el audio nunca pasan por nuestros servidores.",
            "La respuesta hablada de un integrante la transcribe su propio navegador (en Chrome, Google recibe ese audio) y el texto se envía al anfitrión, donde pasa a ser parte del ensayo del anfitrión, con el nombre del integrante, como cualquier respuesta.",
            "Al terminar, los integrantes pueden leer el acta simulada de ese ensayo, con la nota y la devolución simuladas de cada integrante. Nunca ven la transcripción, la tesis ni la cuenta del anfitrión.",
          ],
        ],
      },
      {
        heading: "Cookies",
        body: [
          "Una cookie, y es la que te mantiene con sesión iniciada. Lleva un identificador firmado y nada más. No hay cookies de publicidad ni de analítica, y por eso este sitio no tiene banner de cookies: no hay nada que consentir.",
          "Tu tema, tu idioma de interfaz y algunas preferencias de ensayo (tu universidad, el formato de país y la opción de fluidez) se guardan en tu navegador y no nos llegan por sí solas.",
        ],
      },
      {
        heading: "Cambios",
        body: [
          "Si esto cambia de una forma que te afecte, te lo decimos por correo antes de que entre en vigencia.",
        ],
      },
    ],
  },

  pt: {
    title: "Privacidade",
    updated: UPDATED,
    intro: `O Mockio é operado por ${OPERATOR.entity}, em ${COUNTRY.pt}. Aqui está o que guardamos, para quê, e como apagar. Foi escrito para ser lido, não para se defender.`,
    sections: [
      {
        heading: "O que coletamos",
        body: [
          "Só o que o produto precisa para funcionar, mais uma medição mínima de como o site é usado (veja PostHog em Quem mais processa). Não há publicidade nem nada que siga você por outros sites.",
          [
            "Seu e-mail e um hash da sua senha, se você criar uma conta. Nunca guardamos a senha em si.",
            "Suas entrevistas: as perguntas, suas respostas em texto, a nota e a devolutiva escrita, e medições da sua fala como ritmo e vícios de linguagem.",
            "O que você disse ao entrevistador: seu cargo-alvo, setor, empresa e idioma da entrevista.",
            "O CV ou portfólio que você escolher enviar, e o resumo curto escrito a partir dele. Guardamos os dois.",
            "Os links de portfólio que você inserir. Guardamos como texto e não os visitamos.",
            "Seu XP, nível e selos.",
            "Se você ligar a câmera durante uma sessão, algumas imagens fixas pequenas são enviadas ao provedor de IA para ler sua presença na câmera: contato visual, postura, enquadramento. As imagens não são guardadas; só essa leitura fica com a sessão.",
            "O status da assinatura, se você pagar. Os dados do cartão nunca chegam até nós — ver Pagamentos.",
          ],
          "Se você pedir para gravar um ensaio, a gravação fica apenas no seu próprio navegador, no seu dispositivo. Ela nunca chega até nós, e apagar os dados do navegador a elimina.",
        ],
      },
      {
        heading: "Por que guardamos",
        body: [
          "Suas transcrições e notas existem para você ler a sua própria devolutiva e ver se está melhorando entre sessões. Isso é o produto; sem guardá-las não há o que comparar.",
          "Seu e-mail existe para entrar, para enviar uma redefinição de senha e para falar sobre a sua própria conta. Não enviamos marketing.",
          "Seu CV existe para que o entrevistador pergunte sobre o que você realmente fez. Ele é enviado ao modelo que conduz a sua entrevista, e a mais ninguém.",
        ],
      },
      {
        heading: "Quem mais processa",
        body: [
          "Conduzir uma entrevista significa enviar suas palavras a outras empresas. Estas são todas, e o que cada uma recebe:",
          [
            "Render — hospedagem e banco de dados. Tudo acima é guardado na infraestrutura deles, nos Estados Unidos.",
            "OpenRouter — encaminha sua entrevista ao modelo de linguagem que responde. Recebe o prompt e a conversa, que inclui suas respostas e o resumo do seu CV.",
            "Deepgram — voz. Recebe o áudio do seu microfone para transcrever, e o texto do entrevistador para falar em voz alta.",
            "Seu navegador — voz, quando o Deepgram não está em uso. Nesse caso o reconhecimento de voz do próprio navegador processa o seu microfone: no Chrome isso significa que o Google recebe o áudio, e algumas das vozes que leem o entrevistador também são do Google. O Firefox não consegue fazer isso, e digitar sempre funciona.",
            "Resend — envio de e-mail. Recebe seu endereço e o conteúdo dos e-mails da conta.",
            "PostHog — análise de produto, em servidores nos Estados Unidos. Recebe quais telas são abertas, alguns eventos que nomeamos (uma conta foi criada, uma entrevista ou ensaio começou e terminou, uma compra começou) e mapas de calor: onde na página as pessoas clicam e até onde rolam, como posições, nunca o texto embaixo. Se você entrou na conta, isso fica associado a um número interno, nunca ao seu e-mail. Nunca recebe suas respostas, sua transcrição, seu currículo nem seu trabalho, não grava a sessão e não deixa nenhum cookie: o identificador anônimo é descartado ao fechar a aba. Para sair, ative \"Não rastrear\" (Do Not Track) no seu navegador: o PostHog então não recebe nada.",
            "Google Cloud — voz em português do Brasil. Quando um ensaio é em português, as falas da banca são enviadas ao Google para serem lidas em voz alta. Ele recebe só esse texto, nunca a sua voz nem o seu trabalho.",
            "Mercado Pago — pagamentos, se você assinar. O formulário de cartão agora fica na nossa própria página, mas o cartão não: o script do Mercado Pago o envia direto do seu navegador para eles e devolve um token de uso único, que é a única coisa que chega aos nossos servidores. Guardamos um status de assinatura e nada mais.",
            "Paddle — pagamentos fora do Peru. A Paddle é a vendedora registrada: recebe diretamente seu cartão e seus dados de cobrança, cuida dos impostos e só nos diz se o pagamento deu certo.",
          ],
          "Não vendemos seus dados, e não os compartilhamos com ninguém fora desta lista.",
        ],
      },
      {
        heading: "Por quanto tempo guardamos",
        body: [
          `As entrevistas e suas devolutivas são guardadas por ${RETENTION.pt} a partir do dia em que terminam, a menos que você as apague antes. Os dados da sua conta ficam enquanto a conta existir.`,
          "O estado das entrevistas em andamento e os contadores de limite vivem em um cache que expira sozinho em questão de horas.",
        ],
      },
      {
        heading: "Apagar tudo",
        body: [
          "Configurações → Excluir conta. É imediato e não há como desfazer. Remove suas entrevistas, transcrições e avaliações; seu progresso, XP, nível e selos; seu CV, seus links e o resumo escrito a partir deles; suas preferências; e cancela antes qualquer assinatura.",
          "Uma coisa sobrevive, e vale saber por quê. As perguntas que você contribuiu ao banco compartilhado não estão ligadas a você — o que fica guardado ao lado delas é um hash de mão única que não pode ser revertido para dizer quem você é — então não sobra nada seu nelas para remover, e apagá-las tiraria de outros candidatos algo em que eles se apoiam.",
        ],
      },
      {
        heading: "Seus direitos",
        body: [
          `Escreva para ${OPERATOR.email} e respondemos. Você pode pedir uma cópia do que temos, pedir correção, ou pedir que apaguemos — embora excluir sua conta já faça a última coisa, na hora e sem pedir permissão a ninguém.`,
        ],
      },
      {
        heading: "Seu trabalho",
        body: [
          "O trabalho que você envia ao simulador de defesa é inédito, e o tratamos como confidencial.",
          [
            "Guardamos o texto, página por página, e o diagnóstico, a revisão dos slides e o material de revisão feitos a partir dele, para que a banca possa citar suas páginas.",
            "Ele é usado só nos seus próprios ensaios. Nunca é usado para treinar nenhum modelo, nunca é mostrado a outro usuário e nunca é publicado.",
            "Os provedores de IA que o leem para os seus ensaios o processam nos mesmos termos das suas entrevistas (veja Quem mais processa).",
            "Você pode apagá-lo com um clique na tela do trabalho; isso remove o texto e tudo o que foi gerado a partir dele. Apagar sua conta também o remove.",
            "Se você se vincular ao seu orientador e escolher compartilhar seu progresso, ele vê o título do trabalho, o número de ensaios, suas notas e seu índice de preparação; nunca o texto do trabalho nem suas respostas. Você pode parar de compartilhar quando quiser.",
          ],
        ],
      },
      {
        heading: "Defesas em grupo",
        body: [
          "Quando você convida colegas para uma defesa em grupo, isto é o que acontece com os dados deles e os seus:",
          [
            "Cada integrante entra com o nome que escolher. A sala da chamada — os nomes e o estado do ensaio na tela — fica apenas na memória do nosso servidor e desaparece em no máximo três horas.",
            "As câmeras e as vozes vão diretamente entre os dispositivos dos participantes. Para se conectar, os dispositivos trocam seus endereços de rede (IP) entre si e usam os servidores STUN do Google para se encontrar; o vídeo e o áudio nunca passam pelos nossos servidores.",
            "A resposta falada de um integrante é transcrita pelo próprio navegador dele (no Chrome, o Google recebe esse áudio) e o texto é enviado ao anfitrião, onde passa a fazer parte do ensaio do anfitrião, com o nome do integrante, como qualquer resposta.",
            "No final, os integrantes podem ler a ata simulada desse ensaio, com a nota e o feedback simulados de cada integrante. Eles nunca veem a transcrição, o trabalho nem a conta do anfitrião.",
          ],
        ],
      },
      {
        heading: "Cookies",
        body: [
          "Um cookie, e é o que mantém você conectado. Ele carrega um identificador assinado e nada mais. Não há cookies de publicidade nem de analytics, e é por isso que este site não tem banner de cookies: não há o que consentir.",
          "Seu tema, seu idioma de interface e algumas preferências de ensaio (sua universidade, o formato do país e a opção de fluência) ficam no seu navegador e não chegam até nós por si só.",
        ],
      },
      {
        heading: "Mudanças",
        body: [
          "Se isto mudar de uma forma que te afete, avisamos por e-mail antes de entrar em vigor.",
        ],
      },
    ],
  },
};

/* ── Terms ───────────────────────────────────────────────────────────── */

const TERMS: Record<Locale, LegalDocument> = {
  en: {
    title: "Terms",
    updated: UPDATED,
    intro: `An agreement between you and ${OPERATOR.entity}, in ${COUNTRY.en}, about using Mockio. Using it means accepting these.`,
    sections: [
      {
        heading: "What Mockio is, and what it is not",
        body: [
          "Mockio is a practice tool. It lets you rehearse, out loud and under some pressure, two moments that are hard to rehearse alone: defending a thesis before a jury, and a job interview. Afterwards it tells you how the rehearsal went.",
          "Everything in it is a simulation. The jurors and interviewers are fictional characters played by a language model, and their questions, opinions and grades are generated. None of it is a real defence, a real interview or a real evaluation, and none of it may be treated as one.",
          "In particular:",
          [
            "A rehearsal predicts nothing. A good one does not mean you will pass your defence or get the job, and a bad one does not mean you will not.",
            "The simulated record (acta), the grade, the readiness index and the per-member grades are estimates of the rehearsal, made by software. They are not an academic grade, they are not issued by any university, and they may not be presented as if they were.",
            "If you enter the names of your real jurors, or of a real company, the character that answers to that name is still a simulation. It does not know that person, does not speak for them, and its questions and opinions are not theirs.",
            "The questions are not the questions you will be asked. They are plausible examples. Questions reported by other students or candidates are unverified recollections, reviewed for plausibility, not confirmed by any university or employer.",
          ],
          "We are not a university, a recruiter or an employer, and we are not affiliated with, endorsed by or acting for any university or company named in the product, unless an institution has signed an agreement with us — and then only within that agreement.",
          "Stripe, Amazon, Airbnb, Mercado Libre, the universities in the product and every other organisation named here are named only to set the context of the practice: none of them takes part, and none of them sees anything you do here.",
          "The feedback is produced by a language model. It is often useful and it is sometimes wrong, incomplete or biased. Treat it as a second opinion, not as a verdict on you or on your work.",
        ],
      },
      {
        heading: "It does not replace people",
        body: [
          "Mockio is not a coaching, tutoring, academic advising, career guidance or psychological service, and it does not replace any of them. It is software for practising; it is not a professional giving you advice.",
          [
            "It does not replace your thesis advisor, your professors, your jury or your university's rules. What they say prevails over anything Mockio says.",
            "It does not replace a coach, a mentor, a career counsellor or a recruiter.",
            "The tips about nerves, posture or voice are practice suggestions, not medical or psychological advice. If anxiety is affecting your health, talk to a professional.",
          ],
          "Decisions you make about your thesis, your defence, your studies or your career are yours. Check anything important with the people responsible for it.",
        ],
      },
      {
        heading: "Your account",
        body: [
          "You must be 18 or older. One account per person. Keep your password safe: anything done from your account is treated as done by you.",
          "Rehearsing requires an account. The classmates you invite to a group defence join from your link without one; they are your guests, and the invitation is your responsibility.",
        ],
      },
      {
        heading: "The free plan",
        body: [
          "The free plan has limits, shown on the pricing page, so that we can keep offering it: each rehearsal costs us real money. We may change those limits; a change never takes away a rehearsal you have already paid for.",
        ],
      },
      {
        heading: "Paying",
        body: [
          "In Peru, payments go through Mercado Pago. Elsewhere, through Paddle, which acts as the seller of record and handles taxes. We never see or store your card details.",
          "Subscriptions renew until you cancel. You can cancel at any time from Settings; you keep the paid plan until the end of the period already paid, and we do not refund partial periods.",
          "Defence packs and passes are one-off payments, not subscriptions. The rehearsals in a pack expire at the end of the stated period, and unused ones are not refunded after that date.",
          "If a pack or pass did not help you, ask within 7 days of purchase at hello@getmockio.com and we refund it, no questions asked. This does not limit any right the consumer law of your country gives you.",
          "Early-access benefits are exactly what they say: a free period of the paid plan, tied to the address you gave us. They are not transferable and have no cash value.",
        ],
      },
      {
        heading: "Prices",
        body: [
          "We may change prices. If we do, we email you at least 30 days before it applies to you, and you can cancel before then. A price change never applies retroactively to a period already paid.",
        ],
      },
      {
        heading: "Thesis defence rehearsals",
        body: [
          "Mockio helps you rehearse; it does not write, correct or approve your thesis. It must never be used during a real defence or exam to receive answers.",
          [
            "The thesis you upload is used to prepare your rehearsals, as described in the privacy policy. You confirm you have the right to upload it.",
            "If you share questions from your real defence, you confirm they contain no names of people and no confidential information; they are reviewed before any rehearsal uses them, anonymously.",
          ],
        ],
      },
      {
        heading: "Group defences, calls and recordings",
        body: [
          "In a group defence the person who starts the rehearsal hosts it and invites the other members with a link. By sending it, the host confirms those members agreed to take part.",
          [
            "Cameras and voices travel directly between the participants' devices: the call's video and audio do not pass through our servers and we do not store them. As in any rehearsal, the spoken answers are transcribed (by the browser or by our voice provider) and a few still frames of the host's camera may be read for the presence feedback, as the privacy policy explains.",
            "If the host asks to film the rehearsal, the film is saved only on the host's device. The host must have the consent of everyone who appears in it before filming, and is responsible for what they do with it.",
            "At the end, each member sees the simulated record of that rehearsal, including every member's simulated grade. Joining a group defence means accepting that the group sees it.",
            "Do not invite anyone under 18, and do not use the call for anything other than rehearsing.",
          ],
        ],
      },
      {
        heading: "Affiliates and advisors",
        body: [
          "Advisors and affiliates who recommend Mockio earn a commission on purchases by the students they referred. It does not change the student's price, and they only see a student's progress if the student chooses to share it.",
          [
            "A commission becomes payable 7 days after the purchase, once it can no longer be refunded.",
            "Payable commissions are paid monthly, by the 10th, once they reach the minimum shown in your affiliate panel.",
            "We may void commissions on purchases that were refunded or charged back, that are fraudulent, or that you made yourself or through accounts you control. We tell you when we do.",
            "Affiliates may not present themselves as Mockio, promise results, or advertise with misleading claims.",
          ],
          "Affiliates are independent. Nothing in the programme makes them our employees, agents or partners, and they are responsible for their own taxes.",
        ],
      },
      {
        heading: "Universities and institutions",
        body: [
          "A university or institution can offer Mockio to its students under a separate agreement, including through its learning platform. Where that agreement says something different from these terms, the agreement prevails for that institution's students. What the institution may see is set by that agreement and by the privacy policy.",
        ],
      },
      {
        heading: "Contributed questions",
        body: [
          "If you report a question you were asked in a real interview or defence, you are telling us it is genuine, that you are free to share it, and that it contains no confidential information and names no one.",
          "You give us permission to show it to others and to use it as material for generated rehearsals. Contributions are reviewed by a person before use, and we may reject or remove any of them.",
        ],
      },
      {
        heading: "What you may not do",
        body: [
          [
            "Resell, redistribute or republish the rehearsals, questions or feedback as a product of your own.",
            "Automate access, scrape the service, or work around the free plan's limits.",
            "Upload anyone else's thesis or CV, or anything you do not have the right to share.",
            "Present a simulated record or grade as an official one, or use Mockio to cheat in a real defence, exam or interview.",
            "Try to extract the system prompts, or use the jury or the interviewer for anything other than practising.",
          ],
          "We may suspend an account that does this. If we do, we tell you why.",
        ],
      },
      {
        heading: "Availability",
        body: [
          "We will keep the service running and do not promise it will never break. It depends on other companies — hosting, the model provider, the voice provider, the payment providers — and any of them can have a bad day. We owe no compensation for a rehearsal you could not run.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "Mockio is provided as it is. To the extent the law allows, we are not responsible for the result of your defence, your grades, your degree, a job you did not get, or any decision you made relying on a simulation or its feedback.",
          "To the extent the law allows, our total liability to you is limited to what you paid us in the twelve months before the claim. Nothing in these terms limits a right that the consumer law of your country does not allow to be limited.",
        ],
      },
      {
        heading: "Ending it",
        body: [
          "You can delete your account at any time from Settings, which erases your data as described in the privacy policy. We may close an account that breaks these terms, and refund any unused paid period if we close it for a reason that was not your fault.",
        ],
      },
      {
        heading: "Changes and governing law",
        body: [
          "If we change these terms in a way that matters, we tell you by email or in the product before the change applies. Continuing to use Mockio after that means accepting them.",
          `These terms are governed by the law of ${COUNTRY.en}, and disputes go to its courts, without prejudice to any consumer protection you have where you live.`,
          `Questions: ${OPERATOR.email}.`,
        ],
      },
    ],
  },

  es: {
    title: "Términos",
    updated: UPDATED,
    intro: `Un acuerdo entre tú y ${OPERATOR.entity}, en ${COUNTRY.es}, sobre el uso de Mockio. Usarlo significa aceptarlos.`,
    sections: [
      {
        heading: "Qué es Mockio, y qué no es",
        body: [
          "Mockio es una herramienta de práctica. Te permite ensayar, en voz alta y con algo de presión, dos momentos difíciles de ensayar solo: sustentar una tesis ante un jurado y una entrevista de trabajo. Después te dice cómo salió el ensayo.",
          "Todo lo que hay aquí es una simulación. Los jurados y los entrevistadores son personajes ficticios interpretados por un modelo de lenguaje, y sus preguntas, opiniones y notas son generadas. Nada de esto es una sustentación real, una entrevista real ni una evaluación real, ni puede tratarse como tal.",
          "En particular:",
          [
            "Un ensayo no predice nada. Que te vaya bien no significa que vayas a aprobar tu sustentación ni a conseguir el puesto, y que te vaya mal no significa lo contrario.",
            "El acta simulada, la nota, el índice de preparación y las notas por integrante son estimaciones del ensayo hechas por un software. No son una calificación académica, no las emite ninguna universidad y no pueden presentarse como si lo fueran.",
            "Si escribes los nombres de tu jurado real, o de una empresa real, el personaje que responde con ese nombre sigue siendo una simulación. No conoce a esa persona, no habla por ella, y sus preguntas y opiniones no son las suyas.",
            "Las preguntas no son las que te van a hacer. Son ejemplos plausibles. Las preguntas reportadas por otros estudiantes o candidatos son recuerdos sin verificar, revisados por verosimilitud y no confirmados por ninguna universidad ni empresa.",
          ],
          "No somos una universidad, ni un reclutador, ni un empleador, y no estamos afiliados a ninguna universidad o empresa nombrada en el producto, ni respaldados por ellas, ni actuamos en su nombre, salvo cuando una institución firmó un acuerdo con nosotros, y solo dentro de ese acuerdo.",
          "Stripe, Amazon, Airbnb, Mercado Libre, las universidades que aparecen en el producto y cualquier otra organización nombrada aquí se nombran solo para dar contexto a la práctica: ninguna participa, y ninguna ve nada de lo que haces aquí.",
          "La devolución la produce un modelo de lenguaje. Suele ser útil y a veces se equivoca, es incompleta o tiene sesgos. Tómala como una segunda opinión, no como un veredicto sobre ti ni sobre tu trabajo.",
        ],
      },
      {
        heading: "No reemplaza a personas",
        body: [
          "Mockio no es un servicio de coaching, tutoría, asesoría académica, orientación vocacional o profesional, ni de atención psicológica, y no reemplaza a ninguno de ellos. Es un software para practicar, no un profesional que te asesora.",
          [
            "No reemplaza a tu asesor de tesis, a tus docentes, a tu jurado ni al reglamento de tu universidad. Lo que ellos digan prevalece sobre lo que diga Mockio.",
            "No reemplaza a un coach, mentor, orientador de carrera ni reclutador.",
            "Los consejos sobre nervios, postura o voz son sugerencias de práctica, no consejo médico ni psicológico. Si la ansiedad está afectando tu salud, habla con un profesional.",
          ],
          "Las decisiones sobre tu tesis, tu sustentación, tus estudios o tu carrera son tuyas. Verifica lo importante con las personas responsables.",
        ],
      },
      {
        heading: "Tu cuenta",
        body: [
          "Tienes que ser mayor de 18. Una cuenta por persona. Guarda la contraseña: todo lo que se haga desde tu cuenta se considera hecho por ti.",
          "Para ensayar necesitas una cuenta. Los compañeros que invitas a una sustentación grupal entran desde tu enlace sin cuenta; son tus invitados, y la invitación es tu responsabilidad.",
        ],
      },
      {
        heading: "El plan gratuito",
        body: [
          "El plan gratuito tiene límites, que se muestran en la página de precios, para poder seguir ofreciéndolo: cada ensayo nos cuesta dinero real. Podemos cambiar esos límites; un cambio nunca te quita un ensayo que ya pagaste.",
        ],
      },
      {
        heading: "Pagar",
        body: [
          "En Perú, los pagos se hacen con Mercado Pago. Fuera de Perú, con Paddle, que actúa como vendedor registrado y se encarga de los impuestos. Nunca vemos ni guardamos los datos de tu tarjeta.",
          "Las suscripciones se renuevan hasta que canceles. Puedes cancelar cuando quieras desde Ajustes; conservas el plan pago hasta el final del período ya pagado, y no devolvemos períodos parciales.",
          "Los packs y pases de sustentación son pagos únicos, no suscripciones. Los ensayos de un pack vencen al final del periodo indicado, y los no usados no se reembolsan después de esa fecha.",
          "Si un pack o pase no te sirvió, pídelo dentro de los 7 días de la compra a hello@getmockio.com y te devolvemos el dinero, sin preguntas. Esto no limita ningún derecho que te dé la ley de protección al consumidor de tu país.",
          "Los beneficios de acceso anticipado son exactamente lo que dicen: un período gratis del plan pago, atado a la dirección que nos diste. No son transferibles y no tienen valor en efectivo.",
        ],
      },
      {
        heading: "Precios",
        body: [
          "Podemos cambiar el precio. Si lo hacemos, te avisamos por correo al menos 30 días antes de que te aplique, y puedes cancelar antes. Un cambio de precio nunca se aplica retroactivamente a un período que ya pagaste.",
        ],
      },
      {
        heading: "Ensayos de sustentación",
        body: [
          "Mockio te ayuda a ensayar; no escribe, corrige ni aprueba tu tesis. Nunca debe usarse durante una sustentación o examen real para recibir respuestas.",
          [
            "La tesis que subes se usa para preparar tus ensayos, como explica la política de privacidad. Confirmas que tienes derecho a subirla.",
            "Si compartes preguntas de tu sustentación real, confirmas que no contienen nombres de personas ni información confidencial; se revisan antes de que algún ensayo las use, de forma anónima.",
          ],
        ],
      },
      {
        heading: "Sustentaciones grupales, llamadas y grabaciones",
        body: [
          "En una sustentación grupal, quien inicia el ensayo es el anfitrión e invita a los demás integrantes con un enlace. Al enviarlo, el anfitrión confirma que esos integrantes aceptaron participar.",
          [
            "Las cámaras y las voces viajan directamente entre los dispositivos de los participantes: el video y el audio de la llamada no pasan por nuestros servidores y no los guardamos. Como en cualquier ensayo, las respuestas habladas se transcriben (en el navegador o con nuestro proveedor de voz) y algunas imágenes fijas de la cámara del anfitrión pueden analizarse para la lectura de presencia, como explica la política de privacidad.",
            "Si el anfitrión pide grabar el ensayo, la grabación se guarda solo en su dispositivo. Antes de grabar debe tener el consentimiento de todos los que aparecen, y es responsable de lo que haga con ella.",
            "Al terminar, cada integrante ve el acta simulada de ese ensayo, con la nota simulada de cada integrante. Unirse a una sustentación grupal significa aceptar que el grupo la vea.",
            "No invites a menores de 18 años, y no uses la llamada para nada que no sea ensayar.",
          ],
        ],
      },
      {
        heading: "Afiliados y asesores",
        body: [
          "Los asesores y afiliados que recomiendan Mockio ganan una comisión por las compras de los alumnos que refirieron. No cambia el precio del alumno, y solo ven su avance si el alumno elige compartirlo.",
          [
            "Una comisión se vuelve pagable 7 días después de la compra, cuando ya no puede reembolsarse.",
            "Las comisiones pagables se pagan cada mes, hasta el día 10, cuando alcanzan el mínimo que muestra tu panel de afiliado.",
            "Podemos anular comisiones de compras reembolsadas o desconocidas, fraudulentas, o hechas por ti mismo o desde cuentas que controlas. Te avisamos cuando lo hacemos.",
            "Los afiliados no pueden presentarse como Mockio, prometer resultados ni anunciar con afirmaciones engañosas.",
          ],
          "Los afiliados son independientes. Nada del programa los convierte en nuestros empleados, agentes ni socios, y son responsables de sus propios impuestos.",
        ],
      },
      {
        heading: "Universidades e instituciones",
        body: [
          "Una universidad o institución puede ofrecer Mockio a sus estudiantes con un acuerdo aparte, incluso a través de su plataforma de cursos. Donde ese acuerdo diga algo distinto a estos términos, el acuerdo prevalece para los estudiantes de esa institución. Lo que la institución puede ver lo definen ese acuerdo y la política de privacidad.",
        ],
      },
      {
        heading: "Preguntas aportadas",
        body: [
          "Si reportas una pregunta que te hicieron en una entrevista o sustentación real, nos estás diciendo que es genuina, que eres libre de compartirla, y que no contiene información confidencial ni nombra a ninguna persona.",
          "Nos das permiso para mostrarla a otros y usarla como material para ensayos generados. Las contribuciones las revisa una persona antes de usarse, y podemos rechazar o eliminar cualquiera.",
        ],
      },
      {
        heading: "Qué no puedes hacer",
        body: [
          [
            "Revender, redistribuir o republicar los ensayos, preguntas o devoluciones como producto propio.",
            "Automatizar el acceso, hacer scraping del servicio, o esquivar los límites del plan gratuito.",
            "Subir la tesis o el CV de otra persona, o cualquier cosa que no tengas derecho a compartir.",
            "Presentar un acta o una nota simulada como si fuera oficial, o usar Mockio para hacer trampa en una sustentación, examen o entrevista real.",
            "Intentar extraer los prompts del sistema, o usar al jurado o al entrevistador para algo que no sea practicar.",
          ],
          "Podemos suspender una cuenta que haga esto. Si lo hacemos, te decimos por qué.",
        ],
      },
      {
        heading: "Disponibilidad",
        body: [
          "Vamos a mantener el servicio funcionando y no prometemos que nunca se rompa. Depende de otras empresas —el hosting, el proveedor de modelos, el de voz, los de pago— y cualquiera puede tener un mal día. No te debemos compensación por un ensayo que no pudiste hacer.",
        ],
      },
      {
        heading: "Responsabilidad",
        body: [
          "Mockio se ofrece tal como está. En la medida en que la ley lo permita, no somos responsables del resultado de tu sustentación, de tus notas, de tu grado, de un trabajo que no conseguiste, ni de decisiones que tomaste confiando en una simulación o en su devolución.",
          "En la medida en que la ley lo permita, nuestra responsabilidad total hacia ti se limita a lo que nos pagaste en los doce meses anteriores al reclamo. Nada en estos términos limita un derecho que la ley de protección al consumidor de tu país no permita limitar.",
        ],
      },
      {
        heading: "Terminar",
        body: [
          "Puedes eliminar tu cuenta cuando quieras desde Ajustes, lo que borra tus datos como se describe en la política de privacidad. Podemos cerrar una cuenta que incumpla estos términos, y devolvemos el período pago sin usar si lo hacemos por una razón que no fue culpa tuya.",
        ],
      },
      {
        heading: "Cambios y ley aplicable",
        body: [
          "Si cambiamos estos términos de una forma que importe, te avisamos por correo o en el producto antes de que el cambio aplique. Seguir usando Mockio después significa aceptarlos.",
          `Estos términos se rigen por la ley de ${COUNTRY.es}, y las disputas van a sus tribunales, sin perjuicio de la protección al consumidor que te corresponda donde vives.`,
          `Consultas: ${OPERATOR.email}.`,
        ],
      },
    ],
  },

  pt: {
    title: "Termos",
    updated: UPDATED,
    intro: `Um acordo entre você e ${OPERATOR.entity}, em ${COUNTRY.pt}, sobre o uso do Mockio. Usá-lo significa aceitá-los.`,
    sections: [
      {
        heading: "O que é o Mockio, e o que ele não é",
        body: [
          "O Mockio é uma ferramenta de prática. Ele permite ensaiar, em voz alta e com alguma pressão, dois momentos difíceis de ensaiar sozinho: defender um trabalho diante de uma banca e uma entrevista de emprego. Depois, ele diz como foi o ensaio.",
          "Tudo aqui é uma simulação. Os membros da banca e os entrevistadores são personagens fictícios interpretados por um modelo de linguagem, e suas perguntas, opiniões e notas são geradas. Nada disso é uma defesa real, uma entrevista real ou uma avaliação real, nem pode ser tratado como tal.",
          "Em especial:",
          [
            "Um ensaio não prevê nada. Ir bem não significa que você será aprovado na defesa nem que conseguirá a vaga, e ir mal não significa o contrário.",
            "A ata simulada, a nota, o índice de preparo e as notas por integrante são estimativas do ensaio feitas por um software. Não são uma nota acadêmica, não são emitidas por nenhuma universidade e não podem ser apresentadas como se fossem.",
            "Se você escrever os nomes da sua banca real, ou de uma empresa real, o personagem que responde com esse nome continua sendo uma simulação. Ele não conhece essa pessoa, não fala por ela, e as perguntas e opiniões não são dela.",
            "As perguntas não são as que vão fazer a você. São exemplos plausíveis. As perguntas relatadas por outros estudantes ou candidatos são lembranças não verificadas, revisadas por plausibilidade e não confirmadas por nenhuma universidade ou empresa.",
          ],
          "Não somos uma universidade, um recrutador ou um empregador, e não somos afiliados, endossados nem agimos em nome de nenhuma universidade ou empresa citada no produto, exceto quando uma instituição assinou um acordo conosco, e apenas dentro desse acordo.",
          "Stripe, Amazon, Airbnb, Mercado Libre, as universidades que aparecem no produto e qualquer outra organização citada aqui são citadas só para dar contexto à prática: nenhuma participa, e nenhuma vê nada do que você faz aqui.",
          "O feedback é produzido por um modelo de linguagem. Costuma ser útil e às vezes erra, é incompleto ou tem vieses. Trate-o como uma segunda opinião, não como um veredito sobre você ou seu trabalho.",
        ],
      },
      {
        heading: "Não substitui pessoas",
        body: [
          "O Mockio não é um serviço de coaching, tutoria, orientação acadêmica, orientação de carreira ou atendimento psicológico, e não substitui nenhum deles. É um software para praticar, não um profissional que orienta você.",
          [
            "Não substitui seu orientador, seus professores, sua banca nem o regulamento da sua universidade. O que eles disserem prevalece sobre o que o Mockio disser.",
            "Não substitui um coach, mentor, orientador de carreira ou recrutador.",
            "As dicas sobre nervosismo, postura ou voz são sugestões de prática, não conselho médico ou psicológico. Se a ansiedade estiver afetando sua saúde, procure um profissional.",
          ],
          "As decisões sobre seu trabalho, sua defesa, seus estudos ou sua carreira são suas. Confirme o que for importante com as pessoas responsáveis.",
        ],
      },
      {
        heading: "Sua conta",
        body: [
          "Você precisa ter 18 anos ou mais. Uma conta por pessoa. Guarde sua senha: tudo o que for feito na sua conta é considerado feito por você.",
          "Para ensaiar é preciso ter uma conta. Os colegas que você convida para uma defesa em grupo entram pelo seu link sem conta; são seus convidados, e o convite é sua responsabilidade.",
        ],
      },
      {
        heading: "O plano gratuito",
        body: [
          "O plano gratuito tem limites, mostrados na página de preços, para que possamos continuar oferecendo-o: cada ensaio nos custa dinheiro de verdade. Podemos mudar esses limites; uma mudança nunca tira um ensaio que você já pagou.",
        ],
      },
      {
        heading: "Pagamento",
        body: [
          "No Peru, os pagamentos são feitos pelo Mercado Pago. Fora do Peru, pela Paddle, que atua como vendedora registrada e cuida dos impostos. Nunca vemos nem guardamos os dados do seu cartão.",
          "As assinaturas se renovam até você cancelar. Você pode cancelar quando quiser em Ajustes; mantém o plano pago até o fim do período já pago, e não reembolsamos períodos parciais.",
          "Os pacotes e passes de defesa são pagamentos únicos, não assinaturas. Os ensaios de um pacote vencem no fim do período indicado, e os não usados não são reembolsados depois dessa data.",
          "Se um pacote ou passe não serviu para você, peça em até 7 dias da compra em hello@getmockio.com e devolvemos o dinheiro, sem perguntas. Isso não limita nenhum direito que a lei de defesa do consumidor do seu país lhe dá.",
          "Os benefícios de acesso antecipado são exatamente o que dizem: um período grátis do plano pago, vinculado ao endereço que você nos deu. Não são transferíveis e não têm valor em dinheiro.",
        ],
      },
      {
        heading: "Preços",
        body: [
          "Podemos mudar o preço. Se mudarmos, avisamos por e-mail pelo menos 30 dias antes de ele se aplicar a você, e você pode cancelar antes. Uma mudança de preço nunca se aplica retroativamente a um período já pago.",
        ],
      },
      {
        heading: "Ensaios de defesa",
        body: [
          "O Mockio ajuda você a ensaiar; ele não escreve, corrige nem aprova seu trabalho. Nunca deve ser usado durante uma defesa ou prova real para receber respostas.",
          [
            "O trabalho que você envia é usado para preparar seus ensaios, como explica a política de privacidade. Você confirma que tem o direito de enviá-lo.",
            "Se você compartilhar perguntas da sua defesa real, confirma que não contêm nomes de pessoas nem informação confidencial; elas são revisadas antes de qualquer ensaio usá-las, de forma anônima.",
          ],
        ],
      },
      {
        heading: "Defesas em grupo, chamadas e gravações",
        body: [
          "Numa defesa em grupo, quem inicia o ensaio é o anfitrião e convida os outros integrantes com um link. Ao enviá-lo, o anfitrião confirma que esses integrantes aceitaram participar.",
          [
            "As câmeras e as vozes vão diretamente entre os dispositivos dos participantes: o vídeo e o áudio da chamada não passam pelos nossos servidores e não os guardamos. Como em qualquer ensaio, as respostas faladas são transcritas (no navegador ou pelo nosso provedor de voz) e algumas imagens fixas da câmera do anfitrião podem ser analisadas para a leitura de presença, como explica a política de privacidade.",
            "Se o anfitrião pedir para gravar o ensaio, a gravação fica apenas no dispositivo dele. Antes de gravar, ele precisa do consentimento de todos que aparecem, e é responsável pelo que fizer com ela.",
            "No final, cada integrante vê a ata simulada desse ensaio, com a nota simulada de cada integrante. Entrar numa defesa em grupo significa aceitar que o grupo a veja.",
            "Não convide menores de 18 anos, e não use a chamada para nada além de ensaiar.",
          ],
        ],
      },
      {
        heading: "Afiliados e orientadores",
        body: [
          "Orientadores e afiliados que recomendam o Mockio ganham uma comissão pelas compras dos alunos que indicaram. Isso não muda o preço do aluno, e eles só veem o progresso dele se o aluno escolher compartilhar.",
          [
            "Uma comissão se torna pagável 7 dias depois da compra, quando já não pode ser reembolsada.",
            "As comissões pagáveis são pagas todo mês, até o dia 10, quando atingem o mínimo mostrado no seu painel de afiliado.",
            "Podemos anular comissões de compras reembolsadas ou contestadas, fraudulentas, ou feitas por você mesmo ou por contas que você controla. Avisamos quando fizermos isso.",
            "Afiliados não podem se apresentar como o Mockio, prometer resultados nem anunciar com afirmações enganosas.",
          ],
          "Os afiliados são independentes. Nada no programa os torna nossos empregados, agentes ou sócios, e eles são responsáveis pelos próprios impostos.",
        ],
      },
      {
        heading: "Universidades e instituições",
        body: [
          "Uma universidade ou instituição pode oferecer o Mockio aos seus estudantes com um acordo à parte, inclusive pela sua plataforma de cursos. Onde esse acordo disser algo diferente destes termos, o acordo prevalece para os estudantes dessa instituição. O que a instituição pode ver é definido por esse acordo e pela política de privacidade.",
        ],
      },
      {
        heading: "Perguntas enviadas",
        body: [
          "Se você relatar uma pergunta que fizeram a você numa entrevista ou defesa real, está nos dizendo que ela é genuína, que você pode compartilhá-la, e que não contém informação confidencial nem cita ninguém.",
          "Você nos dá permissão para mostrá-la a outras pessoas e usá-la como material para ensaios gerados. As contribuições são revisadas por uma pessoa antes do uso, e podemos recusar ou remover qualquer uma.",
        ],
      },
      {
        heading: "O que você não pode fazer",
        body: [
          [
            "Revender, redistribuir ou republicar os ensaios, perguntas ou feedback como produto próprio.",
            "Automatizar o acesso, fazer scraping do serviço ou contornar os limites do plano gratuito.",
            "Enviar o trabalho ou o currículo de outra pessoa, ou qualquer coisa que você não tenha direito de compartilhar.",
            "Apresentar uma ata ou nota simulada como se fosse oficial, ou usar o Mockio para colar numa defesa, prova ou entrevista real.",
            "Tentar extrair os prompts do sistema, ou usar a banca ou o entrevistador para algo que não seja praticar.",
          ],
          "Podemos suspender uma conta que faça isso. Se fizermos, dizemos por quê.",
        ],
      },
      {
        heading: "Disponibilidade",
        body: [
          "Vamos manter o serviço funcionando e não prometemos que ele nunca falhe. Ele depende de outras empresas — hospedagem, o provedor de modelos, o de voz, os de pagamento — e qualquer uma pode ter um dia ruim. Não devemos compensação por um ensaio que você não conseguiu fazer.",
        ],
      },
      {
        heading: "Responsabilidade",
        body: [
          "O Mockio é oferecido como está. Na medida em que a lei permitir, não somos responsáveis pelo resultado da sua defesa, pelas suas notas, pelo seu diploma, por um emprego que você não conseguiu, nem por decisões que você tomou confiando numa simulação ou no seu feedback.",
          "Na medida em que a lei permitir, nossa responsabilidade total com você se limita ao que você nos pagou nos doze meses anteriores à reclamação. Nada nestes termos limita um direito que a lei de defesa do consumidor do seu país não permita limitar.",
        ],
      },
      {
        heading: "Encerrar",
        body: [
          "Você pode excluir sua conta quando quiser em Ajustes, o que apaga seus dados como descrito na política de privacidade. Podemos encerrar uma conta que descumpra estes termos, e reembolsamos o período pago não usado se fizermos isso por um motivo que não foi culpa sua.",
        ],
      },
      {
        heading: "Mudanças e lei aplicável",
        body: [
          "Se mudarmos estes termos de um jeito que importe, avisamos por e-mail ou no produto antes de a mudança valer. Continuar usando o Mockio depois disso significa aceitá-los.",
          `Estes termos são regidos pela lei do ${COUNTRY.pt}, e as disputas vão aos seus tribunais, sem prejuízo da proteção ao consumidor que você tenha onde mora.`,
          `Dúvidas: ${OPERATOR.email}.`,
        ],
      },
    ],
  },
};

export function privacyFor(locale: Locale): LegalDocument {
  return PRIVACY[locale];
}

export function termsFor(locale: Locale): LegalDocument {
  return TERMS[locale];
}
