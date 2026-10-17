import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { Action, FadeRise } from "@/design-system";
import { LandingNav } from "./LandingNav";
import { SiteFooter } from "./SiteFooter";
import { Lede, Screen, Title, Wrap } from "./marketing";
import { useLocale } from "@/hooks/useLocale";
import { scrollToSection } from "@/lib/scroll-to-section";

/**
 * The affiliate programme, for anyone who sends students Mockio's way:
 * thesis advisors, teachers, people who make content for students, tutoring
 * schools. Same page language as the defence landing — left-aligned type,
 * the product drawn as itself, one idea per section.
 *
 * What it promises is what the product does: a code and a link, 30% of every
 * purchase by a student linked to it, the student's progress only if they
 * share it, and payment by the method the affiliate chose.
 */
const ES = {
  doc: "Mockio — Programa de afiliados",
  navBack: "Sustentación",
  navInstitutions: "Instituciones",
  cta: "Crear mi enlace",
  title: "Gana el 30% de cada tesis que ayudas a preparar.",
  sub: "Comparte tu enlace con tus tesistas, tus seguidores o tus alumnos. Cada vez que uno compra un plan de sustentación, el 30% es tuyo.",
  how: "Cómo funciona",
  mockTitle: "Tu panel de afiliado",
  mockPending: "Por cobrar",
  mockPaid: "Cobrado",
  mockSales: "Ventas",
  mockLink: "Tu enlace",
  mockStudents: "Tesistas que comparten su avance",
  mockStudent1: "Ana · sustenta el 22 oct",
  mockStudent2: "Luis · 3 ensayos",
  mockStudent3: "María · preparación 72%",
  stepsTitle: "Tres pasos, sin contratos.",
  step1: "Crea tu código",
  step1Body: "Con tu cuenta de Mockio, en un minuto. Tienes un código de 6 letras y un enlace propio.",
  step2: "Compártelo",
  step2Body: "En tu clase, tu grupo de WhatsApp, tus redes o tu web. El estudiante que entra por tu enlace o escribe tu código queda vinculado a ti.",
  step3: "Cobra",
  step3Body: "El 30% de cada compra se suma a tu saldo. Tras 7 días (el plazo de devolución) queda disponible y te lo pagamos por Yape, Plin, transferencia o PayPal.",
  earnTitle: "Lo que ganas por cada compra",
  earnPlan: "Plan",
  earnPrice: "Precio",
  earnYours: "Para ti",
  plan1: "Pack Sustentación",
  plan2: "Pase Intensivo",
  plan3: "Tesis grupal",
  forTitle: "Para quien acompaña tesis.",
  for1: "Asesores de tesis",
  for1Body: "Recomiéndalo a tus tesistas y ve su avance, si ellos lo comparten.",
  for2: "Docentes",
  for2Body: "Para los cursos de taller de tesis y seminario de investigación.",
  for3: "Creadores",
  for3Body: "Si haces contenido sobre tesis, metodología o vida universitaria.",
  for4: "Academias",
  for4Body: "Si preparas a estudiantes para sustentar, súmalo a tu servicio.",
  faqTitle: "Preguntas frecuentes",
  q1: "¿Cuándo cuenta una venta?",
  a1: "Cuando un estudiante vinculado a ti compra cualquier plan de sustentación. Se vincula al entrar por tu enlace o al escribir tu código en la app.",
  q2: "¿Por cuánto tiempo gano?",
  a2: "Por cada compra que haga mientras siga vinculado a ti, no solo la primera.",
  q3: "¿Qué veo de mis estudiantes?",
  a3: "Solo si ellos deciden compartirlo: el título de su tesis, su fecha, cuántos ensayos hicieron y sus notas. Nunca sus respuestas ni su tesis.",
  q4: "¿Cómo me pagan?",
  a4: "Cada comisión espera 7 días, el plazo en que el estudiante puede pedir devolución. Luego queda disponible. Los primeros 10 días de cada mes pagamos lo disponible, si llega a S/ 50; si no, se acumula para el mes siguiente. En tu panel ves lo que está en espera, lo disponible y lo cobrado.",
  q5: "¿Y si quiero pagarles los ensayos a mis tesistas?",
  a5: "Con Asesor Pro patrocinas hasta 20 tesistas con 3 sustentaciones completas al mes cada uno, con tu nombre.",
  finalTitle: "Tu enlace está a un minuto.",
  finalSub: "Crea tu cuenta, escribe tu nombre como te conocen tus alumnos y empieza a compartir.",
};
type Key = keyof typeof ES;

