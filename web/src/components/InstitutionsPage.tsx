import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Action, FadeRise } from "@/design-system";
import { LandingNav } from "./LandingNav";
import { SiteFooter } from "./SiteFooter";
import { Lede, Screen, Title, Wrap } from "./marketing";
import { useLocale } from "@/hooks/useLocale";
import { scrollToSection } from "@/lib/scroll-to-section";
import { ApiError, sendB2bLead } from "@/lib/api";

/**
 * For universities and institutes: Mockio inside the school's own platform.
 *
 * The integration is LTI 1.3, the standard Moodle, Canvas, Blackboard Learn,
 * D2L Brightspace and Sakai all speak: students open Mockio from their course
 * already signed in and in the school's cohort, rehearse against the school's
 * rubric, and the grade goes back to the course's gradebook. A school without
 * a platform gets a cohort code instead.
 *
 * The page is for two readers — the dean who decides and the IT person who
 * connects it — so the technical section gives the exact URLs, read from the
 * address the page is served on.
 */
const ES = {
  doc: "Mockio para universidades e institutos",
  navHome: "Sustentación",
  navHow: "Cómo funciona",
  navTech: "Integración",
  navAffiliates: "Afiliados",
  cta: "Agendar una conversación",
  kicker: "Para universidades e institutos",
  title: "Ensayos de sustentación para toda tu facultad, dentro de tu aula virtual.",
  sub: "Tus estudiantes entran a Mockio con un clic desde su curso, ensayan frente a un jurado de 3 que leyó su tesis, con tu rúbrica, y la nota vuelve a tu libro de calificaciones.",
  tech: "Ver la integración",
  platforms: "Se conecta por LTI 1.3 con",
  f1Title: "Un clic desde el curso.",
  f1Body: "Agregas Mockio como actividad en el taller de tesis. El estudiante entra ya identificado y en el grupo de tu institución: sin crear cuentas ni recordar contraseñas.",
  f1Course: "Taller de Tesis II · 2026-II",
  f1Week: "Semana 14 · Preparación de la sustentación",
  f1Activity: "Ensayo de sustentación",
  f1Tool: "Herramienta externa · Mockio",
  f1Other: "Entrega final de la tesis",
  f2Title: "Tu rúbrica, en cada acta.",
  f2Body: "El jurado califica con los criterios de tu escuela, además de los habituales, y la deliberación dice dónde el estudiante los cumplió y dónde no.",
  f2Rubric: "Rúbrica de la Escuela de Posgrado",
  f2c1: "Coherencia problema–objetivos–conclusiones",
  f2c2: "Dominio del diseño metodológico",
  f2c3: "Discusión frente a antecedentes",
  f3Title: "La coordinación ve a toda la cohorte.",
  f3Body: "Quién ya ensayó, quién sustenta pronto, cómo va su preparación. Nunca las respuestas ni el texto de la tesis.",
  f3Head: "Cohorte 2026-II · 84 de 120 cupos",
  f3Student: "Estudiante",
  f3Rehearsals: "Ensayos",
  f3Grade: "Última nota",
  f3Ready: "Preparación",
  f4Title: "La nota vuelve al aula virtual.",
  f4Body: "Cada ensayo calificado se registra en el libro de calificaciones del curso, como cualquier otra actividad.",
  f4Book: "Libro de calificaciones",
  f4Item: "Ensayo de sustentación",
  noLmsTitle: "¿Sin aula virtual?",
  noLmsBody: "Te damos un código de cohorte: tus estudiantes lo escriben en Mockio y quedan en tu grupo, con tus cupos y tu rúbrica.",
  privacyTitle: "Las tesis son de tus estudiantes.",
  privacy1: "Solo se usan para sus ensayos; nunca entrenan modelos.",
  privacy2: "Del aula virtual recibimos solo nombre, correo y rol.",
  privacy3: "Cada estudiante borra su tesis con un clic.",
  pricingTitle: "Licencias por cohorte.",
  pricingBody: "El precio depende de cuántos estudiantes y cuántas sustentaciones completas por estudiante. Te enviamos una propuesta en un día hábil.",
  techTitle: "Para el equipo de TI.",
  techBody: "Registra Mockio como herramienta LTI 1.3 con estas URLs. Luego nos envías el Client ID, el Deployment ID y las URLs de tu plataforma, y la conectamos.",
  techLogin: "URL de inicio de sesión (OIDC)",
  techLaunch: "URL de lanzamiento y redirección",
  techJwks: "URL de claves públicas (JWKS)",
  techConfig: "Configuración en JSON",
  techServices: "Servicios: nombre y correo del usuario, y calificaciones (Assignment and Grade Services). Abrir en una ventana nueva.",
  formTitle: "Conversemos.",
  formBody: "Cuéntanos de tu institución y te escribimos con una propuesta.",
  fName: "Nombre",
  fRole: "Cargo",
  fEmail: "Correo institucional",
  fInstitution: "Institución",
  fCountry: "País",
  fStudents: "Estudiantes por año (aprox.)",
  fPlatform: "Aula virtual",
  fNone: "No usamos",
  fOther: "Otra",
  fMessage: "¿Algo más que debamos saber?",
  fSend: "Enviar",
  fSent: "Gracias. Te escribimos en un día hábil.",
  fError: "No pudimos enviarlo. Escríbenos a hello@getmockio.com.",
};
type Key = keyof typeof ES;

