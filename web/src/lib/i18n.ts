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

export type Locale =
  | "en"
  | "es"
  | "pt"
  | "fr"
  | "it"
  | "de"
  | "ru"
  | "hi"
  | "ar"
  | "he"
  | "zh"
  | "ja"
  | "ko"
  | "th";

/**
 * Every language is named in itself, never in English.
 *
 * Someone hunting for their own language scans for the shape of their own
 * word — a reader of Thai finds ไทย instantly and "Thai" not at all.
 */
export const LOCALES: { id: Locale; label: string; rtl?: true }[] = [
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "pt", label: "Português" },
  { id: "fr", label: "Français" },
  { id: "it", label: "Italiano" },
  { id: "de", label: "Deutsch" },
  { id: "ru", label: "Русский" },
  { id: "hi", label: "हिन्दी" },
  { id: "ar", label: "العربية", rtl: true },
  { id: "he", label: "עברית", rtl: true },
  { id: "zh", label: "中文" },
  { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" },
  { id: "th", label: "ไทย" },
];

const IDS = new Set<string>(LOCALES.map((entry) => entry.id));
const RTL = new Set<string>(
  LOCALES.filter((entry) => entry.rtl).map((entry) => entry.id),
);

/** Arabic and Hebrew read right to left; the document has to be told. */
export function directionOf(locale: Locale): "rtl" | "ltr" {
  return RTL.has(locale) ? "rtl" : "ltr";
}

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
  "nav.newShort": "New",
  "nav.contextShort": "Context",
  "nav.accountShort": "Account",
  "nav.settingsShort": "Settings",
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
  "settings.yourName": "Your name",
  "settings.yourNameHint":
    "What the interviewer calls you. Left empty, it is guessed from your email — and skipped entirely rather than invented.",
  "settings.yourNamePlaceholder": "How you want to be greeted",
  "feedback.title": "Your feedback",
  "feedback.retry":
    "Your transcript is not lost — evaluation can be retried from history once the service recovers.",
  "feedback.back": "Back to sessions",
  "feedback.reading": "Reading your transcript. This usually takes under a minute.",
  "feedback.again": "Practice again",
  "feedback.overall": "Overall",
  "feedback.vocabulary": "Vocabulary",
  "feedback.structure": "Structure",
  "feedback.againstBar":
    "Scores compare you against the bar for this role and stage, not against other candidates.",
  "feedback.worked": "What worked",
  "feedback.toFix": "What to fix",
  "feedback.language": "Language",
  "feedback.usedWell": "Used well",
  "feedback.corrections": "Corrections",
  "feedback.measured": "Measured",
  "feedback.measuredLocked":
    "Your pace, filler rate and thinking time were counted from this transcript — they are recorded against the session and waiting. The paid plan shows them, and plots them across every interview you run.",
  "feedback.measuredNote":
    "Counted from your transcript, not judged by a model — these numbers mean the same thing in every session, which is what makes them comparable over time.",
  "feedback.needsSpeech":
    "Pace, thinking time and speaking length need spoken answers. Turn the microphone on next time and they will appear here.",
  "feedback.nextTime": "Before your next one",
  "feedback.words": "Words",
  "feedback.fillers": "Fillers",
  "feedback.share": "Your share",
  "feedback.pace": "Pace",
  "feedback.thinking": "Thinking time",
  "feedback.speaking": "Speaking",

  "progress.title": "Progress",
  "progress.nothing": "Nothing to plot yet",
  "progress.score": "Score",

  "profile.title": "Your context",
  "profile.locked": "Part of the paid plan",
  "profile.meta": "What the interviewer knows before the call",
  "profile.onePerLine": "One per line",

  "history.title": "History",
  "review.title": "Review",

  "cta.startInterview": "Start an interview",

  "progress.empty": "Finish an interview and this fills in. One session gives you a baseline; the shape starts meaning something around the third.",
  "progress.level": "Level",
  "progress.xpTotal": "{xp} XP total",
  "progress.xpToLevel": "{xp} XP to level {level}",
  "progress.thisWeek": "This week",
  "progress.ofLeague": "of {total} in your league",
  "progress.overall": "Overall score",
  "progress.overallNote": "The evaluator's read of each interview. The axis is fixed at 0–100 on purpose — a chart that rescales to its own data turns three points of noise into a climb.",
  "progress.byFront": "By front",
  "progress.byFrontNote": "Four separate readings rather than one number. Being fluent but disorganised, or structured but hesitant, are different problems with different fixes — a single score hides both.",
  "progress.badges": "Badges",
  "progress.badgesCount": "{earned} of {total} earned.",

  "axis.fluency": "Fluency",
  "axis.vocabulary": "Vocabulary",
  "axis.structure": "Structure",
  "axis.confidence": "Confidence",
  "axis.fluencyNote": "Pace, against a 140 wpm target",
  "axis.vocabularyNote": "Range of words you actually reach for",
  "axis.structureNote": "Whether an answer has a shape",
  "axis.confidenceNote": "Fewer fillers reads as steadier",

  "profile.lockedBody": "Upload a CV or portfolio and the interviewer stops asking generic questions. It opens on something you actually did, and pushes on whatever your CV leaves vague — which is what a real one does.",
  "profile.cvTitle": "CV or portfolio",
  "profile.cvNote": "PDF, .docx or plain text, up to 8 MB. We read the text, write a short brief from it, and hand that to the interviewer — never the whole document, which would make it recite your CV instead of interrogating it.",
  "profile.choose": "Choose a file",
  "profile.reading": "Reading it…",
  "profile.links": "Links",
  "profile.linksNote": "GitHub, LinkedIn, Figma, a portfolio site — one per line. We do not open them: the interviewer is told they exist and what kind they are, which is enough to ask about them. Fetching pages on your behalf is a security decision we have not made yet.",
  "profile.saving": "Saving…",
  "profile.saveLinks": "Save links",
  "profile.briefTitle": "What the interviewer reads",
  "profile.briefNote": "Written from your document. Shown in full because you should be able to disagree with a model's summary of you before it is used — if it is wrong, upload a clearer file.",

  "history.loading": "Loading…",
  "history.none": "No interviews yet",
  "history.completed": "{count} completed",
  "history.best": "best {score}%",
  "history.new": "New session",
  "history.emptyBody": "Finished interviews appear here with their feedback. Your first one takes about ten minutes.",
  "history.real": "real",
  "history.notFinished": "not finished",
  "history.fillers": "fillers {rate}",
  "history.view": "View feedback",

  "review.loading": "Loading…",
  "review.nothing": "Nothing waiting",
  "review.waitingOne": "1 question waiting",
  "review.waitingMany": "{count} questions waiting",
  "review.deciding": "What you are deciding",
  "review.decidingBody": "Verify a question only if it reads like something that company would actually ask. A verified question is shown to the interviewer as source material for its own questions at that employer.",
  "review.rejectNote": "Reject anything naming a person, carrying confidential detail, or written as an instruction rather than a question. The prompt is built to ignore instructions hidden in here, but that is the second line of defence — you are the first.",
  "review.empty": "The queue is empty. Contributions arrive from the landing page.",
  "review.anyRole": "any role",
  "review.reject": "Reject",
  "review.verify": "Verify",

  "feedback.earned": "Earned",
  "feedback.nextStepsLocked": "The evaluator wrote you a set of specific things to practise this week. They are part of the paid plan —",
  "feedback.nextStepsLink": "six months are free for early adopters",

  "coach.label": "Coaching notes",
  "coach.heading": "Coaching",
  "coach.reading": "Reading your last answer…",
  "coach.nothing": "Nothing to flag on that one.",
  "coach.intro": "Notes on your answers appear here after each turn. The interviewer never sees them and will not react to them.",
  "tip.structure": "Structure",
  "tip.specificity": "Be specific",
  "tip.vocabulary": "Word choice",
  "tip.grammar": "Grammar",

  "auth.welcomeBack": "Welcome back",
  "auth.createAccount": "Create an account",
  "auth.signInTitle": "Sign in to keep your progress.",
  "auth.signUpTitle": "Keep your history across devices.",
  "auth.email": "Email",
  "auth.password": "Password",
  "auth.passwordHint": "At least 12 characters. A phrase works well.",
  "auth.signIn": "Sign in",
  "auth.create": "Create account",
  "auth.forgot": "Forgot your password?",
  "auth.toSignUp": "No account yet? Create one",
  "auth.toSignIn": "Already have an account? Sign in",
  "auth.guestNote": "You can practise without an account — anything you do now carries over when you sign up from this browser.",
  "auth.wentWrong": "Something went wrong.",
  "auth.backToSignIn": "Back to sign in",
  "auth.checkEmail": "Check your email",
  "auth.linkOnce": "The link works once and expires in 30 minutes.",
  "auth.resetTitle": "Reset your password",
  "auth.sendLink": "Send reset link",
  "auth.resetFallback": "If that address has an account, a reset link is on its way.",
  "auth.chooseNew": "Choose a new password",
  "auth.newPassword": "New password",
  "auth.signsOutOthers": "Setting a new password signs out every other device.",
  "auth.setPassword": "Set password",
  "auth.couldNotReset": "Could not reset password.",

  "confirm.working": "Confirming…",
  "confirm.done": "Your email is confirmed.",
  "confirm.failed": "That link did not work.",
  "confirm.missingToken": "This link is missing its token.",
  "confirm.couldNot": "Could not confirm.",
  "confirm.retry": "You can request a new one from Settings.",
  "confirm.reachYou": "We can reach you about your account now.",
  "confirm.toSessions": "Go to your sessions",

  "billing.plan": "Plan",
  "billing.onPaid": "You are on the paid plan.",
  "billing.onFree": "You are on the free plan.",
  "billing.granted": "Granted, not billed — nothing to pay.",
  "billing.statusPending": "Waiting for the first payment to clear.",
  "billing.statusAuthorized": "Active.",
  "billing.statusPaused": "Payment did not go through — Mercado Pago is retrying.",
  "billing.statusCancelled": "Cancelled.",
  "billing.paidThrough": "Paid through {date}.",
  "billing.opening": "Opening checkout…",
  "billing.upgradeAmount": "Upgrade — {amount} {currency} / month",
  "billing.upgrade": "Upgrade",
  "billing.notOn": "Payments are not switched on yet.",
  "billing.cancelSub": "Cancel subscription",
  "billing.cancelledUntil": "Cancelled, and you keep the paid plan until {date} — you already paid for it.",
  "billing.couldNotOpen": "Could not open checkout.",
  "billing.couldNotCancel": "Could not cancel.",

  "delete.title": "Delete account",
  "delete.summary": "Removes your account and everything attached to it. There is no undo.",
  "delete.button": "Delete my account",
  "delete.noUndo": "This cannot be undone.",
  "delete.itemSessions": "Your interviews, transcripts and evaluations",
  "delete.itemProgress": "Your progress, XP, level and badges",
  "delete.itemProfile": "Your CV, portfolio links and the brief written from them",
  "delete.itemPreferences": "Your preferences, and any subscription — cancelled first",
  "delete.questionsStay": "Questions you contributed stay. They were never linked to you — what is stored beside them is a one-way hash — so there is nothing of yours left in them to remove.",
  "delete.typeToConfirm": "Type {email} to confirm",
  "delete.deleting": "Deleting…",
  "delete.confirm": "Delete permanently",
  "delete.cancel": "Cancel",
  "delete.couldNot": "Could not delete the account.",

  "settings.practice": "Practice",
  "settings.loading": "Loading…",
  "settings.defaultRole": "Default target role",
  "settings.defaultRoleHint": "Used to pre-fill new sessions.",
  "settings.defaultSector": "Default sector",
  "settings.defaultSectorHint": "Sets which companies the setup screen offers, and the numbers the interviewer asks for.",
  "settings.allSectors": "All sectors",
  "settings.defaultCompany": "Default company",
  "settings.defaultMode": "Default mode",
  "settings.defaultModeHint": "Real mode withholds coaching until the report, the way an actual interview does. It is worth more XP.",
  "settings.modePractice": "Practice — coaching as you go",
  "settings.modeReal": "Real — no coaching until the end",
  "settings.length": "Interview length — {turns} turns",
  "settings.lengthHint": "Shorter sessions give the evaluator less to judge, so scores are less reliable.",
  "settings.saving": "Saving…",
  "settings.save": "Save",
  "settings.saved": "Saved",
  "settings.account": "Account",
  "settings.signedInAs": "Signed in as",
  "settings.signedInNote": "Your history follows the account, on any device.",
  "settings.unconfirmed": "This address is not confirmed yet. Until it is, we cannot send you a password reset — so you would lose the account if you forgot the password.",
  "settings.sent": "Sent — check your inbox",
  "settings.resend": "Resend confirmation",
  "settings.guestNote": "You are practising as a guest. Your progress, badges and settings live in this browser only — clearing cookies loses them. Signing up carries everything across.",
  "settings.saveProgress": "Save my progress",

  "setup.dismissBriefing": "Dismiss what to expect",
  "setup.whatToExpect": "What to expect",
  "setup.expectCharacter": "The interviewer stays in character. It will not translate a word or correct your grammar mid-interview.",
  "setup.expectVague": "Vague answers get challenged. Have a specific example and a number ready.",
  "setup.expectLocked": "Feedback comes as a report at the end. Live coaching is on the paid plan.",
  "setup.expectPractice": "Coaching notes appear on the side. The interviewer never sees them.",
  "setup.expectReal": "No help until the report at the end.",

  "chart.notMeasured": "Not measured yet",
  "auth.backHome": "Back to Mockio",

  "land.navHow": "How it works",
  "land.navCompanies": "Companies",
  "land.navPricing": "Pricing",
  "land.navContribute": "Contribute",
  "land.signIn": "Sign in",
  "land.heroBlurb": "Real job interviews in English, out loud — then told exactly what to fix.",

  "land.previewEyebrow": "Live simulation",
  "land.previewAsks": "It asks one question,",
  "land.previewWaits": "waits for your answer,",
  "land.previewCharacter": "and never breaks character.",
  "land.previewMeta": "Behavioral · Senior Product Designer · Stripe",
  "land.previewTurn": "Turn {turn} of {total}",
  "land.previewNext": "Next turn",

  "land.pickerEyebrow": "Companies",
  "land.pickerTitle": "Every company interviews differently.",
  "land.pickerStages": "Behavioral · System design · Technical deep dive",
  "land.stripeCulture": "Craft · user obsession · written communication",
  "land.stripeBlurb": "Pushes on written clarity. Every tradeoff needs a number.",
  "land.amazonCulture": "Customer obsession · data-driven · ownership",
  "land.amazonBlurb": "Leadership principles run it. STAR structure is not optional.",
  "land.airbnbCulture": "Belonging · design-led · craft",
  "land.airbnbBlurb": "Warmer in tone, harder on taste. Craft gets questioned.",
  "land.meliCulture": "Scale · pragmatism · regional depth",
  "land.meliBlurb": "Assumes Latin American context. Defend real constraints, not ideal ones.",

  "land.featuresTitle": "Feedback that names the error.",
  "land.featuresSub": "Built for the interview, not for a grammar class.",
  "land.featuresRoom": "Your practice room.",
  "land.card1Title": "It names the error",
  "land.card1a": "Catches “depends of”, “explain me”, “I have 28 years”",
  "land.card1b": "Quotes what you said, never invented examples",
  "land.card1c": "Leaves correct informal English alone",
  "land.card2Title": "Vocabulary for your role",
  "land.card2a": "Scored against the terminology your role expects",
  "land.card2b": "Flags words used in the wrong context",
  "land.card2c": "Shows the phrase a hiring manager would use",
  "land.card3Title": "Structure under pressure",
  "land.card3a": "Measures whether answers hold a STAR shape",
  "land.card3b": "Notices rambling before an interviewer would",
  "land.card3c": "Tells you which story to rehearse",

  "land.pricingEyebrow": "Pricing",
  "land.pricingTitle": "Practise free. Pay when you know where you are applying.",
  "land.free": "Free",
  "land.freeBlurb": "A general round for your role. Three a month.",
  "land.free1": "Full interview, seven turns",
  "land.free2": "Honest score and feedback",
  "land.free3": "Your last three sessions",
  "land.free4": "Speak or type",
  "land.free5": "XP, levels and badges",
  "land.startPractising": "Start practising",
  "land.premium": "Premium",
  "land.premiumBadge": "Free for early adopters",
  "land.perMonth": " / month",
  "land.premiumBlurb": "The interview that knows who you are and where you are applying.",
  "land.prem1": "The company and sector you are targeting",
  "land.prem2": "Your CV, so questions get specific",
  "land.prem3": "Live coaching beside the transcript",
  "land.prem4": "Pace, fillers and thinking time, measured",
  "land.prem5": "Unlimited interviews and full history",
  "land.prem6": "Choose your interviewer",

  "land.eaEyebrow": "Early access",
  "land.eaTitle": "Six months of the paid plan, free.",
  "land.eaBody": "Tell us the role you are going for. The first six months are on us.",
  "land.eaPrivacy": "Used to attach the grant and ask what to build next. Nothing else.",
  "land.eaDone": "You are on the list.",
  "land.eaDonePre": "Create an account with",
  "land.eaDonePost": "and the first six months unlock automatically.",
  "land.eaRole": "Role you are targeting",
  "land.eaCompany": "Company you have in mind",
  "land.eaCompanyHint": "Optional. It tells us which employer to build next.",
  "land.eaSending": "Adding you…",
  "land.eaSubmit": "Claim six months",
  "land.eaUnreachable": "Could not reach the service.",

  "land.contribEyebrow": "Contribute",
  "land.contribTitle": "What did they actually ask you?",
  "land.contribBody": "Our questions are plausible. Real ones are better. Add what you were asked — anonymously.",
  "land.contribAnonTitle": "Actually anonymous",
  "land.contribAnonBody": "A one-way hash, kept only so one person cannot flood a company. It cannot name you.",
  "land.contribCheckTitle": "A person checks it first",
  "land.contribCheckBody": "Nothing reaches an interview unreviewed. Recruiters and hiring managers do the reviewing.",
  "land.contribNextTitle": "Where this goes",
  "land.contribNextBody": "Verified questions first. Later, sessions with those interviewers.",
  "land.contribSector": "Sector",
  "land.contribAllSectors": "All sectors",
  "land.contribCompany": "Company",
  "land.contribStage": "Stage",
  "land.contribRole": "Role",
  "land.contribRoleHint": "Leave it as any role if the question was not specific to one.",
  "land.contribAnyRole": "Any role",
  "land.contribQuestion": "The question, as you remember it",
  "land.contribQuestionHint": "No names, no company confidential detail — just the question.",
  "land.contribSending": "Sending…",
  "land.contribSubmit": "Add it anonymously",
  "land.contribFailed": "Could not send that.",
  "land.stageBehavioral": "Behavioral",
  "land.stageTechnical": "Technical deep dive",
  "land.stageSystem": "System design",
  "land.stageOther": "Other",

  "land.navEarly": "Early access",
  "land.eaWhat": "What you get",
  "land.eaInc1": "The company you are actually applying to",
  "land.eaInc2": "Your CV in the interviewer's hands",
  "land.eaInc3": "Live coaching and measured feedback",
  "land.eaInc4": "Spanish and Portuguese interviewers",
  "land.eaNoCard": "No card. It unlocks when you sign up with the same address.",

  "land.contribBank": "Filed by sector, company, role and round, then handed to the interviewer preparing that combination.",
  "land.contribCount": "Nothing reaches an interview unreviewed.",
  "field.level": "English level",
  "field.levelHint": "How the interviewer speaks to you. It does not make the questions easier.",
  "settings.defaultLevel": "Default English level",
  "settings.defaultLevelHint": "Changes how the interviewer speaks, never what it asks or the bar an answer has to clear.",
  "level.readyTitle": "Ready for {level}?",
  "level.readyBody": "Your last three interviews at this level all cleared the bar. Moving up means a faster interviewer with more idiom in it — the questions stay the same.",
  "level.readyAccept": "Try {level} next",
  "level.readyDismiss": "Stay where I am",
  "setup.left": "{left} of {limit} free interviews left this month",
  "setup.lastOne": "Your last free interview this month",
  "setup.noneLeft": "You have used all {limit} free interviews this month",
  "setup.noneLeftBody": "They renew on the 1st. The paid plan is not metered — and it targets a real employer, reads your CV, and coaches you while you speak.",
  "auth.acceptPre": "By creating an account you accept the",
  "auth.acceptAnd": "and the",
  "land.pickerSub": "Pick the one you are applying to and the interviewer changes with it — what it pushes on, and what an answer has to contain to satisfy it.",
  "card.name": "Name on the card",
  "card.number": "Card number",
  "card.expiry": "Expiry",
  "card.cvv": "Security code",
  "card.docType": "ID type",
  "card.docNumber": "ID number",
  "card.pay": "Subscribe — {amount} {currency} / month",
  "card.charging": "Charging…",
  "card.security": "Your card is sent straight to Mercado Pago. It never reaches our servers — we receive a single-use token and nothing else.",
  "card.unavailable": "The card form could not load. Try again, or use the redirect checkout.",
  "card.checkDetails": "Check the card details and try again.",
  "card.failed": "That did not go through. Try again, or use another card.",
  "nav.exit": "Exit",

  "avatar.label": "Your form",
  "avatar.evolvesAt": "Evolves at level {level}",
  "avatar.final": "Fully evolved",
  "avatar.formOf": "Form {index} of {total}",
  "field.pressure": "Pressure",
  "field.pressureHint": "The interviewer interrupts, moves the goalposts and pushes back. It changes how it asks, never what it asks or the bar an answer has to clear.",
  "field.pressureOn": "Stress mode",
  "field.pressureOff": "Normal",
  "legal.terms": "Terms",
  "legal.privacy": "Privacy",
  "legal.languageNote": "This document is published in English, Spanish and Portuguese. You are reading the English text, which is the one that governs.",
  "avatar.empty": "This is you at level 1. It takes on a new form {count} times on the way up \u2014 the first arrives within a couple of interviews.",
  "settings.tour": "Guided tour",
  "settings.tourHint": "The walkthrough shown the first time you open a session.",
  "settings.tourAgain": "Show it again",
  "settings.tourReset": "It will run next time",
} as const;