const PT: Record<Key, string> = {
  doc: "Mockio — Programa de afiliados",
  navBack: "Defesa",
  navInstitutions: "Instituições",
  cta: "Criar meu link",
  title: "Ganhe 30% de cada trabalho que você ajuda a preparar.",
  sub: "Compartilhe seu link com seus orientandos, seguidores ou alunos. Cada vez que um deles compra um plano de defesa, 30% são seus.",
  how: "Como funciona",
  mockTitle: "Seu painel de afiliado",
  mockPending: "A receber",
  mockPaid: "Recebido",
  mockSales: "Vendas",
  mockLink: "Seu link",
  mockStudents: "Orientandos que compartilham o progresso",
  mockStudent1: "Ana · defende em 22 out",
  mockStudent2: "Luís · 3 ensaios",
  mockStudent3: "Maria · preparação 72%",
  stepsTitle: "Três passos, sem contrato.",
  step1: "Crie seu código",
  step1Body: "Com sua conta Mockio, em um minuto. Você recebe um código de 6 letras e um link próprio.",
  step2: "Compartilhe",
  step2Body: "Na aula, no grupo de WhatsApp, nas redes ou no site. Quem entra pelo seu link ou digita seu código fica vinculado a você.",
  step3: "Receba",
  step3Body: "30% de cada compra entram no seu saldo. Depois de 7 dias (o prazo de reembolso) ficam disponíveis e pagamos por transferência ou PayPal.",
  earnTitle: "O que você ganha por compra",
  earnPlan: "Plano",
  earnPrice: "Preço",
  earnYours: "Para você",
  plan1: "Pacote Defesa",
  plan2: "Passe Intensivo",
  plan3: "Trabalho em grupo",
  forTitle: "Para quem acompanha trabalhos.",
  for1: "Orientadores",
  for1Body: "Recomende aos orientandos e acompanhe o progresso, se eles compartilharem.",
  for2: "Professores",
  for2Body: "Para as disciplinas de TCC e metodologia de pesquisa.",
  for3: "Criadores",
  for3Body: "Se você faz conteúdo sobre TCC, metodologia ou vida universitária.",
  for4: "Cursinhos",
  for4Body: "Se você prepara estudantes para a defesa, inclua no seu serviço.",
  faqTitle: "Perguntas frequentes",
  q1: "Quando uma venda conta?",
  a1: "Quando um estudante vinculado a você compra qualquer plano de defesa. Ele se vincula ao entrar pelo seu link ou digitar seu código no app.",
  q2: "Por quanto tempo eu ganho?",
  a2: "Por cada compra que ele fizer enquanto continuar vinculado a você, não só a primeira.",
  q3: "O que eu vejo dos estudantes?",
  a3: "Só se eles decidirem compartilhar: título, data, quantos ensaios fizeram e as notas. Nunca as respostas nem o trabalho.",
  q4: "Como recebo?",
  a4: "Cada comissão espera 7 dias, o prazo em que o estudante pode pedir reembolso. Depois fica disponível. Nos primeiros 10 dias de cada mês pagamos o disponível, se chegar ao mínimo; se não, acumula para o mês seguinte. No painel você vê o que está em espera, o disponível e o recebido.",
  q5: "E se eu quiser pagar os ensaios dos meus orientandos?",
  a5: "Com o Orientador Pro você patrocina até 20 orientandos com 3 defesas completas por mês cada um, com seu nome.",
  finalTitle: "Seu link está a um minuto.",
  finalSub: "Crie sua conta, escreva seu nome como os alunos conhecem você e comece a compartilhar.",
};

