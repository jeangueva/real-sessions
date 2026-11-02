/**
 * The tour's own words, in every language.
 *
 * The walkthrough is the first thing a new reader sees, and it was the one
 * place on the product that never spoke the reader's language: the chrome
 * around it — "Saltar", "Siguiente" — was translated, the steps themselves
 * were not. A coachmark in a language you do not read is a coachmark you skip.
 *
 * Kept out of the message catalogue on purpose. The catalogue's keys are one
 * type shared by fourteen files, and a key added there has to be answered in
 * all fourteen or the build stops. These are steps, keyed by the step's own
 * id, and a locale that has not answered one falls back to English for that
 * step alone rather than losing the tour.
 */
import type { Locale } from "./i18n";

export interface TourText {
  title: string;
  body: string;
}

const EN: Record<string, TourText> = {
  search: {
    title: "Start here if you know what you want",
    body: "Type a company, a role, or a past session. Picking a past one restores every field.",
  },
  setup: {
    title: "Six choices, one bar",
    body: "The role decides which rounds exist; each round decides who asks. Pick more than one and the interview covers both.",
  },
  begin: {
    title: "Then it is a call",
    body: "Microphone, camera and screen share, with the transcript beside it. Type instead if you would rather not speak.",
  },
  progress: {
    title: "The point is the second attempt",
    body: "Every session is scored and kept. Here the same interview, run twice, becomes a number that moved.",
  },
};

const ES: Record<string, TourText> = {
  search: {
    title: "Empieza aquí si ya sabes qué quieres",
    body: "Escribe una empresa, un puesto o una sesión pasada. Al elegir una sesión anterior se restauran todos los campos.",
  },
  setup: {
    title: "Seis decisiones, una barra",
    body: "El puesto decide qué rondas existen; cada ronda decide quién pregunta. Elige más de una y la entrevista cubre ambas.",
  },
  begin: {
    title: "Después es una llamada",
    body: "Micrófono, cámara y pantalla compartida, con la transcripción al lado. Escribe si prefieres no hablar todavía.",
  },
  progress: {
    title: "Lo importante es el segundo intento",
    body: "Cada sesión se evalúa y se guarda. Aquí la misma entrevista, hecha dos veces, se convierte en un número que se movió.",
  },
};

const PT: Record<string, TourText> = {
  search: {
    title: "Comece aqui se já sabe o que quer",
    body: "Escreva uma empresa, uma vaga ou uma sessão passada. Escolher uma sessão anterior restaura todos os campos.",
  },
  setup: {
    title: "Seis decisões, uma barra",
    body: "A vaga decide quais rodadas existem; cada rodada decide quem pergunta. Escolha mais de uma e a entrevista cobre as duas.",
  },
  begin: {
    title: "Depois é uma chamada",
    body: "Microfone, câmera e compartilhamento de tela, com a transcrição ao lado. Escreva se preferir não falar ainda.",
  },
  progress: {
    title: "O ponto é a segunda tentativa",
    body: "Cada sessão é avaliada e guardada. Aqui a mesma entrevista, feita duas vezes, vira um número que se moveu.",
  },
};

const FR: Record<string, TourText> = {
  search: {
    title: "Commencez ici si vous savez ce que vous voulez",
    body: "Tapez une entreprise, un poste ou une session passée. Choisir une session ancienne restaure tous les champs.",
  },
  setup: {
    title: "Six choix, une seule barre",
    body: "Le poste détermine les tours qui existent ; chaque tour détermine qui pose les questions. Choisissez-en plusieurs et l'entretien couvre les deux.",
  },
  begin: {
    title: "Ensuite, c'est un appel",
    body: "Micro, caméra et partage d'écran, avec la transcription à côté. Écrivez si vous préférez ne pas encore parler.",
  },
  progress: {
    title: "L'enjeu est la deuxième tentative",
    body: "Chaque session est notée et conservée. Ici le même entretien, passé deux fois, devient un chiffre qui a bougé.",
  },
};

const IT: Record<string, TourText> = {
  search: {
    title: "Comincia da qui se sai cosa vuoi",
    body: "Scrivi un'azienda, un ruolo o una sessione passata. Scegliere una sessione precedente ripristina tutti i campi.",
  },
  setup: {
    title: "Sei scelte, una barra",
    body: "Il ruolo decide quali round esistono; ogni round decide chi chiede. Scegline più di uno e il colloquio copre entrambi.",
  },
  begin: {
    title: "Poi è una chiamata",
    body: "Microfono, fotocamera e condivisione schermo, con la trascrizione a fianco. Scrivi se preferisci non parlare ancora.",
  },
  progress: {
    title: "Il punto è il secondo tentativo",
    body: "Ogni sessione viene valutata e conservata. Qui lo stesso colloquio, fatto due volte, diventa un numero che si è mosso.",
  },
};