export type MessageKey = keyof typeof EN;

/**
 * Dictionaries are fetched, not bundled.
 *
 * Every language answers to the English keys and each one weighs about 27 KB.
 * Shipping all fourteen to every visitor would add roughly 290 KB so that
 * each of them could read one — a bad trade anywhere, and a worse one for an
 * audience largely on mobile data. Vite turns each import below into its own
 * chunk, so a reader downloads their language and no other.
 *
 * English is the exception and stays bundled: it is the fallback for a
 * missing key, so it has to be available synchronously.
 */
const LOADERS: Record<
  Exclude<Locale, "en">,
  () => Promise<{ default: Record<MessageKey, string> }>
> = {
  es: () => import("./locales/es"),
  pt: () => import("./locales/pt"),
  fr: () => import("./locales/fr"),
  it: () => import("./locales/it"),
  de: () => import("./locales/de"),
  ru: () => import("./locales/ru"),
  hi: () => import("./locales/hi"),
  ar: () => import("./locales/ar"),
  he: () => import("./locales/he"),
  zh: () => import("./locales/zh"),
  ja: () => import("./locales/ja"),
  ko: () => import("./locales/ko"),
  th: () => import("./locales/th"),
};

/** What has arrived so far. English is there from the start. */
const loaded = new Map<Locale, Record<MessageKey, string>>([["en", EN]]);

export function dictionaryFor(locale: Locale): Record<MessageKey, string> | null {
  return loaded.get(locale) ?? null;
}

/**
 * Fetches a dictionary, once.
 *
 * A failure resolves rather than throws: a chunk that will not load leaves
 * the reader on English, which is a worse experience than their own language
 * and a much better one than a blank screen.
 */
export async function loadDictionary(locale: Locale): Promise<void> {
  if (loaded.has(locale)) return;
  try {
    const module = await LOADERS[locale as Exclude<Locale, "en">]();
    loaded.set(locale, module.default);
  } catch {
    /* Stays on English. */
  }
}

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
    if (primary && IDS.has(primary)) return primary as Locale;
  }
  return "en";
}

export function storedLocale(raw: string | null): Locale | null {
  return raw !== null && IDS.has(raw) ? (raw as Locale) : null;
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
  const template = loaded.get(locale)?.[key] ?? EN[key];
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}

export { EN as EN_MESSAGES };