const PT: Record<Key, string> = {
  doc: "Mockio para universidades e faculdades",
  navHome: "Defesa",
  navHow: "Como funciona",
  navTech: "Integração",
  navAffiliates: "Afiliados",
  cta: "Agendar uma conversa",
  kicker: "Para universidades e faculdades",
  title: "Ensaios de defesa para todo o seu curso, dentro do seu ambiente virtual.",
  sub: "Os estudantes entram no Mockio com um clique a partir da disciplina, ensaiam diante de uma banca de 3 que leu o trabalho, com a sua rubrica, e a nota volta ao livro de notas.",
  tech: "Ver a integração",
  platforms: "Conecta-se por LTI 1.3 com",
  f1Title: "Um clique a partir da disciplina.",
  f1Body: "Você adiciona o Mockio como atividade na disciplina de TCC. O estudante entra já identificado e no grupo da instituição: sem criar contas nem lembrar senhas.",
  f1Course: "TCC II · 2026.2",
  f1Week: "Semana 14 · Preparação para a defesa",
  f1Activity: "Ensaio de defesa",
  f1Tool: "Ferramenta externa · Mockio",
  f1Other: "Entrega final do trabalho",
  f2Title: "Sua rubrica, em cada ata.",
  f2Body: "A banca avalia com os critérios da sua instituição, além dos habituais, e a deliberação diz onde o estudante os cumpriu e onde não.",
  f2Rubric: "Rubrica do Programa de Pós-Graduação",
  f2c1: "Coerência problema–objetivos–conclusões",
  f2c2: "Domínio do delineamento metodológico",
  f2c3: "Discussão frente à literatura",
  f3Title: "A coordenação vê toda a turma.",
  f3Body: "Quem já ensaiou, quem defende em breve, como vai a preparação. Nunca as respostas nem o texto do trabalho.",
  f3Head: "Turma 2026.2 · 84 de 120 vagas",
  f3Student: "Estudante",
  f3Rehearsals: "Ensaios",
  f3Grade: "Última nota",
  f3Ready: "Preparação",
  f4Title: "A nota volta ao ambiente virtual.",
  f4Body: "Cada ensaio avaliado é registrado no livro de notas da disciplina, como qualquer outra atividade.",
  f4Book: "Livro de notas",
  f4Item: "Ensaio de defesa",
  noLmsTitle: "Sem ambiente virtual?",
  noLmsBody: "Damos um código de turma: os estudantes o digitam no Mockio e ficam no seu grupo, com suas vagas e sua rubrica.",
  privacyTitle: "Os trabalhos são dos seus estudantes.",
  privacy1: "Usados só nos ensaios; nunca treinam modelos.",
  privacy2: "Do ambiente virtual recebemos só nome, e-mail e papel.",
  privacy3: "Cada estudante apaga o trabalho com um clique.",
  pricingTitle: "Licenças por turma.",
  pricingBody: "O preço depende de quantos estudantes e quantas defesas completas por estudante. Enviamos uma proposta em um dia útil.",
  techTitle: "Para a equipe de TI.",
  techBody: "Registre o Mockio como ferramenta LTI 1.3 com estas URLs. Depois envie o Client ID, o Deployment ID e as URLs da sua plataforma, e nós conectamos.",
  techLogin: "URL de login (OIDC)",
  techLaunch: "URL de lançamento e redirecionamento",
  techJwks: "URL de chaves públicas (JWKS)",
  techConfig: "Configuração em JSON",
  techServices: "Serviços: nome e e-mail do usuário, e notas (Assignment and Grade Services). Abrir em nova janela.",
  formTitle: "Vamos conversar.",
  formBody: "Conte sobre a sua instituição e escrevemos com uma proposta.",
  fName: "Nome",
  fRole: "Cargo",
  fEmail: "E-mail institucional",
  fInstitution: "Instituição",
  fCountry: "País",
  fStudents: "Estudantes por ano (aprox.)",
  fPlatform: "Ambiente virtual",
  fNone: "Não usamos",
  fOther: "Outro",
  fMessage: "Algo mais que devamos saber?",
  fSend: "Enviar",
  fSent: "Obrigado. Escrevemos em um dia útil.",
  fError: "Não conseguimos enviar. Escreva para hello@getmockio.com.",
};

