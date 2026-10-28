/**
 * The public page's middle: the product shown as the dashboard it is, not
 * described section by section.
 *
 * One sample thesis, laid out the way the signed-in screen lays out a real
 * one — where the panel will press on a map of the thesis, the call, the grade
 * over rehearsals, how ready the student is, the facts of the defence — so the
 * page and the product read as the same thing. Below it, the route from PDF to
 * record as four waypoints, and the degrees as tabs.
 */
import { useState, type ReactNode } from "react";
import { DashLabel, DashWidget, Gauge, TabBar, TopoMap, TrailChart } from "@/design-system";
import { SCENARIO_OPTIONS, type DefenseScenario } from "@/lib/defense-scenarios";
import { Wrap } from "./marketing";

const ES = {
  eyebrow: "Tu sustentación, en un tablero",
  title: "Todo lo que el jurado va a ver, antes de que lo vea.",
  map: "Dónde te van a presionar",
  risk2: "Pearson sin prueba de normalidad",
  call: "La videollamada",
  grade: "Tu nota por ensayo",
  tabGrade: "Nota",
  tabNerves: "Calma",
  tabTime: "Tiempo",
  pass: "Aprueba 14",
  first: "1.er ensayo",
  now: "Hoy",
  next: "Día D",
  ready: "Preparación",
  readyWord: "Lista",
  routeLabel: "La ruta",
  routeTitle: "De tu PDF a tu acta en una tarde.",
  step1: "Subes tu tesis",
  step1Sub: "1 minuto",
  step2: "Lees el diagnóstico",
  step2Sub: "Riesgos por página",
  step3: "Sustentas por voz",
  step3Sub: "Tu tiempo real",
  step4: "Recibes el acta",
  step4Sub: "Nota y respuestas",
  degreesLabel: "Grados",
  degreesTitle: "Del plan de tesis al doctorado.",
  minutes: "Minutos",
  questionsShort: "Preguntas",
  sc_proyecto: "Plan",
  sc_bachiller: "Bachiller",
  sc_titulo: "Título",
  sc_suficiencia: "Suficiencia",
  sc_maestria: "Maestría",
  sc_doctorado: "Doctorado",
};
type Key = keyof typeof ES;

const PT: Record<Key, string> = {
  eyebrow: "Sua defesa, em um painel",
  title: "Tudo o que a banca vai ver, antes que ela veja.",
  map: "Onde a banca vai pressionar",
  risk2: "Pearson sem teste de normalidade",
  call: "A videochamada",
  grade: "Sua nota por ensaio",
  tabGrade: "Nota",
  tabNerves: "Calma",
  tabTime: "Tempo",
  pass: "Aprova 7",
  first: "1.º ensaio",
  now: "Hoje",
  next: "Dia D",
  ready: "Preparo",
  readyWord: "Pronto",
  routeLabel: "O caminho",
  routeTitle: "Do seu PDF à sua ata em uma tarde.",
  step1: "Envia o trabalho",
  step1Sub: "1 minuto",
  step2: "Lê o diagnóstico",
  step2Sub: "Riscos por página",
  step3: "Defende por voz",
  step3Sub: "Seu tempo real",
  step4: "Recebe a ata",
  step4Sub: "Nota e respostas",
  degreesLabel: "Níveis",
  degreesTitle: "Do projeto ao doutorado.",
  minutes: "Minutos",
  questionsShort: "Perguntas",
  sc_proyecto: "Projeto",
  sc_bachiller: "Bacharel",
  sc_titulo: "TCC",
  sc_suficiencia: "Suficiência",
  sc_maestria: "Mestrado",
  sc_doctorado: "Doutorado",
};

