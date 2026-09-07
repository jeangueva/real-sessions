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
 * the line about having no analytics is true because there are none, not
 * because it sounds good.
 *
 * And nothing here invents a legal fact. The entity, its country, the contact
 * address and the retention period are things only the operator knows, so they
 * are placeholders — and the page refuses to look finished while they are
 * still placeholders. A privacy policy naming the wrong company under the
 * wrong law is worse than an obviously unfinished one.
 */

export type Locale = "en" | "es" | "pt";

/**
 * The facts only the operator can supply.
 *
 * Fill these in and the draft banner disappears on its own. Leave any of them
 * and every legal page says, at the top and in the reader's language, that it
 * is not finished.
 */
export const OPERATOR = {
  /** The legal entity: a registered company, or a person trading under a name. */
  entity: "[COMPLETAR: razón social o nombre]",
  /** Where that entity is registered. Decides which law governs. */
  country: "[COMPLETAR: país]",
  /** Where a person writes to exercise their rights. */
  email: "[COMPLETAR: correo de contacto]",
  /** How long a finished interview is kept. See the retention section. */
  retention: "[COMPLETAR: p. ej. 24 meses]",
} as const;

export const PLACEHOLDER = "[COMPLETAR";

export function isDraft(): boolean {
  return Object.values(OPERATOR).some((value) => value.includes(PLACEHOLDER));
}