const EN: Record<Key, string> = {
  doc: "Mockio for universities and colleges",
  navHome: "Thesis defence",
  navHow: "How it works",
  navTech: "Integration",
  navAffiliates: "Affiliates",
  cta: "Book a conversation",
  kicker: "For universities and colleges",
  title: "Defence rehearsals for your whole faculty, inside your learning platform.",
  sub: "Students open Mockio with one click from their course, rehearse before a panel of three that read their thesis, against your rubric, and the grade goes back to your gradebook.",
  tech: "See the integration",
  platforms: "Connects over LTI 1.3 with",
  f1Title: "One click from the course.",
  f1Body: "Add Mockio as an activity in the thesis course. Students arrive signed in and in your institution's cohort: no accounts to make, no passwords to remember.",
  f1Course: "Thesis Seminar II · Fall 2026",
  f1Week: "Week 14 · Preparing the defence",
  f1Activity: "Defence rehearsal",
  f1Tool: "External tool · Mockio",
  f1Other: "Final thesis submission",
  f2Title: "Your rubric, on every record.",
  f2Body: "The panel grades against your school's criteria as well as the usual ones, and the deliberation says where the student met them and where not.",
  f2Rubric: "Graduate School rubric",
  f2c1: "Problem–aims–conclusions coherence",
  f2c2: "Command of the research design",
  f2c3: "Discussion against prior work",
  f3Title: "Coordinators see the whole cohort.",
  f3Body: "Who has rehearsed, who defends soon, how ready they are. Never their answers or the text of their thesis.",
  f3Head: "Cohort Fall 2026 · 84 of 120 seats",
  f3Student: "Student",
  f3Rehearsals: "Rehearsals",
  f3Grade: "Latest grade",
  f3Ready: "Readiness",
  f4Title: "The grade goes back to the course.",
  f4Body: "Every graded rehearsal is recorded in the course gradebook, like any other activity.",
  f4Book: "Gradebook",
  f4Item: "Defence rehearsal",
  noLmsTitle: "No learning platform?",
  noLmsBody: "You get a cohort code: students type it in Mockio and join your group, with your seats and your rubric.",
  privacyTitle: "The theses belong to your students.",
  privacy1: "Used only for their rehearsals; never to train models.",
  privacy2: "From your platform we receive only name, email and role.",
  privacy3: "Each student deletes their thesis with one click.",
  pricingTitle: "Licences per cohort.",
  pricingBody: "The price depends on how many students and how many full defences each. We send a proposal within one working day.",
  techTitle: "For your IT team.",
  techBody: "Register Mockio as an LTI 1.3 tool with these URLs. Then send us the Client ID, the Deployment ID and your platform's URLs, and we connect it.",
  techLogin: "Login initiation URL (OIDC)",
  techLaunch: "Launch and redirect URL",
  techJwks: "Public keyset URL (JWKS)",
  techConfig: "Configuration as JSON",
  techServices: "Services: the user's name and email, and grades (Assignment and Grade Services). Open in a new window.",
  formTitle: "Let's talk.",
  formBody: "Tell us about your institution and we'll write with a proposal.",
  fName: "Name",
  fRole: "Role",
  fEmail: "Work email",
  fInstitution: "Institution",
  fCountry: "Country",
  fStudents: "Students a year (approx.)",
  fPlatform: "Learning platform",
  fNone: "We don't use one",
  fOther: "Other",
  fMessage: "Anything else we should know?",
  fSend: "Send",
  fSent: "Thank you. We'll write within one working day.",
  fError: "We couldn't send it. Write to hello@getmockio.com.",
};

