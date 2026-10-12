import { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BookOpenCheck,
  FileSearch,
  Gavel,
  Grid3x3,
  Mic,
  ShieldCheck,
  Upload,
  Users,
} from "lucide-react";
import { Action, Eyebrow, FadeRise, Panel, Section, WordsPullUp } from "@/design-system";
import { LandingNav } from "./LandingNav";
import { SiteFooter } from "./SiteFooter";
import { useLocale } from "@/hooks/useLocale";

/**
 * The front page for Sustentación.
 *
 * Sold on the one moment it is for: the night before the defence, when the
 * student knows the jury will ask about page 34 and has nobody to rehearse
 * with. Everything here is in the order that student's doubts arrive — what
 * is it, will it really read my thesis, what do I get, what does it cost,
 * is my thesis safe.
 *
 * Its own copy in Spanish, Portuguese and English, like the rest of the
 * defence screens; any other interface language reads the English.
 */
const ES = {
  navHow: "Cómo funciona",
  navPanel: "El jurado",
  navPricing: "Precios",
  cta: "Sube tu tesis gratis",
  heroTitle: "Tu jurado de 3, antes del jurado real.",
  heroSub:
    "Ensaya tu sustentación por voz con un panel que leyó tu tesis: preguntas sobre tus páginas, repreguntas como las de verdad y un acta de 0 a 20 al final.",
  heroNote: "1 ensayo gratis · sin tarjeta",
  howEyebrow: "Cómo funciona",
  howTitle: "De tu PDF a tu acta en una tarde.",
  step1Title: "Sube tu tesis",
  step1Body: "PDF o Word. En segundos ves por dónde te va a atacar el jurado, con la página de cada punto débil y tu matriz de consistencia revisada.",
  step2Title: "Sustenta por voz",
  step2Body: "Expones y respondes a un presidente, una metodóloga y un especialista. Cada uno con su voz, su rol y sus repreguntas.",
  step3Title: "Recibe el acta",
  step3Body: "Nota de 0 a 20, qué opinó cada jurado, tu índice de preparación por capítulo y la respuesta que deberías dar la próxima vez.",
  panelEyebrow: "El jurado",
  panelTitle: "Preguntan por tu página 34, no por “una tesis cualquiera”.",
  juror1: "Presidente del jurado",
  juror2: "Metodóloga",
  juror3: "Especialista",
  q1: "Bachiller, en la página 34 usted concluye que las redes sociales causan el aumento de las ventas. Su diseño es correlacional. ¿Con qué sustento afirma causalidad?",
  q2: "Usted aplicó Pearson. ¿Verificó antes la normalidad de sus datos? En la tesis no aparece esa prueba.",
  actaLabel: "Acta simulada",
  actaVerdict: "Aprobado por mayoría",
  edgeTitle: "Lo que un chatbot no hace",
  edge1Title: "Lee tu tesis completa",
  edge1Body: "Hasta 300 páginas. Cada pregunta cita de dónde sale.",
  edge2Title: "Tres jurados, tres roles",
  edge2Body: "Forma, metodología y tema. Deliberan entre ellos antes del acta.",
  edge3Title: "Tu matriz de consistencia",
  edge3Body: "Problema, objetivos, hipótesis, resultados y conclusiones: dónde no cuadran.",
  edge4Title: "El formato de tu país",
  edge4Body: "Perú, Brasil, Colombia, Chile, Argentina, Ecuador, Bolivia, Uruguay y Panamá: su jurado, su vocabulario y su escala de notas.",
  pricingEyebrow: "Precios",
  pricingTitle: "Menos que una hora de asesoría.",
  freeName: "Gratis",
  freePrice: "S/ 0",
  free1: "1 ensayo express con un jurado",
  free2: "Diagnóstico de tu tesis",
  free3: "Sin tarjeta",
  packName: "Pack Sustentación",
  packPrice: "S/ 39",
  packUnit: "pago único",
  pack1: "5 sustentaciones con el panel de 3 jurados",
  pack2: "Diagnóstico completo y matriz de consistencia",
  pack3: "Acta simulada, deliberación y respuestas sugeridas",
  pack4: "Cuatro niveles: de calentamiento a jurado hostil",
  pack5: "Válido 6 meses",
  packCta: "Empezar gratis",
  legal1: "Mockio es una herramienta de práctica. No garantiza la aprobación de tu sustentación: la decisión es solo de tu jurado.",
  legal2: "La IA puede equivocarse. Verifica con tu asesor y con el reglamento de tu universidad.",
  privacyTitle: "Tu tesis es tuya.",
  privacyBody:
    "Es inédita y la tratamos así: solo se usa para tus ensayos, nunca para entrenar modelos, y la borras con un clic. Mockio no escribe tu tesis ni te sopla respuestas en la sustentación real: te ayuda a llegar preparado.",
  ladderTitle: "¿Ya sustentaste?",
  ladderBody: "Prepara tu primera entrevista de trabajo, en español o en inglés.",
  ladderCta: "Practicar entrevistas",
  docTitle: "Mockio — Ensaya tu sustentación de tesis con un jurado de 3",
};