const DE: Record<string, TourText> = {
  search: {
    title: "Hier anfangen, wenn du schon weißt, was du willst",
    body: "Gib eine Firma, eine Rolle oder eine frühere Sitzung ein. Eine frühere Sitzung setzt alle Felder zurück.",
  },
  setup: {
    title: "Sechs Entscheidungen, eine Leiste",
    body: "Die Rolle bestimmt, welche Runden es gibt; jede Runde bestimmt, wer fragt. Wähle mehrere, deckt das Gespräch beides ab.",
  },
  begin: {
    title: "Dann ist es ein Gespräch",
    body: "Mikrofon, Kamera und Bildschirmfreigabe, mit dem Transkript daneben. Du kannst tippen, wenn du noch nicht sprechen willst.",
  },
  progress: {
    title: "Der Sinn ist der zweite Versuch",
    body: "Jede Sitzung wird bewertet und gespeichert. Hier wird aus demselben Gespräch, zweimal geführt, eine Zahl, die sich bewegt hat.",
  },
};

const RU: Record<string, TourText> = {
  search: {
    title: "Начните здесь, если уже знаете, что хотите",
    body: "Введите компанию, должность или прошлую сессию. Выбор прошлой сессии восстанавливает все поля.",
  },
  setup: {
    title: "Шесть решений, одна панель",
    body: "Должность определяет, какие раунды есть; каждый раунд — кто спрашивает. Выберите больше одного, и интервью охватит оба.",
  },
  begin: {
    title: "Дальше это звонок",
    body: "Микрофон, камера и демонстрация экрана, расшифровка рядом. Можно печатать, если пока не хочется говорить.",
  },
  progress: {
    title: "Смысл — во второй попытке",
    body: "Каждая сессия оценивается и хранится. Здесь одно и то же интервью, проведённое дважды, становится числом, которое изменилось.",
  },
};

const HI: Record<string, TourText> = {
  search: {
    title: "यहाँ से शुरू करें यदि आप जानते हैं कि क्या चाहिए",
    body: "कंपनी, पद या पुराना सत्र टाइप करें। पुराना सत्र चुनने पर सभी फ़ील्ड वापस आ जाते हैं।",
  },
  setup: {
    title: "छह चुनाव, एक बार",
    body: "पद तय करता है कि कौन-से राउंड होंगे; हर राउंड तय करता है कि कौन पूछेगा। एक से अधिक चुनें तो साक्षात्कार दोनों को कवर करेगा।",
  },
  begin: {
    title: "फिर यह एक कॉल है",
    body: "माइक्रोफ़ोन, कैमरा और स्क्रीन शेयर, साथ में ट्रांसक्रिप्ट। अभी बोलना न चाहें तो लिखें।",
  },
  progress: {
    title: "मक़सद दूसरी कोशिश है",
    body: "हर सत्र का आकलन होता है और वह रहता है। यहाँ एक ही साक्षात्कार, दो बार करने पर, बदलते हुए अंक में बदल जाता है।",
  },
};

const AR: Record<string, TourText> = {
  search: {
    title: "ابدأ من هنا إن كنت تعرف ما تريد",
    body: "اكتب شركة أو وظيفة أو جلسة سابقة. اختيار جلسة سابقة يعيد كل الحقول كما كانت.",
  },
  setup: {
    title: "ستة اختيارات في شريط واحد",
    body: "الوظيفة تقرر الجولات الموجودة، وكل جولة تقرر من يسأل. اختر أكثر من جولة ليغطي الموقفين معًا.",
  },
  begin: {
    title: "ثم إنها مكالمة",
    body: "ميكروفون وكاميرا ومشاركة شاشة، مع النص在旁边. اكتب إن لم تفضّل الكلام بعد.",
  },
  progress: {
    title: "المقصود هو المحاولة الثانية",
    body: "كل جلسة تُقيَّم وتُحفظ. هنا تصبح المقابلة نفسها مرتين رقمًا تحرّك.",
  },
};

const HE: Record<string, TourText> = {
  search: {
    title: "מתחילים כאן אם כבר יודעים מה רוצים",
    body: "הקלידו חברה, תפקיד או פגישה קודמת. בחירת פגישה קודמת מחזירה את כל השדות.",
  },
  setup: {
    title: "שישה בחירות, סרגל אחד",
    body: "התפקיד קובע אילו סבבים יש; כל סבב קובע מי שואל. בחרו יותר מסבב אחד והראיון מכסה את שניהם.",
  },
  begin: {
    title: "אחר כך זו שיחה",
    body: "מיקרופון, מצלמה ושיתוף מסך, עם התמלול לצד. אפשר גם להקליד אם עדיין לא באופן לדבר.",
  },
  progress: {
    title: "העניין הוא הניסיון השני",
    body: "כל פגישה נמדדת ונשמרת. כאן אותה ראיון, פעמיים, הופך למספר שזז.",
  },
};