const BY_LOCALE: Record<string, Record<Key, string>> = { es: ES, pt: PT, en: EN };

const PLATFORMS = ["Moodle", "Canvas", "Blackboard Learn", "D2L Brightspace", "Sakai"];

/* ------------------------------------------------------------------------- */
/* Screens                                                                   */
/* ------------------------------------------------------------------------- */

function CourseScreen({ c }: { c: Record<Key, string> }) {
  return (
    <Screen>
      <div className="border-b border-[color:var(--line)] bg-surface-lift px-5 py-3">
        <p className="text-sm font-semibold text-cream-bright">{c.f1Course}</p>
      </div>
      <div className="p-5">
        <p className="text-xs font-semibold text-cream-dim">{c.f1Week}</p>
        <ul className="mt-3 flex flex-col gap-2">
          <li className="flex items-center gap-3 rounded-xl px-3 py-3 ring-2 ring-accent">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-ink">M</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-cream-bright">{c.f1Activity}</span>
              <span className="block text-xs text-cream-dim">{c.f1Tool}</span>
            </span>
          </li>
          <li className="flex items-center gap-3 rounded-xl px-3 py-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-lift text-sm text-cream-dim">↑</span>
            <span className="text-sm text-cream-dim">{c.f1Other}</span>
          </li>
        </ul>
      </div>
    </Screen>
  );
}