type Key = keyof typeof ES;

const PT: Record<Key, string> = {
  navHow: "Como funciona",
  navPanel: "A banca",
  navPricing: "Preços",
  cta: "Envie seu trabalho grátis",
  heroTitle: "Sua banca de 3, antes da banca de verdade.",
  heroSub:
    "Ensaie sua defesa por voz com uma banca que leu seu trabalho: perguntas sobre as suas páginas, réplicas como as reais e uma ata no final.",
  heroNote: "1 ensaio grátis · sem cartão",
  howEyebrow: "Como funciona",
  howTitle: "Do seu PDF à sua ata em uma tarde.",
  step1Title: "Envie seu trabalho",
  step1Body: "PDF ou Word. Em segundos você vê onde a banca vai pressionar, com a página de cada ponto fraco e sua matriz de consistência revisada.",
  step2Title: "Defenda por voz",
  step2Body: "Você apresenta e responde a um presidente, uma metodóloga e um especialista. Cada um com sua voz, seu papel e suas réplicas.",
  step3Title: "Receba a ata",
  step3Body: "Nota, o que cada avaliador achou, seu índice de preparação por capítulo e a resposta que você deveria dar da próxima vez.",
  panelEyebrow: "A banca",
  panelTitle: "Perguntam pela sua página 34, não por “um trabalho qualquer”.",
  juror1: "Presidente da banca",
  juror2: "Metodóloga",
  juror3: "Especialista",
  q1: "Na página 34 você conclui que as redes sociais causam o aumento das vendas. Seu delineamento é correlacional. Com que base você afirma causalidade?",
  q2: "Você aplicou Pearson. Verificou antes a normalidade dos dados? Esse teste não aparece no trabalho.",
  actaLabel: "Ata simulada",
  actaVerdict: "Aprovado por maioria",
  edgeTitle: "O que um chatbot não faz",
  edge1Title: "Lê seu trabalho inteiro",
  edge1Body: "Até 300 páginas. Cada pergunta cita de onde vem.",
  edge2Title: "Três avaliadores, três papéis",
  edge2Body: "Forma, metodologia e tema. Deliberam entre si antes da ata.",
  edge3Title: "Sua matriz de consistência",
  edge3Body: "Problema, objetivos, hipóteses, resultados e conclusões: onde não fecham.",
  edge4Title: "O formato do seu país",
  edge4Body: "A banca brasileira — orientador, avaliador interno e externo, arguição e nota de 0 a 10 — e os formatos de mais oito países da América Latina.",
  pricingEyebrow: "Preços",
  pricingTitle: "Menos que uma hora de orientação.",
  freeName: "Grátis",
  freePrice: "R$ 0",
  free1: "1 ensaio express com um avaliador",
  free2: "Diagnóstico do seu trabalho",
  free3: "Sem cartão",
  packName: "Pacote Defesa",
  packPrice: "US$ 11",
  packUnit: "pagamento único",
  pack1: "5 defesas com a banca de 3",
  pack2: "Diagnóstico completo e matriz de consistência",
  pack3: "Ata simulada, deliberação e respostas sugeridas",
  pack4: "Quatro níveis: do aquecimento à banca hostil",
  pack5: "Válido por 6 meses",
  packCta: "Começar grátis",
  legal1: "O Mockio é uma ferramenta de prática. Não garante a aprovação da sua defesa: a decisão é só da sua banca.",
  legal2: "A IA pode errar. Confirme com seu orientador e com o regulamento da sua universidade.",
  privacyTitle: "Seu trabalho é seu.",
  privacyBody:
    "É inédito e tratamos assim: usado só nos seus ensaios, nunca para treinar modelos, e você apaga com um clique. O Mockio não escreve seu trabalho nem sopra respostas na defesa real: ajuda você a chegar preparado.",
  ladderTitle: "Já defendeu?",
  ladderBody: "Prepare sua primeira entrevista de emprego, em português ou em inglês.",
  ladderCta: "Praticar entrevistas",
  docTitle: "Mockio — Ensaie sua defesa com uma banca de 3",
};