const EN: Record<Key, string> = {
  doc: "Mockio — Affiliate programme",
  navBack: "Thesis defence",
  navInstitutions: "Institutions",
  cta: "Get my link",
  title: "Earn 30% of every thesis you help prepare.",
  sub: "Share your link with your students, your followers or your class. Every time one of them buys a defence plan, 30% is yours.",
  how: "How it works",
  mockTitle: "Your affiliate dashboard",
  mockPending: "To be paid",
  mockPaid: "Paid",
  mockSales: "Sales",
  mockLink: "Your link",
  mockStudents: "Students sharing their progress",
  mockStudent1: "Ana · defends on 22 Oct",
  mockStudent2: "Luis · 3 rehearsals",
  mockStudent3: "María · readiness 72%",
  stepsTitle: "Three steps, no contract.",
  step1: "Get your code",
  step1Body: "With your Mockio account, in a minute. You get a six-letter code and a link of your own.",
  step2: "Share it",
  step2Body: "In class, in your group chat, on social media or your site. A student who comes through your link or types your code is linked to you.",
  step3: "Get paid",
  step3Body: "30% of every purchase goes to your balance. After 7 days (the refund window) it becomes available, and we pay it by bank transfer or PayPal.",
  earnTitle: "What you earn per purchase",
  earnPlan: "Plan",
  earnPrice: "Price",
  earnYours: "Yours",
  plan1: "Defence Pack",
  plan2: "Intensive Pass",
  plan3: "Group thesis",
  forTitle: "For anyone who supports a thesis.",
  for1: "Thesis advisors",
  for1Body: "Recommend it to your students and follow their progress, if they share it.",
  for2: "Teachers",
  for2Body: "For thesis workshop and research methods courses.",
  for3: "Creators",
  for3Body: "If you make content about theses, methodology or university life.",
  for4: "Tutoring schools",
  for4Body: "If you prepare students for their defence, add it to your service.",
  faqTitle: "Questions",
  q1: "When does a sale count?",
  a1: "When a student linked to you buys any defence plan. They are linked when they come through your link or type your code in the app.",
  q2: "For how long do I earn?",
  a2: "On every purchase they make while they stay linked to you, not only the first.",
  q3: "What do I see of my students?",
  a3: "Only if they choose to share it: their thesis title, date, how many rehearsals and their grades. Never their answers or their thesis.",
  q4: "How am I paid?",
  a4: "Each commission waits 7 days, the window in which a student can ask for a refund. Then it becomes available. In the first 10 days of each month we pay what is available once it reaches the minimum; otherwise it rolls over to the next month. Your dashboard shows what is on hold, available and paid.",
  q5: "What if I want to pay for my students' rehearsals?",
  a5: "With Advisor Pro you sponsor up to 20 students with 3 full defences a month each, in your name.",
  finalTitle: "Your link is a minute away.",
  finalSub: "Create your account, write your name the way your students know you, and start sharing.",
};

const BY_LOCALE: Record<string, Record<Key, string>> = { es: ES, pt: PT, en: EN };

/** The plans a commission is earned on, at their list price in soles. */
const PLANS = [
  { key: "plan1" as const, es: 39, usd: 11 },
  { key: "plan2" as const, es: 79, usd: 23 },
  { key: "plan3" as const, es: 119, usd: 35 },
];