const ZH: Record<string, TourText> = {
  search: {
    title: "知道你想要什么，就从这里开始",
    body: "输入公司、职位或过往的练习。选择一次过往练习会把所有字段还原。",
  },
  setup: {
    title: "六项选择，一条栏",
    body: "职位决定有哪些轮次，每一轮决定谁来问。选多个轮次，面试会覆盖两者。",
  },
  begin: {
    title: "接下来就是一场通话",
    body: "麦克风、摄像头和屏幕共享，转写在旁边。如果你还不想开口，也可以打字。",
  },
  progress: {
    title: "重点是第二次尝试",
    body: "每次练习都会评分并保存。在这里，同一场面试做两遍，会变成一个有变化的数字。",
  },
};

const JA: Record<string, TourText> = {
  search: {
    title: "的目的が決まっているならここから",
    body: "会社名・職種・過去のセッションを入力します。過去のものを選ぶと、すべての項目が元に戻ります。",
  },
  setup: {
    title: "6つの選択、1本のバー",
    body: "職種でラウンドが決まり、ラウンドで質問者が決まります。複数選ぶと、その両方を面试します。",
  },
  begin: {
    title: "あとは通話です",
    body: "マイク・カメラ・画面共有、となりに文字起こし。話すのがまだ負担なら、入力でも進められます。",
  },
  progress: {
    title: "大事なのは2回目",
    body: "セッションはすべて採点して保存します。ここで同じ面接を2回行うと、動いた数字になります。",
  },
};

const KO: Record<string, TourText> = {
  search: {
    title: "원하는 것이 정해졌다면 여기서 시작하세요",
    body: "회사, 직무 또는 지난 세션을 입력하세요. 지난 세션을 고르면 모든 항목이 원래대로 돌아옵니다.",
  },
  setup: {
    title: "여섯 가지 선택, 하나의 막대",
    body: "직무가 어떤 라운드를 정하고, 각 라운드가 누가 물을지 정합니다. 둘 이상 고르면 그 두 가지를 모두 다룹니다.",
  },
  begin: {
    title: "그다음은 통화입니다",
    body: "마이크, 카메라, 화면 공유, 옆에 기록. 아직 말하기 어렵다면 입력으로 해도 됩니다.",
  },
  progress: {
    title: "핵심은 두 번째 시도입니다",
    body: "모든 세션은 채점되어 남습니다. 여기서 같은 인터뷰를 두 번 하면, 움직인 숫자가 됩니다.",
  },
};

const TH: Record<string, TourText> = {
  search: {
    title: "เริ่มตรงนี้ถ้าคุณรู้ว่าต้องการอะไร",
    body: "พิมพ์บริษัท ตำแหน่ง หรือเซสชันที่ผ่านมา เลือกเซสชันเก่า ฟิลด์ทั้งหมดจะกลับมาเหมือนเดิม",
  },
  setup: {
    title: "หกทางเลือก แถบเดียว",
    body: "ตำแหน่งกำหนดว่ามีรอบไหนบ้าง แต่ละรอบกำหนดว่าใครเป็นผู้ถาม เลือกมากกว่าหนึ่งรอบ การสัมภาษณ์ก็ครอบคลุมทั้งสอง",
  },
  begin: {
    title: "จากนั้นก็เป็นการสนทนา",
    body: "ไมโครโฟน กล้อง และการแชร์หน้าจอ พร้อมถ้อยคำอยู่ข้าง ๆ ถ้ายังไม่อยากพูด พิมพ์แทนก็ได้",
  },
  progress: {
    title: "จุดสำคัญคือครั้งที่สอง",
    body: "ทุกเซสชันถูกให้คะแนนและเก็บไว้ ที่นี่การสัมภาษณ์เดิมสองครั้งกลายเป็นตัวเลขที่ขยับ",
  },
};

const BY_LOCALE: Partial<Record<Locale, Record<string, TourText>>> = {
  en: EN,
  es: ES,
  pt: PT,
  fr: FR,
  it: IT,
  de: DE,
  ru: RU,
  hi: HI,
  ar: AR,
  he: HE,
  zh: ZH,
  ja: JA,
  ko: KO,
  th: TH,
};

/**
 * A step's words in the reader's language.
 *
 * English when the locale has not answered that step: a step in the wrong
 * language is still a step, and an untranslated one is better than no tour.
 */
export function tourText(locale: Locale, id: string): TourText {
  const localised = BY_LOCALE[locale]?.[id];
  return localised ?? EN[id] ?? { title: "", body: "" };
}