const EN: Record<Key, string> = {
  navHow: "How it works",
  navPanel: "The panel",
  navPricing: "Pricing",
  cta: "Upload your thesis free",
  heroTitle: "Your panel of three, before the real one.",
  heroSub:
    "Rehearse your thesis defence by voice with a panel that read your thesis: questions about your pages, follow-ups like the real ones, and a graded record at the end.",
  heroNote: "1 free rehearsal · no card",
  howEyebrow: "How it works",
  howTitle: "From your PDF to your record in an afternoon.",
  step1Title: "Upload your thesis",
  step1Body: "PDF or Word. In seconds you see where the panel will press, with the page of every weak point and your consistency matrix checked.",
  step2Title: "Defend it out loud",
  step2Body: "You present and answer a chair, a methodologist and a subject specialist, each with their own voice, role and follow-ups.",
  step3Title: "Get the record",
  step3Body: "A grade, what each juror thought, your readiness by chapter, and the answer to give next time.",
  panelEyebrow: "The panel",
  panelTitle: "They ask about your page 34, not about “a thesis”.",
  juror1: "Chair of the panel",
  juror2: "Methodologist",
  juror3: "Subject specialist",
  q1: "On page 34 you conclude that social media causes the rise in sales. Your design is correlational. On what basis do you claim causation?",
  q2: "You used Pearson. Did you check your data for normality first? That test is not in the thesis.",
  actaLabel: "Simulated record",
  actaVerdict: "Passed by majority",
  edgeTitle: "What a chatbot does not do",
  edge1Title: "Reads your whole thesis",
  edge1Body: "Up to 300 pages. Every question cites where it comes from.",
  edge2Title: "Three jurors, three roles",
  edge2Body: "Form, methodology and subject. They deliberate before the record.",
  edge3Title: "Your consistency matrix",
  edge3Body: "Problem, objectives, hypotheses, results and conclusions: where they do not line up.",
  edge4Title: "Your country's format",
  edge4Body: "Peru, Brazil, Colombia, Chile, Argentina, Ecuador, Bolivia, Uruguay and Panama: each one's panel, vocabulary and grading scale.",
  pricingEyebrow: "Pricing",
  pricingTitle: "Less than an hour with a tutor.",
  freeName: "Free",
  freePrice: "US$ 0",
  free1: "1 express rehearsal with one juror",
  free2: "Your thesis diagnosis",
  free3: "No card",
  packName: "Defence Pack",
  packPrice: "US$ 11",
  packUnit: "one-time",
  pack1: "5 defences with the panel of three",
  pack2: "Full diagnosis and consistency matrix",
  pack3: "Simulated record, deliberation and suggested answers",
  pack4: "Four levels, from warm-up to a hostile panel",
  pack5: "Valid for 6 months",
  packCta: "Start free",
  legal1: "Mockio is a practice tool. It does not guarantee you pass your defence: that decision is your jury's alone.",
  legal2: "AI can be wrong. Check with your advisor and your university's regulations.",
  privacyTitle: "Your thesis is yours.",
  privacyBody:
    "It is unpublished and we treat it that way: used only for your rehearsals, never to train models, and deleted with one click. Mockio does not write your thesis or feed you answers in the real defence: it helps you arrive prepared.",
  ladderTitle: "Already defended?",
  ladderBody: "Prepare for your first job interview, in your language or in English.",
  ladderCta: "Practise interviews",
  docTitle: "Mockio — Rehearse your thesis defence with a panel of three",
};

const BY_LOCALE: Record<string, Record<Key, string>> = { es: ES, pt: PT, en: EN };