const EN: Record<Key, string> = {
  eyebrow: "Your defence, as a dashboard",
  title: "Everything the panel will see, before they see it.",
  map: "Where the panel will press",
  risk2: "Pearson without a normality test",
  call: "The video call",
  grade: "Your grade per rehearsal",
  tabGrade: "Grade",
  tabNerves: "Calm",
  tabTime: "Time",
  pass: "Pass 14",
  first: "1st rehearsal",
  now: "Today",
  next: "D-day",
  ready: "Readiness",
  readyWord: "Ready",
  routeLabel: "The route",
  routeTitle: "From your PDF to your record in an afternoon.",
  step1: "Upload your thesis",
  step1Sub: "1 minute",
  step2: "Read the diagnosis",
  step2Sub: "Risks by page",
  step3: "Defend it out loud",
  step3Sub: "Your real slot",
  step4: "Get the record",
  step4Sub: "Grade and answers",
  degreesLabel: "Degrees",
  degreesTitle: "From the proposal to the doctorate.",
  minutes: "Minutes",
  questionsShort: "Questions",
  sc_proyecto: "Proposal",
  sc_bachiller: "Bachelor's",
  sc_titulo: "Honours",
  sc_suficiencia: "Professional",
  sc_maestria: "Master's",
  sc_doctorado: "Doctorate",
};

const BY_LOCALE: Record<string, Record<Key, string>> = { es: ES, pt: PT, en: EN };

/** The sample's grades, calm and time, rehearsal by rehearsal. */
const SERIES = {
  grade: { values: [10, 12, 11, 14, 15], ahead: [16, 17], min: 8, max: 18, mark: 14 },
  nerves: { values: [35, 48, 52, 61, 72], ahead: [78, 84], min: 25, max: 90, mark: 60 },
  time: { values: [24, 21, 19, 17, 15], ahead: [15, 15], min: 10, max: 26, mark: 15 },
} as const;
type SeriesKey = keyof typeof SERIES;

export function LandingDashboard({ locale, call }: { locale: string; call: ReactNode }) {
  const c = BY_LOCALE[locale] ?? EN;
  const [series, setSeries] = useState<SeriesKey>("grade");
  const data = SERIES[series];

  return (
    <section id="panel" className="scroll-mt-16 py-16 md:py-28">
      <Wrap>
        <DashLabel>{c.eyebrow}</DashLabel>
        <h2 className="mt-3 max-w-3xl text-balance text-[clamp(2rem,4.4vw,3.5rem)] font-light leading-[1.05] tracking-[-0.045em] text-cream-bright">
          {c.title}
        </h2>

        {/* Four widgets and nothing else: the call, how ready, where the
            panel will press, and the grade over rehearsals. */}
        <div className="mt-10 grid gap-3 lg:grid-cols-12">
          <DashWidget label={c.call} className="lg:col-span-7">
            {call}
          </DashWidget>
          <DashWidget label={c.ready} className="lg:col-span-5 [&>div:last-child]:my-auto">
            <Gauge value={72} center="72%" caption={c.readyWord} left="0" right="100" className="!bg-transparent !p-0" />
          </DashWidget>
          <DashWidget label={c.map} className="lg:col-span-5">
            <TopoMap
              ariaLabel={c.map}
              pins={[
                { x: 0.04, y: 0.85, tone: "violet" },
                { x: 0.45, y: 0.55, tone: "ink" },
                { x: 0.9, y: 0.12, tone: "orange" },
              ]}
            />
            <p className="flex items-baseline justify-between gap-3 text-sm text-cream">
              <span className="min-w-0 truncate">{c.risk2}</span>
              <span className="font-mono text-xs text-cream-dim">p. 41</span>
            </p>
          </DashWidget>
          <DashWidget label={c.grade} className="lg:col-span-7">
            <div role="tabpanel">
              <TrailChart
                key={series}
                ariaLabel={c.grade}
                values={[...data.values]}
                ahead={[...data.ahead]}
                min={data.min}
                max={data.max}
                mark={{ value: data.mark, label: series === "grade" ? c.pass : "" }}
                labels={[c.first, c.now, c.next]}
              />
            </div>
            <TabBar<SeriesKey>
              label={c.grade}
              value={series}
              onChange={setSeries}
              tabs={[
                { value: "grade", label: c.tabGrade },
                { value: "nerves", label: c.tabNerves },
                { value: "time", label: c.tabTime },
              ]}
            />
          </DashWidget>
        </div>
      </Wrap>
    </section>
  );
}