/** Last substantive change. Update it when the text changes, not on deploy. */
export const UPDATED = "2026-09-07";

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
    intro: `Mockio is operated by ${OPERATOR.entity}, in ${OPERATOR.country}. This describes what we hold, why, and how to get rid of it. It is written to be read rather than to be defensible.`,
    sections: [
      {
        heading: "What we collect",
        body: [
          "Only what the product needs to work. There is no analytics, no advertising, and no third-party tracker of any kind on this site — nothing measures you across the web, because nothing is installed that could.",
          [
            "Your email address and a hash of your password, if you create an account. We never store the password itself.",
            "Your interviews: the questions asked, your answers as text, the score and written feedback, and measurements taken from your speech such as pace and filler rate.",
            "What you told the interviewer to expect — your target role, sector, company, and interview language.",
            "A CV or portfolio you choose to upload, and the short brief written from it. We keep both.",
            "Portfolio links you enter. We store them as text and do not visit them.",
            "Your XP, level and badges.",
            "Subscription status, if you pay. Card details never reach us — see Payments.",
          ],
          "Practising as a guest stores the same interview data against an anonymous identifier in a cookie, with no email attached to it.",
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
            "Resend — email delivery. It receives your address and the contents of account emails.",
            "Mercado Pago — payments, if you subscribe. It receives what it needs to bill you; we receive only a subscription status.",
          ],
          "We do not sell your data, and we do not share it with anyone not on this list.",
        ],
      },
      {
        heading: "How long we keep it",
        body: [
          `Interviews and their feedback are kept for ${OPERATOR.retention} from the day they finish, unless you delete them sooner. Your account details are kept while the account exists.`,
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
        heading: "Cookies",
        body: [
          "One cookie, and it is how you stay signed in. It carries a signed identifier and nothing else. There are no advertising or analytics cookies, which is why this site has no cookie banner: there is nothing to consent to.",
          "Your theme and interface language are stored in your browser and never sent to us.",
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
    intro: `Mockio es operado por ${OPERATOR.entity}, en ${OPERATOR.country}. Acá está qué guardamos, para qué, y cómo borrarlo. Está escrito para que se lea, no para defenderse.`,
    sections: [
      {
        heading: "Qué recolectamos",
        body: [
          "Solo lo que el producto necesita para funcionar. No hay analítica, no hay publicidad y no hay ningún rastreador de terceros en este sitio: nada te sigue por la web, porque no hay nada instalado que pueda hacerlo.",
          [
            "Tu correo y un hash de tu contraseña, si creás una cuenta. Nunca guardamos la contraseña.",
            "Tus entrevistas: las preguntas, tus respuestas en texto, el puntaje y la devolución escrita, y mediciones tomadas de tu habla como el ritmo y las muletillas.",
            "Lo que le dijiste al entrevistador: tu rol objetivo, sector, empresa e idioma de la entrevista.",
            "El CV o portfolio que decidas subir, y el resumen corto escrito a partir de él. Guardamos los dos.",
            "Los enlaces de portfolio que ingreses. Los guardamos como texto y no los visitamos.",
            "Tu XP, nivel e insignias.",
            "El estado de tu suscripción, si pagás. Los datos de tu tarjeta nunca llegan a nosotros: ver Pagos.",
          ],
          "Practicar como invitado guarda los mismos datos de entrevista contra un identificador anónimo en una cookie, sin ningún correo asociado.",
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
            "Resend — envío de correo. Recibe tu dirección y el contenido de los mails de cuenta.",
            "Mercado Pago — pagos, si te suscribís. Recibe lo que necesita para cobrarte; nosotros recibimos solo un estado de suscripción.",
          ],
          "No vendemos tus datos, y no los compartimos con nadie fuera de esta lista.",
        ],
      },
      {
        heading: "Cuánto tiempo lo guardamos",
        body: [
          `Las entrevistas y sus devoluciones se guardan por ${OPERATOR.retention} desde el día en que terminan, salvo que las borres antes. Los datos de tu cuenta se guardan mientras la cuenta exista.`,
          "El estado de las entrevistas en curso y los contadores de límite viven en un caché que expira solo en cuestión de horas.",
        ],
      },
      {
        heading: "Borrar todo",
        body: [
          "Ajustes → Eliminar cuenta. Es inmediato y no se puede deshacer. Borra tus entrevistas, transcripciones y evaluaciones; tu progreso, XP, nivel e insignias; tu CV, tus enlaces y el resumen escrito a partir de ellos; tus preferencias; y cancela primero cualquier suscripción.",
          "Una cosa sobrevive, y conviene que sepas por qué. Las preguntas que aportaste al banco compartido no están ligadas a vos: lo que se guarda al lado es un hash de una sola vía que no se puede revertir para saber quién sos, así que no queda nada tuyo en ellas para borrar, y eliminarlas le quitaría a otros candidatos algo en lo que se apoyan.",
        ],
      },
      {
        heading: "Tus derechos",
        body: [
          `Escribí a ${OPERATOR.email} y te respondemos. Podés pedir una copia de lo que tenemos, pedir que lo corrijamos, o pedir que lo borremos, aunque eliminar tu cuenta ya hace lo último, en el momento y sin pedirle permiso a nadie.`,
        ],
      },
      {
        heading: "Cookies",
        body: [
          "Una cookie, y es la que te mantiene con sesión iniciada. Lleva un identificador firmado y nada más. No hay cookies de publicidad ni de analítica, y por eso este sitio no tiene banner de cookies: no hay nada que consentir.",
          "Tu tema y tu idioma de interfaz se guardan en tu navegador y nunca nos llegan.",
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
    intro: `O Mockio é operado por ${OPERATOR.entity}, em ${OPERATOR.country}. Aqui está o que guardamos, para quê, e como apagar. Foi escrito para ser lido, não para se defender.`,
    sections: [
      {
        heading: "O que coletamos",
        body: [
          "Só o que o produto precisa para funcionar. Não há analytics, não há publicidade e não há nenhum rastreador de terceiros neste site — nada te segue pela web, porque não há nada instalado que possa fazer isso.",
          [
            "Seu e-mail e um hash da sua senha, se você criar uma conta. Nunca guardamos a senha em si.",
            "Suas entrevistas: as perguntas, suas respostas em texto, a nota e a devolutiva escrita, e medições da sua fala como ritmo e vícios de linguagem.",
            "O que você disse ao entrevistador: seu cargo-alvo, setor, empresa e idioma da entrevista.",
            "O CV ou portfólio que você escolher enviar, e o resumo curto escrito a partir dele. Guardamos os dois.",
            "Os links de portfólio que você inserir. Guardamos como texto e não os visitamos.",
            "Seu XP, nível e selos.",
            "O status da assinatura, se você pagar. Os dados do cartão nunca chegam até nós — ver Pagamentos.",
          ],
          "Praticar como convidado guarda os mesmos dados de entrevista contra um identificador anônimo em um cookie, sem nenhum e-mail associado.",
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
            "Resend — envio de e-mail. Recebe seu endereço e o conteúdo dos e-mails da conta.",
            "Mercado Pago — pagamentos, se você assinar. Recebe o que precisa para cobrar; nós recebemos apenas um status de assinatura.",
          ],
          "Não vendemos seus dados, e não os compartilhamos com ninguém fora desta lista.",
        ],
      },
      {
        heading: "Por quanto tempo guardamos",
        body: [
          `As entrevistas e suas devolutivas são guardadas por ${OPERATOR.retention} a partir do dia em que terminam, a menos que você as apague antes. Os dados da sua conta ficam enquanto a conta existir.`,
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
        heading: "Cookies",
        body: [
          "Um cookie, e é o que mantém você conectado. Ele carrega um identificador assinado e nada mais. Não há cookies de publicidade nem de analytics, e é por isso que este site não tem banner de cookies: não há o que consentir.",
          "Seu tema e seu idioma de interface ficam no seu navegador e nunca chegam até nós.",
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
    intro: `An agreement between you and ${OPERATOR.entity}, in ${OPERATOR.country}, about using Mockio. Using it means accepting these.`,
    sections: [
      {
        heading: "What Mockio is, and what it is not",
        body: [
          "Mockio is a language-practice tool. Its purpose is to let you rehearse speaking English in a professional setting, out loud and under mild pressure, and to tell you afterwards how the English held up.",
          "Everything in it is a simulation. The interviewer is a fictional character, the company context is a description rather than a relationship, and the questions are generated by a language model. None of it is a real interview and none of it may be treated as one.",
          "In particular:",
          [
            "A session is not comparable to a real interview. It cannot tell you how a real one would go, and a good session predicts nothing about a real outcome.",
            "The questions are not the questions you will be asked. They are plausible examples, invented to give you something to answer in English. Even the questions reported by other candidates are unverified recollections, reviewed for plausibility rather than confirmed by any employer.",
            "The score and the feedback measure how you expressed yourself in English. They are not an assessment of your professional ability, your seniority, or your suitability for any role.",
            "Nothing here is career advice, and nothing here is a recruitment process.",
          ],
          "We are not a recruiter, not an employer, and not a route to a job. We are not affiliated with, endorsed by, or acting for any company named in the product. Stripe, Amazon, Airbnb, Mercado Libre and every other employer that appears here are named only to describe the register and subject matter of the practice — no real employer is involved, and none of them sees anything you do here.",
          "The feedback is produced by a language model. It is often useful and it is sometimes wrong. Treat it as a second opinion on your English, not as a verdict on you.",
        ],
      },
      {
        heading: "Your account",
        body: [
          "You must be 18 or older. One account per person. Keep your password to yourself — anything done from your account is treated as done by you.",
          "You can practise as a guest without an account. Guest progress lives in one browser and is lost if you clear its storage; that is a property of not having an account, not a fault.",
        ],
      },
      {
        heading: "The free plan",
        body: [
          "Three interviews per calendar month, renewing on the 1st. A full interview each, scored honestly. The limit exists because every interview costs us real money to run, and an unlimited free tier is one we could not keep open.",
        ],
      },
      {
        heading: "Paying",
        body: [
          "The paid plan is billed monthly through Mercado Pago. We never see or store your card details; Mercado Pago handles the payment and tells us only whether it succeeded.",
          "You can cancel any time from Settings. Cancelling stops the next charge and you keep the paid plan until the end of the period you already paid for. We do not refund partial months, because you keep the access you bought.",
          "If a payment fails, Mercado Pago retries. If it keeps failing, the plan reverts to free — your history stays, but the paid features stop.",
          "Early-access grants are exactly what they say: a free period on the paid plan, attached to the address you gave us and redeemed when you create an account with it. They are not transferable and carry no cash value.",
        ],
      },
      {
        heading: "Prices",
        body: [
          "We may change the price. If we do, we will tell you by email at least 30 days before it applies to you, and you can cancel before it does. A price change never applies retroactively to a period you already paid for.",
        ],
      },
      {
        heading: "Contributed questions",
        body: [
          "If you report a question you were asked in a real interview, you are telling us it is genuine, that you are free to share it, and that it contains no confidential information and names no individual.",
          "You give us permission to show it to other candidates and to use it as source material for generated interviews. Contributions are reviewed by a person before they are used, and we can reject or remove any of them.",
          "Do not submit anything you signed an NDA about. Do not submit anything containing a person's name.",
        ],
      },
      {
        heading: "What you may not do",
        body: [
          [
            "Resell, redistribute or republish the interviews, questions or feedback as your own product.",
            "Automate access, scrape the service, or work around the free plan's limits.",
            "Upload someone else's CV, or anything you do not have the right to share.",
            "Attempt to extract the system's prompts, or use the interviewer for anything other than practising an interview.",
          ],
          "We can suspend an account that does any of this. If we do, we will tell you why.",
        ],
      },
      {
        heading: "Availability",
        body: [
          "We will keep the service running and we do not promise it never breaks. It depends on other companies — the hosting, the model provider, the speech vendor — and any of them can have a bad day. We do not owe you compensation for an interview you could not run.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "To the extent the law allows, our total liability to you is limited to what you paid us in the twelve months before the claim. We are not liable for a job you did not get.",
        ],
      },
      {
        heading: "Ending it",
        body: [
          "You can delete your account at any time from Settings, which erases your data as described in the privacy policy. We can close an account that breaks these terms, and we will refund any unused paid period if we do so for a reason that was not your fault.",
        ],
      },
      {
        heading: "Governing law",
        body: [
          `These terms are governed by the law of ${OPERATOR.country}, and disputes go to its courts.`,
          `Questions: ${OPERATOR.email}.`,
        ],
      },
    ],
  },

  es: {
    title: "Términos",
    updated: UPDATED,
    intro: `Un acuerdo entre vos y ${OPERATOR.entity}, en ${OPERATOR.country}, sobre el uso de Mockio. Usarlo significa aceptarlos.`,
    sections: [
      {
        heading: "Qué es Mockio, y qué no es",
        body: [
          "Mockio es una herramienta de práctica de idioma. Su propósito es que ensayes hablar inglés en un contexto profesional, en voz alta y bajo una presión moderada, y que después te digamos cómo se sostuvo ese inglés.",
          "Todo lo que hay acá es una simulación. El entrevistador es un personaje ficticio, el contexto de la empresa es una descripción y no una relación, y las preguntas las genera un modelo de lenguaje. Nada de esto es una entrevista real ni puede tratarse como tal.",
          "En particular:",
          [
            "Una sesión no es comparable con una entrevista real. No puede decirte cómo saldría una de verdad, y una buena sesión no predice ningún resultado real.",
            "Las preguntas no son las preguntas que te van a hacer. Son ejemplos plausibles, inventados para darte algo que responder en inglés. Incluso las preguntas reportadas por otros candidatos son recuerdos sin verificar, revisados por verosimilitud y no confirmados por ninguna empresa.",
            "El puntaje y la devolución miden cómo te expresaste en inglés. No son una evaluación de tu capacidad profesional, tu seniority, ni tu idoneidad para ningún puesto.",
            "Nada de esto es asesoramiento de carrera, y nada de esto es un proceso de selección.",
          ],
          "No somos un reclutador, ni un empleador, ni una vía para conseguir trabajo. No estamos afiliados a ninguna empresa nombrada en el producto, ni respaldados por ellas, ni actuamos en su nombre. Stripe, Amazon, Airbnb, Mercado Libre y cualquier otro empleador que aparezca acá se nombran solo para describir el registro y los temas de la práctica: ningún empleador real participa, y ninguno ve nada de lo que hacés acá.",
          "La devolución la produce un modelo de lenguaje. Suele ser útil y a veces se equivoca. Tomala como una segunda opinión sobre tu inglés, no como un veredicto sobre vos.",
        ],
      },
      {
        heading: "Tu cuenta",
        body: [
          "Tenés que ser mayor de 18. Una cuenta por persona. Guardate la contraseña: todo lo que se haga desde tu cuenta se considera hecho por vos.",
          "Podés practicar como invitado sin cuenta. El progreso de invitado vive en un solo navegador y se pierde si borrás su almacenamiento; eso es una consecuencia de no tener cuenta, no una falla.",
        ],
      },
      {
        heading: "El plan gratuito",
        body: [
          "Tres entrevistas por mes calendario, que se renuevan el día 1. Cada una es una entrevista completa, puntuada con honestidad. El límite existe porque cada entrevista nos cuesta dinero real, y un plan gratuito ilimitado es uno que no podríamos sostener.",
        ],
      },
      {
        heading: "Pagar",
        body: [
          "El plan pago se cobra mensualmente a través de Mercado Pago. Nunca vemos ni guardamos los datos de tu tarjeta; Mercado Pago maneja el pago y solo nos dice si salió bien.",
          "Podés cancelar cuando quieras desde Ajustes. Cancelar detiene el próximo cobro y conservás el plan pago hasta el final del período que ya pagaste. No devolvemos meses parciales, porque conservás el acceso que compraste.",
          "Si un pago falla, Mercado Pago reintenta. Si sigue fallando, el plan vuelve a gratuito: tu historial queda, pero las funciones pagas se detienen.",
          "Los beneficios de acceso anticipado son exactamente lo que dicen: un período gratis del plan pago, atado a la dirección que nos diste y activado cuando creás una cuenta con ella. No son transferibles y no tienen valor en efectivo.",
        ],
      },
      {
        heading: "Precios",
        body: [
          "Podemos cambiar el precio. Si lo hacemos, te avisamos por correo al menos 30 días antes de que te aplique, y podés cancelar antes. Un cambio de precio nunca se aplica retroactivamente a un período que ya pagaste.",
        ],
      },
      {
        heading: "Preguntas aportadas",
        body: [
          "Si reportás una pregunta que te hicieron en una entrevista real, nos estás diciendo que es genuina, que sos libre de compartirla, y que no contiene información confidencial ni nombra a ninguna persona.",
          "Nos das permiso para mostrarla a otros candidatos y usarla como material para entrevistas generadas. Las contribuciones las revisa una persona antes de usarse, y podemos rechazar o eliminar cualquiera.",
          "No mandes nada sobre lo que firmaste un NDA. No mandes nada que contenga el nombre de una persona.",
        ],
      },
      {
        heading: "Qué no podés hacer",
        body: [
          [
            "Revender, redistribuir o republicar las entrevistas, preguntas o devoluciones como producto propio.",
            "Automatizar el acceso, hacer scraping del servicio, o esquivar los límites del plan gratuito.",
            "Subir el CV de otra persona, o cualquier cosa que no tengas derecho a compartir.",
            "Intentar extraer los prompts del sistema, o usar al entrevistador para algo que no sea practicar una entrevista.",
          ],
          "Podemos suspender una cuenta que haga esto. Si lo hacemos, te decimos por qué.",
        ],
      },
      {
        heading: "Disponibilidad",
        body: [
          "Vamos a mantener el servicio funcionando y no prometemos que nunca se rompa. Depende de otras empresas —el hosting, el proveedor de modelos, el de voz— y cualquiera puede tener un mal día. No te debemos compensación por una entrevista que no pudiste correr.",
        ],
      },
      {
        heading: "Responsabilidad",
        body: [
          "En la medida en que la ley lo permita, nuestra responsabilidad total hacia vos se limita a lo que nos pagaste en los doce meses anteriores al reclamo. No somos responsables por un trabajo que no conseguiste.",
        ],
      },
      {
        heading: "Terminar",
        body: [
          "Podés eliminar tu cuenta cuando quieras desde Ajustes, lo que borra tus datos como se describe en la política de privacidad. Podemos cerrar una cuenta que incumpla estos términos, y devolvemos el período pago sin usar si lo hacemos por una razón que no fue culpa tuya.",
        ],
      },
      {
        heading: "Ley aplicable",
        body: [
          `Estos términos se rigen por la ley de ${OPERATOR.country}, y las disputas van a sus tribunales.`,
          `Consultas: ${OPERATOR.email}.`,
        ],
      },
    ],
  },

  pt: {
    title: "Termos",
    updated: UPDATED,
    intro: `Um acordo entre você e ${OPERATOR.entity}, em ${OPERATOR.country}, sobre o uso do Mockio. Usá-lo significa aceitá-los.`,
    sections: [
      {
        heading: "O que é o Mockio, e o que ele não é",
        body: [
          "O Mockio é uma ferramenta de prática de idioma. O propósito dele é você ensaiar falar inglês em um contexto profissional, em voz alta e sob pressão moderada, e depois receber uma leitura de como esse inglês se sustentou.",
          "Tudo aqui é uma simulação. O entrevistador é um personagem fictício, o contexto da empresa é uma descrição e não uma relação, e as perguntas são geradas por um modelo de linguagem. Nada disso é uma entrevista real nem pode ser tratado como tal.",
          "Em particular:",
          [
            "Uma sessão não é comparável a uma entrevista real. Ela não pode dizer como uma de verdade seria, e uma boa sessão não prevê nenhum resultado real.",
            "As perguntas não são as perguntas que vão te fazer. São exemplos plausíveis, inventados para te dar algo a responder em inglês. Mesmo as perguntas relatadas por outros candidatos são lembranças não verificadas, revisadas por verossimilhança e não confirmadas por nenhuma empresa.",
            "A nota e a devolutiva medem como você se expressou em inglês. Não são uma avaliação da sua capacidade profissional, da sua senioridade, nem da sua adequação a qualquer vaga.",
            "Nada aqui é orientação de carreira, e nada aqui é um processo seletivo.",
          ],
          "Não somos um recrutador, nem um empregador, nem um caminho para uma vaga. Não somos afiliados a nenhuma empresa citada no produto, nem endossados por elas, nem agimos em nome delas. Stripe, Amazon, Airbnb, Mercado Libre e qualquer outro empregador que apareça aqui são citados apenas para descrever o registro e os temas da prática — nenhum empregador real participa, e nenhum deles vê o que você faz aqui.",
          "A devolutiva é produzida por um modelo de linguagem. Costuma ser útil e às vezes erra. Trate-a como uma segunda opinião sobre seu inglês, não como um veredicto sobre você.",
        ],
      },
      {
        heading: "Sua conta",
        body: [
          "Você precisa ter 18 anos ou mais. Uma conta por pessoa. Guarde sua senha — tudo feito a partir da sua conta é tratado como feito por você.",
          "Você pode praticar como convidado, sem conta. O progresso de convidado vive em um único navegador e se perde se você limpar o armazenamento dele; isso é uma consequência de não ter conta, não uma falha.",
        ],
      },
      {
        heading: "O plano gratuito",
        body: [
          "Três entrevistas por mês calendário, renovando no dia 1º. Cada uma é uma entrevista completa, avaliada com honestidade. O limite existe porque cada entrevista nos custa dinheiro real, e um plano gratuito ilimitado é um que não conseguiríamos manter.",
        ],
      },
      {
        heading: "Pagamentos",
        body: [
          "O plano pago é cobrado mensalmente pelo Mercado Pago. Nunca vemos nem guardamos os dados do seu cartão; o Mercado Pago cuida do pagamento e só nos informa se deu certo.",
          "Você pode cancelar quando quiser nas Configurações. Cancelar interrompe a próxima cobrança e você mantém o plano pago até o fim do período já pago. Não devolvemos meses parciais, porque você mantém o acesso que comprou.",
          "Se um pagamento falhar, o Mercado Pago tenta de novo. Se continuar falhando, o plano volta ao gratuito — seu histórico fica, mas os recursos pagos param.",
          "Os benefícios de acesso antecipado são exatamente o que dizem: um período gratuito do plano pago, vinculado ao endereço que você nos deu e liberado quando você cria uma conta com ele. Não são transferíveis e não têm valor em dinheiro.",
        ],
      },
      {
        heading: "Preços",
        body: [
          "Podemos mudar o preço. Se mudarmos, avisamos por e-mail pelo menos 30 dias antes de valer para você, e você pode cancelar antes disso. Uma mudança de preço nunca se aplica retroativamente a um período já pago.",
        ],
      },
      {
        heading: "Perguntas contribuídas",
        body: [
          "Se você reportar uma pergunta que te fizeram em uma entrevista real, está nos dizendo que ela é genuína, que você é livre para compartilhá-la, e que ela não contém informação confidencial nem nomeia nenhuma pessoa.",
          "Você nos dá permissão para mostrá-la a outros candidatos e usá-la como material para entrevistas geradas. As contribuições são revisadas por uma pessoa antes de serem usadas, e podemos rejeitar ou remover qualquer uma.",
          "Não envie nada sobre o que você assinou um NDA. Não envie nada que contenha o nome de uma pessoa.",
        ],
      },
      {
        heading: "O que você não pode fazer",
        body: [
          [
            "Revender, redistribuir ou republicar as entrevistas, perguntas ou devolutivas como produto próprio.",
            "Automatizar o acesso, fazer scraping do serviço, ou contornar os limites do plano gratuito.",
            "Enviar o CV de outra pessoa, ou qualquer coisa que você não tenha o direito de compartilhar.",
            "Tentar extrair os prompts do sistema, ou usar o entrevistador para algo que não seja praticar uma entrevista.",
          ],
          "Podemos suspender uma conta que faça isso. Se fizermos, dizemos o motivo.",
        ],
      },
      {
        heading: "Disponibilidade",
        body: [
          "Vamos manter o serviço no ar e não prometemos que ele nunca quebre. Ele depende de outras empresas — a hospedagem, o provedor de modelos, o de voz — e qualquer uma pode ter um dia ruim. Não devemos compensação por uma entrevista que você não conseguiu fazer.",
        ],
      },
      {
        heading: "Responsabilidade",
        body: [
          "Na medida em que a lei permitir, nossa responsabilidade total com você se limita ao que você nos pagou nos doze meses anteriores à reclamação. Não somos responsáveis por uma vaga que você não conseguiu.",
        ],
      },
      {
        heading: "Encerrar",
        body: [
          "Você pode excluir sua conta a qualquer momento nas Configurações, o que apaga seus dados como descrito na política de privacidade. Podemos encerrar uma conta que descumpra estes termos, e devolvemos o período pago não usado se fizermos isso por um motivo que não foi culpa sua.",
        ],
      },
      {
        heading: "Lei aplicável",
        body: [
          `Estes termos são regidos pela lei de ${OPERATOR.country}, e as disputas vão aos seus tribunais.`,
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