export function DefenseLanding() {
  const { locale } = useLocale();
  const c = BY_LOCALE[locale] ?? EN;
  const start = "/app/thesis";

  // The tab and the search result say what this page is, not the old one.
  useEffect(() => {
    const previous = document.title;
    document.title = c.docTitle;
    return () => {
      document.title = previous;
    };
  }, [c.docTitle]);

  const steps = [
    { icon: Upload, title: c.step1Title, body: c.step1Body },
    { icon: Mic, title: c.step2Title, body: c.step2Body },
    { icon: Gavel, title: c.step3Title, body: c.step3Body },
  ];
  const edges = [
    { icon: FileSearch, title: c.edge1Title, body: c.edge1Body },
    { icon: Users, title: c.edge2Title, body: c.edge2Body },
    { icon: Grid3x3, title: c.edge3Title, body: c.edge3Body },
    { icon: BookOpenCheck, title: c.edge4Title, body: c.edge4Body },
  ];

  return (
    <main className="bg-surface-base">
      <LandingNav
        links={[
          { label: c.navHow, href: "#how" },
          { label: c.navPanel, href: "#panel" },
          { label: c.navPricing, href: "#pricing" },
        ]}
        cta={{ label: c.cta, to: start }}
      />

      {/* Hero: the promise, the way in, and what it costs to try. */}
      <section className="px-4 pb-8 pt-[calc(7rem+env(safe-area-inset-top,0px))] sm:px-6 sm:pt-36 lg:px-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <h1 className="text-balance text-[clamp(2.25rem,5vw,4rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-cream-bright">
            <WordsPullUp align="center" className="w-full">{c.heroTitle}</WordsPullUp>
          </h1>
          <FadeRise delay={0.2} className="mt-5 max-w-2xl">
            <p className="text-balance text-base text-cream-dim sm:text-lg">{c.heroSub}</p>
          </FadeRise>
          <FadeRise delay={0.35} className="mt-8 flex flex-col items-center gap-3">
            <Link to={start}>
              <Action withArrow className="px-6 py-3 text-base">
                {c.cta}
              </Action>
            </Link>
            <span className="text-sm text-cream-dim">{c.heroNote}</span>
          </FadeRise>
        </div>
      </section>

      {/* How it works. */}
      <Section id="how">
        <FadeRise className="mx-auto max-w-2xl text-center">
          <Eyebrow>{c.howEyebrow}</Eyebrow>
          <h2 className="mt-3 text-balance text-headline font-semibold text-cream-bright">{c.howTitle}</h2>
        </FadeRise>
        <ol className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3 [&>*]:min-w-0">
          {steps.map((step, index) => (
            <li key={step.title}>
              <FadeRise delay={index * 0.08} className="h-full">
                <Panel variant="raised" className="flex h-full flex-col gap-3 p-6 shadow-lift">
                  <span className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-accent-text">
                      <step.icon aria-hidden className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold text-cream-dim">{index + 1}</span>
                  </span>
                  <h3 className="text-lg font-semibold text-cream-bright">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-cream-dim">{step.body}</p>
                </Panel>
              </FadeRise>
            </li>
          ))}
        </ol>
      </Section>

      {/* The panel, shown rather than described. */}
      <Section id="panel" className="bg-surface-deep">
        <FadeRise className="mx-auto max-w-2xl text-center">
          <Eyebrow>{c.panelEyebrow}</Eyebrow>
          <h2 className="mt-3 text-balance text-headline font-semibold text-cream-bright">{c.panelTitle}</h2>
        </FadeRise>
        <div className="mx-auto mt-12 grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] [&>*]:min-w-0">
          <FadeRise className="flex flex-col gap-3">
            {[
              { name: "Dr. Paredes", role: c.juror3, text: c.q1 },
              { name: "Dra. Vidal", role: c.juror2, text: c.q2 },
            ].map((line) => (
              <Panel key={line.name} variant="raised" className="flex gap-4 p-5 shadow-lift">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-ink">
                  {line.name.replace(/^Dra?\.\s*/, "").slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-cream-bright">
                    {line.name} <span className="font-normal text-cream-dim">· {line.role}</span>
                  </p>
                  <p className="mt-1 text-base leading-relaxed text-cream">“{line.text}”</p>
                </div>
              </Panel>
            ))}
          </FadeRise>
          <FadeRise delay={0.1}>
            <Panel variant="raised" className="flex h-full flex-col justify-center gap-4 p-6 shadow-lift">
              <span className="flex items-center gap-2 text-sm font-semibold text-accent-text">
                <Gavel aria-hidden className="h-4 w-4" />
                {c.actaLabel}
              </span>
              <p className="flex items-baseline gap-2">
                <span className="text-[3.5rem] font-bold leading-none tabular-nums text-cream-bright">14</span>
                <span className="text-xl font-semibold text-cream-faint">/ 20</span>
              </p>
              <span className="self-start rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-text">
                {c.actaVerdict}
              </span>
              <div className="flex flex-col gap-2">
                {[78, 52, 70].map((value, index) => (
                  <span key={index} className="block h-2 overflow-hidden rounded-full bg-surface-lift">
                    <span
                      className={`block h-full rounded-full ${value >= 70 ? "bg-grow" : "bg-accent"}`}
                      style={{ width: `${value}%` }}
                    />
                  </span>
                ))}
              </div>
            </Panel>
          </FadeRise>
        </div>

        <FadeRise className="mx-auto mt-16 max-w-2xl text-center">
          <h3 className="text-title font-semibold text-cream-bright">{c.edgeTitle}</h3>
        </FadeRise>
        <div className="mx-auto mt-6 grid max-w-5xl gap-4 sm:grid-cols-2 [&>*]:min-w-0">
          {edges.map((edge, index) => (
            <FadeRise key={edge.title} delay={index * 0.06}>
              <div className="flex h-full gap-3 rounded-2xl bg-surface-card p-5 shadow-card">
                <edge.icon aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-accent-text" />
                <div className="min-w-0">
                  <p className="font-semibold text-cream-bright">{edge.title}</p>
                  <p className="mt-1 text-sm text-cream-dim">{edge.body}</p>
                </div>
              </div>
            </FadeRise>
          ))}
        </div>
      </Section>

      {/* Pricing, with the notices a buyer must see before paying. */}
      <Section id="pricing">
        <FadeRise className="mx-auto max-w-2xl text-center">
          <Eyebrow>{c.pricingEyebrow}</Eyebrow>
          <h2 className="mt-3 text-balance text-headline font-semibold text-cream-bright">{c.pricingTitle}</h2>
        </FadeRise>
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2 [&>*]:min-w-0">
          <FadeRise>
            <Panel variant="raised" className="flex h-full flex-col gap-4 p-7 shadow-lift">
              <p className="text-lg font-semibold text-cream-bright">{c.freeName}</p>
              <p className="text-[2.5rem] font-bold leading-none text-cream-bright">{c.freePrice}</p>
              <ul className="flex flex-col gap-2 text-sm text-cream">
                {[c.free1, c.free2, c.free3].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden className="text-grow-text">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </Panel>
          </FadeRise>
          <FadeRise delay={0.08}>
            <Panel variant="raised" className="flex h-full flex-col gap-4 p-7 shadow-lift ring-2 ring-accent">
              <p className="text-lg font-semibold text-cream-bright">{c.packName}</p>
              <p className="flex items-baseline gap-2">
                <span className="text-[2.5rem] font-bold leading-none text-cream-bright">{c.packPrice}</span>
                <span className="text-sm text-cream-dim">{c.packUnit}</span>
              </p>
              <ul className="flex flex-col gap-2 text-sm text-cream">
                {[c.pack1, c.pack2, c.pack3, c.pack4, c.pack5].map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden className="text-grow-text">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
              <Link to={start} className="mt-auto self-start">
                <Action withArrow>{c.packCta}</Action>
              </Link>
            </Panel>
          </FadeRise>
        </div>
        <div className="mx-auto mt-6 flex max-w-4xl flex-col gap-1 text-center text-xs text-cream-dim">
          <p>{c.legal1}</p>
          <p>{c.legal2}</p>
        </div>
      </Section>

      {/* Privacy, then the way on to the rest of Mockio. */}
      <Section className="bg-surface-deep">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2 [&>*]:min-w-0">
          <FadeRise>
            <Panel variant="raised" className="flex h-full gap-4 p-7 shadow-lift">
              <ShieldCheck aria-hidden className="h-6 w-6 shrink-0 text-grow-text" />
              <div>
                <h2 className="text-lg font-semibold text-cream-bright">{c.privacyTitle}</h2>
                <p className="mt-2 text-sm leading-relaxed text-cream-dim">{c.privacyBody}</p>
              </div>
            </Panel>
          </FadeRise>
          <FadeRise delay={0.08}>
            <Panel variant="raised" className="flex h-full flex-col items-start gap-3 p-7 shadow-lift">
              <h2 className="text-lg font-semibold text-cream-bright">{c.ladderTitle}</h2>
              <p className="text-sm text-cream-dim">{c.ladderBody}</p>
              <Link
                to="/entrevistas"
                className="focus-ring mt-auto rounded-full text-sm font-semibold text-accent-text underline underline-offset-4"
              >
                {c.ladderCta}
              </Link>
            </Panel>
          </FadeRise>
        </div>
      </Section>

      <SiteFooter />
    </main>
  );
}