/** The four steps as waypoints on one route, the last one the summit. */
export function LandingRoute({ locale }: { locale: string }) {
  const c = BY_LOCALE[locale] ?? EN;
  const steps = [
    { title: c.step1, sub: c.step1Sub },
    { title: c.step2, sub: c.step2Sub },
    { title: c.step3, sub: c.step3Sub },
    { title: c.step4, sub: c.step4Sub },
  ];
  return (
    <section id="how" className="scroll-mt-16 py-16 md:py-28">
      <Wrap>
        <DashLabel>{c.routeLabel}</DashLabel>
        <h2 className="mt-3 max-w-2xl text-balance text-[clamp(2rem,4.4vw,3.25rem)] font-light leading-[1.05] tracking-[-0.045em] text-cream-bright">
          {c.routeTitle}
        </h2>
        <ol className="relative mt-12 grid gap-8 md:grid-cols-4 md:gap-4">
          <span aria-hidden className="absolute left-[12.5%] right-[12.5%] top-[0.6875rem] hidden border-t-2 border-dotted border-cream-faint/50 md:block" />
          {steps.map((step, index) => (
            <li key={step.title} className="relative flex items-start gap-4 md:flex-col md:items-center md:gap-4 md:text-center">
              <span
                aria-hidden
                className={`relative h-6 w-6 shrink-0 rounded-full ring-4 ring-surface-base ${
                  index === steps.length - 1 ? "bg-[#F59E0B]" : index === 0 ? "bg-[#7C6CF2]" : "bg-cream-bright"
                }`}
              />
              <span>
                <span className="block text-xl font-light tracking-[-0.03em] text-cream-bright">{step.title}</span>
                <span className="mt-1 block font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">{step.sub}</span>
              </span>
            </li>
          ))}
        </ol>
      </Wrap>
    </section>
  );
}

/** The degrees as tabs, each showing its slot, its questions and the toughness. */
export function LandingDegrees({ locale }: { locale: string }) {
  const c = BY_LOCALE[locale] ?? EN;
  const scenarios = Object.keys(SCENARIO_OPTIONS) as DefenseScenario[];
  const [scenario, setScenario] = useState<DefenseScenario>(scenarios.includes("titulo" as DefenseScenario) ? ("titulo" as DefenseScenario) : scenarios[0]!);
  const option = SCENARIO_OPTIONS[scenario];
  return (
    <section id="scenarios" className="scroll-mt-16 py-16 md:py-28">
      <Wrap>
        <DashLabel>{c.degreesLabel}</DashLabel>
        <h2 className="mt-3 max-w-2xl text-balance text-[clamp(2rem,4.4vw,3.25rem)] font-light leading-[1.05] tracking-[-0.045em] text-cream-bright">
          {c.degreesTitle}
        </h2>
        <DashWidget className="mt-10 max-w-3xl">
          <TabBar<DefenseScenario>
            label={c.degreesLabel}
            value={scenario}
            onChange={setScenario}
            tabs={scenarios.map((entry) => ({ value: entry, label: c[`sc_${entry}` as Key] ?? entry }))}
          />
          <dl role="tabpanel" className="grid grid-cols-2 px-2 py-3">
            <div>
              <dd className="text-5xl font-light tracking-[-0.05em] tabular-nums text-cream-bright">{option.exposition}</dd>
              <dt className="mt-1 font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">{c.minutes}</dt>
            </div>
            <div>
              <dd className="text-5xl font-light tracking-[-0.05em] tabular-nums text-cream-bright">{option.questions}</dd>
              <dt className="mt-1 font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">{c.questionsShort}</dt>
            </div>
          </dl>
        </DashWidget>
      </Wrap>
    </section>
  );
}