function DashboardScreen({ c }: { c: Record<Key, string> }) {
  return (
    <Screen className="p-5 sm:p-6">
      <p className="text-sm font-semibold text-cream-bright">{c.mockTitle}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: c.mockPending, value: "S/ 46.80" },
          { label: c.mockPaid, value: "S/ 117.00" },
          { label: c.mockSales, value: "13" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-surface-lift px-3 py-2.5">
            <dt className="text-xs text-cream-dim">{stat.label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums tracking-[-0.02em] text-cream-bright">{stat.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs font-semibold text-cream-dim">{c.mockLink}</p>
      <p className="mt-1 rounded-xl bg-surface-lift px-3 py-2 font-mono text-sm text-cream-bright">getmockio.com/?asesor=K7P2QM</p>
      <p className="mt-4 text-xs font-semibold text-cream-dim">{c.mockStudents}</p>
      <ul className="mt-1 divide-y divide-[color:var(--line)]">
        {[c.mockStudent1, c.mockStudent2, c.mockStudent3].map((student) => (
          <li key={student} className="py-2 text-sm text-cream-bright">
            {student}
          </li>
        ))}
      </ul>
    </Screen>
  );
}

export function AffiliatesPage() {
  const { locale } = useLocale();
  const c = BY_LOCALE[locale] ?? EN;
  const soles = locale === "es";

  useEffect(() => {
    const previous = document.title;
    document.title = c.doc;
    return () => {
      document.title = previous;
    };
  }, [c.doc]);

  const money = (value: number) => (soles ? `S/ ${value.toFixed(2)}` : `US$ ${value.toFixed(2)}`);
  const start = "/app/advisor";

  return (
    <main className="bg-surface-base">
      <LandingNav
        links={[
          { label: c.navBack, href: "/" },
          { label: c.how, href: "#how" },
          { label: c.navInstitutions, href: "/instituciones" },
        ]}
        cta={{ label: c.cta, to: start }}
      />

      <section className="pt-[calc(3.5rem+env(safe-area-inset-top,0px))]">
        <Wrap className="grid items-center gap-14 py-16 md:py-24 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-20">
          <FadeRise>
            <h1 className="text-balance text-headline font-semibold text-cream-bright">
              {c.title}
            </h1>
            <Lede className="mt-6 max-w-xl">{c.sub}</Lede>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link to={start}>
                <Action withArrow className="px-6 py-3 text-base">
                  {c.cta}
                </Action>
              </Link>
              <a
                href="#how"
                onClick={(event) => {
                  if (scrollToSection("#how")) event.preventDefault();
                }}
                className="focus-ring group inline-flex items-center gap-1 rounded-full text-base font-semibold text-accent-text"
              >
                {c.how}
                <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-200 ease-press group-hover:translate-x-0.5" />
              </a>
            </div>
          </FadeRise>
          <FadeRise delay={0.1}>
            <DashboardScreen c={c} />
          </FadeRise>
        </Wrap>
      </section>

      <section id="how" className="scroll-mt-16 bg-surface-deep py-20 md:py-28">
        <Wrap>
          <FadeRise>
            <Title className="max-w-2xl">{c.stepsTitle}</Title>
          </FadeRise>
          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {[
              { title: c.step1, body: c.step1Body },
              { title: c.step2, body: c.step2Body },
              { title: c.step3, body: c.step3Body },
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

      <section className="py-20 md:py-28">
        <Wrap className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-20">
          <FadeRise>
            <Title>{c.earnTitle}</Title>
          </FadeRise>
          <FadeRise delay={0.08}>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[color:var(--line-strong)] text-sm text-cream-dim">
                  <th className="py-3 font-medium">{c.earnPlan}</th>
                  <th className="py-3 text-right font-medium">{c.earnPrice}</th>
                  <th className="py-3 text-right font-medium">{c.earnYours}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--line)]">
                {PLANS.map((plan) => {
                  const price = soles ? plan.es : plan.usd;
                  return (
                    <tr key={plan.key}>
                      <td className="py-4 text-lg font-semibold tracking-[-0.01em] text-cream-bright">{c[plan.key]}</td>
                      <td className="py-4 text-right tabular-nums text-cream-dim">{money(price)}</td>
                      <td className="py-4 text-right text-lg font-semibold tabular-nums text-grow-text">{money(price * 0.3)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </FadeRise>
        </Wrap>
      </section>

      <section className="border-t border-[color:var(--line)] py-20 md:py-24">
        <Wrap>
          <FadeRise>
            <Title className="max-w-2xl">{c.forTitle}</Title>
          </FadeRise>
          <dl className="mt-12 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: c.for1, body: c.for1Body },
              { title: c.for2, body: c.for2Body },
              { title: c.for3, body: c.for3Body },
              { title: c.for4, body: c.for4Body },
            ].map((item, index) => (
              <FadeRise key={item.title} delay={index * 0.05}>
                <dt className="text-lg font-semibold text-cream-bright">{item.title}</dt>
                <dd className="mt-1 text-pretty text-base text-cream-dim">{item.body}</dd>
              </FadeRise>
            ))}
          </dl>
        </Wrap>
      </section>

      <section className="bg-surface-deep py-20 md:py-28">
        <Wrap className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-20">
          <FadeRise>
            <Title>{c.faqTitle}</Title>
          </FadeRise>
          <FadeRise delay={0.08}>
            <dl className="divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
              {[
                [c.q1, c.a1],
                [c.q2, c.a2],
                [c.q3, c.a3],
                [c.q4, c.a4],
                [c.q5, c.a5],
              ].map(([question, answer]) => (
                <div key={question} className="py-5">
                  <dt className="flex gap-3 text-lg font-semibold tracking-[-0.01em] text-cream-bright">
                    <Check aria-hidden className="mt-1.5 h-4 w-4 shrink-0 text-accent-text" strokeWidth={2.5} />
                    {question}
                  </dt>
                  <dd className="mt-2 pl-7 text-pretty text-base leading-relaxed text-cream-dim">{answer}</dd>
                </div>
              ))}
            </dl>
          </FadeRise>
        </Wrap>
      </section>

      <section className="py-24 md:py-32">
        <Wrap>
          <FadeRise className="flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <h2 className="text-balance text-[clamp(2.25rem,5.5vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-cream-bright">
                {c.finalTitle}
              </h2>
              <Lede className="mt-5 max-w-xl">{c.finalSub}</Lede>
            </div>
            <Link to={start} className="shrink-0">
              <Action withArrow className="px-7 py-3.5 text-base">
                {c.cta}
              </Action>
            </Link>
          </FadeRise>
        </Wrap>
      </section>

      <SiteFooter />
    </main>
  );
}