function RubricScreen({ c }: { c: Record<Key, string> }) {
  const rows = [
    { label: c.f2c1, value: 3, max: 4 },
    { label: c.f2c2, value: 2, max: 4 },
    { label: c.f2c3, value: 4, max: 4 },
  ];
  return (
    <Screen className="p-5 sm:p-6">
      <p className="text-sm font-semibold text-cream-bright">{c.f2Rubric}</p>
      <ul className="mt-4 divide-y divide-[color:var(--line)]">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 py-3">
            <span className="min-w-0 text-sm text-cream-bright">{row.label}</span>
            <span className="flex shrink-0 gap-1" aria-hidden>
              {Array.from({ length: row.max }, (_, index) => (
                <span key={index} className={`h-2 w-5 rounded-full ${index < row.value ? "bg-grow" : "bg-surface-lift"}`} />
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Screen>
  );
}

function CohortScreen({ c }: { c: Record<Key, string> }) {
  const rows = [
    ["Ana Q.", 4, "15", 78],
    ["Luis P.", 2, "11", 54],
    ["María T.", 5, "16", 85],
    ["Jorge R.", 0, "—", null],
  ] as const;
  return (
    <Screen>
      <p className="border-b border-[color:var(--line)] px-5 py-3 text-sm font-semibold text-cream-bright">{c.f3Head}</p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-cream-dim">
            <th className="px-5 py-2 font-medium">{c.f3Student}</th>
            <th className="px-2 py-2 text-right font-medium">{c.f3Rehearsals}</th>
            <th className="px-2 py-2 text-right font-medium">{c.f3Grade}</th>
            <th className="px-5 py-2 text-right font-medium">{c.f3Ready}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--line)]">
          {rows.map(([name, rehearsals, grade, ready]) => (
            <tr key={name}>
              <td className="px-5 py-2.5 text-cream-bright">{name}</td>
              <td className="px-2 py-2.5 text-right tabular-nums text-cream-dim">{rehearsals}</td>
              <td className="px-2 py-2.5 text-right tabular-nums text-cream-bright">{grade}</td>
              <td className="px-5 py-2.5 text-right tabular-nums">
                {ready === null ? (
                  <span className="text-cream-faint">—</span>
                ) : (
                  <span className={ready >= 70 ? "text-grow-text" : "text-step-text"}>{ready}%</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Screen>
  );
}

function GradebookScreen({ c }: { c: Record<Key, string> }) {
  return (
    <Screen>
      <p className="border-b border-[color:var(--line)] bg-surface-lift px-5 py-3 text-sm font-semibold text-cream-bright">{c.f4Book}</p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-cream-dim">
            <th className="px-5 py-2 font-medium">{c.f3Student}</th>
            <th className="px-5 py-2 text-right font-medium">{c.f4Item}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[color:var(--line)]">
          {[
            ["Ana Q.", "15,00 / 20"],
            ["Luis P.", "11,00 / 20"],
            ["María T.", "16,00 / 20"],
          ].map(([name, grade]) => (
            <tr key={name}>
              <td className="px-5 py-2.5 text-cream-bright">{name}</td>
              <td className="px-5 py-2.5 text-right tabular-nums text-cream-bright">{grade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Screen>
  );
}

function Feature({ title, body, screen, flip = false }: { title: string; body: string; screen: React.ReactNode; flip?: boolean }) {
  return (
    <div className="grid items-center gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-24 [&>*]:min-w-0">
      <FadeRise className={flip ? "md:order-2" : ""}>
        <h3 className="text-balance text-[clamp(1.75rem,3.2vw,2.5rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-cream-bright">{title}</h3>
        <p className="mt-4 max-w-md text-pretty text-lg leading-relaxed text-cream-dim">{body}</p>
      </FadeRise>
      <FadeRise delay={0.08} className={flip ? "md:order-1" : ""}>
        {screen}
      </FadeRise>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* The form                                                                  */
/* ------------------------------------------------------------------------- */

function LeadForm({ c }: { c: Record<Key, string> }) {
  const [values, setValues] = useState({
    name: "",
    role: "",
    email: "",
    institution: "",
    country: "",
    students: "",
    platform: "moodle",
    message: "",
  });
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const field = "focus-ring w-full rounded-xl bg-surface-lift px-3 py-3 text-base text-cream-bright placeholder:text-cream-faint";
  const label = "flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-cream-dim";
  const set = (key: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));

  if (state === "sent") {
    return (
      <p className="flex items-center gap-3 rounded-2xl bg-grow-soft px-5 py-4 text-base font-semibold text-grow-text">
        <Check aria-hidden className="h-5 w-5" strokeWidth={2.5} />
        {c.fSent}
      </p>
    );
  }

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        setState("sending");
        setError(null);
        sendB2bLead(values)
          .then(() => setState("sent"))
          .catch((caught) => {
            setError(caught instanceof ApiError && caught.status === 400 ? caught.message : c.fError);
            setState("idle");
          });
      }}
    >
      <label className={label}>
        {c.fName}
        <input required value={values.name} onChange={set("name")} maxLength={120} autoComplete="name" className={field} />
      </label>
      <label className={label}>
        {c.fRole}
        <input value={values.role} onChange={set("role")} maxLength={120} autoComplete="organization-title" className={field} />
      </label>
      <label className={label}>
        {c.fEmail}
        <input required type="email" value={values.email} onChange={set("email")} maxLength={200} autoComplete="email" className={field} />
      </label>
      <label className={label}>
        {c.fInstitution}
        <input required value={values.institution} onChange={set("institution")} maxLength={160} autoComplete="organization" className={field} />
      </label>
      <label className={label}>
        {c.fCountry}
        <input value={values.country} onChange={set("country")} maxLength={60} autoComplete="country-name" className={field} />
      </label>
      <label className={label}>
        {c.fStudents}
        <input type="number" min={1} inputMode="numeric" value={values.students} onChange={set("students")} className={field} />
      </label>
      <label className={`${label} sm:col-span-2`}>
        {c.fPlatform}
        <select value={values.platform} onChange={set("platform")} className={field}>
          <option value="moodle">Moodle</option>
          <option value="canvas">Canvas</option>
          <option value="blackboard">Blackboard</option>
          <option value="brightspace">D2L Brightspace</option>
          <option value="sakai">Sakai</option>
          <option value="otra">{c.fOther}</option>
          <option value="ninguna">{c.fNone}</option>
        </select>
      </label>
      <label className={`${label} sm:col-span-2`}>
        {c.fMessage}
        <textarea value={values.message} onChange={set("message")} rows={4} maxLength={2000} className={`${field} resize-y`} />
      </label>
      {error && (
        <p role="alert" className="rounded-xl bg-step-soft px-3 py-2 text-sm text-step-text sm:col-span-2">
          {error}
        </p>
      )}
      <div className="sm:col-span-2">
        <Action type="submit" withArrow disabled={state === "sending"} className="px-6 py-3 text-base">
          {c.fSend}
        </Action>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------------- */
/* The page                                                                  */
/* ------------------------------------------------------------------------- */

export function InstitutionsPage() {
  const { locale } = useLocale();
  const c = BY_LOCALE[locale] ?? EN;
  const origin = typeof window === "undefined" ? "https://getmockio.com" : window.location.origin;

  useEffect(() => {
    const previous = document.title;
    document.title = c.doc;
    return () => {
      document.title = previous;
    };
  }, [c.doc]);

  const jump = (href: string) => (event: { preventDefault(): void }) => {
    if (scrollToSection(href)) event.preventDefault();
  };

  return (
    <main className="bg-surface-base">
      <LandingNav
        links={[
          { label: c.navHome, href: "/" },
          { label: c.navHow, href: "#how" },
          { label: c.navTech, href: "#lti" },
          { label: c.navAffiliates, href: "/afiliados" },
        ]}
        cta={{ label: c.cta, to: "/instituciones#contacto" }}
      />

      <section className="pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
        <Wrap className="py-16 md:py-28">
          <FadeRise className="max-w-4xl">
            <p className="text-sm font-semibold text-accent-text">{c.kicker}</p>
            <h1 className="mt-4 text-balance text-[clamp(2.5rem,6vw,5rem)] font-semibold leading-[1] tracking-[-0.045em] text-cream-bright">
              {c.title}
            </h1>
            <Lede className="mt-6 max-w-2xl">{c.sub}</Lede>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <a href="#contacto" onClick={jump("#contacto")}>
                <Action withArrow className="px-6 py-3 text-base">
                  {c.cta}
                </Action>
              </a>
              <a
                href="#lti"
                onClick={jump("#lti")}
                className="focus-ring group inline-flex items-center gap-1 rounded-full text-base font-semibold text-accent-text"
              >
                {c.tech}
                <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-200 ease-press group-hover:translate-x-0.5" />
              </a>
            </div>
          </FadeRise>
        </Wrap>
      </section>

      <section className="border-y border-[color:var(--line)]">
        <Wrap className="flex flex-col gap-3 py-8 md:flex-row md:items-center md:gap-10">
          <p className="shrink-0 text-sm text-cream-dim">{c.platforms}</p>
          <ul className="flex flex-wrap gap-x-7 gap-y-2">
            {PLATFORMS.map((name) => (
              <li key={name} className="text-base font-semibold tracking-[-0.01em] text-cream-faint">
                {name}
              </li>
            ))}
          </ul>
        </Wrap>
      </section>

      <section id="how" className="scroll-mt-16">
        <Wrap className="divide-y divide-[color:var(--line)]">
          <Feature title={c.f1Title} body={c.f1Body} screen={<CourseScreen c={c} />} />
          <Feature title={c.f2Title} body={c.f2Body} screen={<RubricScreen c={c} />} flip />
          <Feature title={c.f3Title} body={c.f3Body} screen={<CohortScreen c={c} />} />
          <Feature title={c.f4Title} body={c.f4Body} screen={<GradebookScreen c={c} />} flip />
        </Wrap>
      </section>

      <section className="border-t border-[color:var(--line)] bg-surface-deep py-16 md:py-20">
        <Wrap className="grid gap-10 md:grid-cols-2">
          <FadeRise>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-cream-bright sm:text-3xl">{c.noLmsTitle}</h2>
            <p className="mt-3 max-w-md text-pretty text-lg text-cream-dim">{c.noLmsBody}</p>
          </FadeRise>
          <FadeRise delay={0.06}>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-cream-bright sm:text-3xl">{c.pricingTitle}</h2>
            <p className="mt-3 max-w-md text-pretty text-lg text-cream-dim">{c.pricingBody}</p>
          </FadeRise>
        </Wrap>
      </section>

      <section className="bg-cream-bright text-surface-base">
        <Wrap className="grid gap-10 py-20 md:grid-cols-2 md:py-24">
          <FadeRise>
            <h2 className="text-balance text-[clamp(2rem,4.5vw,3.5rem)] font-semibold leading-[1.04] tracking-[-0.04em]">{c.privacyTitle}</h2>
          </FadeRise>
          <FadeRise delay={0.08}>
            <ul className="divide-y divide-surface-base/15 border-y border-surface-base/15">
              {[c.privacy1, c.privacy2, c.privacy3].map((item) => (
                <li key={item} className="flex items-start gap-4 py-5 text-lg font-semibold tracking-[-0.01em]">
                  <Check aria-hidden className="mt-1 h-5 w-5 shrink-0" strokeWidth={2.5} />
                  {item}
                </li>
              ))}
            </ul>
          </FadeRise>
        </Wrap>
      </section>

      <section id="lti" className="scroll-mt-16 py-20 md:py-28">
        <Wrap className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-20">
          <FadeRise>
            <Title>{c.techTitle}</Title>
            <Lede className="mt-5 max-w-md">{c.techBody}</Lede>
          </FadeRise>
          <FadeRise delay={0.08}>
            <dl className="divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
              {[
                [c.techLogin, `${origin}/lti/login`],
                [c.techLaunch, `${origin}/lti/launch`],
                [c.techJwks, `${origin}/lti/jwks`],
                [c.techConfig, `${origin}/lti/config`],
              ].map(([term, value]) => (
                <div key={term} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <dt className="text-sm font-semibold text-cream-dim">{term}</dt>
                  <dd className="break-all font-mono text-sm text-cream-bright">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-cream-dim">{c.techServices}</p>
          </FadeRise>
        </Wrap>
      </section>

      <section id="contacto" className="scroll-mt-16 bg-surface-deep py-20 md:py-28">
        <Wrap className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-20">
          <FadeRise>
            <Title>{c.formTitle}</Title>
            <Lede className="mt-5 max-w-md">{c.formBody}</Lede>
          </FadeRise>
          <FadeRise delay={0.08}>
            <LeadForm c={c} />
          </FadeRise>
        </Wrap>
      </section>

      <SiteFooter />
    </main>
  );
}
