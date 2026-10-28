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
import { CalendarDays, Clock, FileText, Gavel, MessageSquareQuote, Mic, Search, Users } from "lucide-react";
import { DashLabel, DashWidget, DataChip, Gauge, StatTile, TabBar, TopoMap, TrailChart, Well } from "@/design-system";
import { SCENARIO_OPTIONS, type DefenseScenario } from "@/lib/defense-scenarios";
import { Wrap } from "./marketing";

const ES = {
  extras: "Además",
  extra1: "Diapositivas",
  extra2: "Preguntas reales",
  extra3: "Tu ensayo en video",
  extra4: "Observaciones",
  eyebrow: "Tu sustentación, en un tablero",
  title: "Todo lo que el jurado va a ver, antes de que lo vea.",
  thesis: "Estrés laboral y desempeño docente en Lima, 2025",
  chipCareer: "Psicología",
  chipScale: "Perú 0–20",
  chipPages: "86 páginas",
  hello: "Hola, sube tu tesis",
  helloSub: "PDF, Word o fotos · hasta 300 páginas",
  drop: "Elige tu archivo",
  map: "Dónde te van a presionar",
  mapStart: "Introducción",
  mapPeak: "Discusión",
  risk1: "Causalidad con diseño correlacional",
  risk2: "Pearson sin prueba de normalidad",
  risk3: "Muestra por conveniencia",
  call: "La videollamada",
  callChip: "3 jurados por voz",
  grade: "Tu nota por ensayo",
  tabGrade: "Nota",
  tabNerves: "Calma",
  tabTime: "Tiempo",
  pass: "Aprueba 14",
  first: "1.er ensayo",
  now: "Hoy",
  next: "Día D",
  ready: "Preparación",
  readyPill: "Toda la tesis",
  readyWord: "Lista",
  plan: "Faltan",
  planValue: "9 días",
  questions: "Preguntas",
  questionsValue: "12",
  facts: "Tu sustentación",
  exposition: "Exposición",
  panel: "Jurado",
  panelValue: "3",
  record: "Acta",
  recordValue: "0–20",
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
  levels: "Exigencia",
  lv: "Calentamiento,Estándar,Exigente,Hostil",
};
type Key = keyof typeof ES;

const PT: Record<Key, string> = {
  extras: "Além disso",
  extra1: "Slides",
  extra2: "Perguntas reais",
  extra3: "Seu ensaio em vídeo",
  extra4: "Observações",
  eyebrow: "Sua defesa, em um painel",
  title: "Tudo o que a banca vai ver, antes que ela veja.",
  thesis: "Estresse no trabalho e desempenho docente em São Paulo, 2025",
  chipCareer: "Psicologia",
  chipScale: "Brasil 0–10",
  chipPages: "86 páginas",
  hello: "Olá, envie seu trabalho",
  helloSub: "PDF, Word ou fotos · até 300 páginas",
  drop: "Escolha o arquivo",
  map: "Onde a banca vai pressionar",
  mapStart: "Introdução",
  mapPeak: "Discussão",
  risk1: "Causalidade com desenho correlacional",
  risk2: "Pearson sem teste de normalidade",
  risk3: "Amostra por conveniência",
  call: "A videochamada",
  callChip: "3 avaliadores por voz",
  grade: "Sua nota por ensaio",
  tabGrade: "Nota",
  tabNerves: "Calma",
  tabTime: "Tempo",
  pass: "Aprova 7",
  first: "1.º ensaio",
  now: "Hoje",
  next: "Dia D",
  ready: "Preparo",
  readyPill: "Todo o trabalho",
  readyWord: "Pronto",
  plan: "Faltam",
  planValue: "9 dias",
  questions: "Perguntas",
  questionsValue: "12",
  facts: "Sua defesa",
  exposition: "Apresentação",
  panel: "Banca",
  panelValue: "3",
  record: "Ata",
  recordValue: "0–10",
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
  levels: "Exigência",
  lv: "Aquecimento,Padrão,Exigente,Hostil",
};

const EN: Record<Key, string> = {
  extras: "And more",
  extra1: "Slides",
  extra2: "Real questions",
  extra3: "Your rehearsal on video",
  extra4: "Observations",
  eyebrow: "Your defence, as a dashboard",
  title: "Everything the panel will see, before they see it.",
  thesis: "Work stress and teacher performance in Lima, 2025",
  chipCareer: "Psychology",
  chipScale: "Peru 0–20",
  chipPages: "86 pages",
  hello: "Hi, upload your thesis",
  helloSub: "PDF, Word or photos · up to 300 pages",
  drop: "Choose your file",
  map: "Where the panel will press",
  mapStart: "Introduction",
  mapPeak: "Discussion",
  risk1: "Causation from a correlational design",
  risk2: "Pearson without a normality test",
  risk3: "Convenience sample",
  call: "The video call",
  callChip: "3 examiners by voice",
  grade: "Your grade per rehearsal",
  tabGrade: "Grade",
  tabNerves: "Calm",
  tabTime: "Time",
  pass: "Pass 14",
  first: "1st rehearsal",
  now: "Today",
  next: "D-day",
  ready: "Readiness",
  readyPill: "Whole thesis",
  readyWord: "Ready",
  plan: "To go",
  planValue: "9 days",
  questions: "Questions",
  questionsValue: "12",
  facts: "Your defence",
  exposition: "Presentation",
  panel: "Panel",
  panelValue: "3",
  record: "Record",
  recordValue: "0–20",
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
  levels: "Toughness",
  lv: "Warm-up,Standard,Demanding,Hostile",
};

const BY_LOCALE: Record<string, Record<Key, string>> = { es: ES, pt: PT, en: EN };

/** The sample's grades, calm and time, rehearsal by rehearsal. */
const SERIES = {
  grade: { values: [10, 12, 11, 14, 15], ahead: [16, 17], min: 8, max: 18, mark: 14 },
  nerves: { values: [35, 48, 52, 61, 72], ahead: [78, 84], min: 25, max: 90, mark: 60 },
  time: { values: [24, 21, 19, 17, 15], ahead: [15, 15], min: 10, max: 26, mark: 15 },
} as const;
type SeriesKey = keyof typeof SERIES;

export function LandingDashboard({ locale, call, onPick }: { locale: string; call: ReactNode; onPick: () => void }) {
  const c = BY_LOCALE[locale] ?? EN;
  const [series, setSeries] = useState<SeriesKey>("grade");
  const data = SERIES[series];
  const risks = [
    { text: c.risk1, page: 34, tone: "orange" as const },
    { text: c.risk2, page: 41, tone: "orange" as const },
    { text: c.risk3, page: 31, tone: "violet" as const },
  ];

  return (
    <section id="panel" className="scroll-mt-16 py-12 md:py-20">
      <Wrap>
        <DashLabel>{c.eyebrow}</DashLabel>
        <h2 className="mt-3 max-w-3xl text-balance text-[clamp(2rem,4.4vw,3.5rem)] font-light leading-[1.05] tracking-[-0.045em] text-cream-bright">
          {c.title}
        </h2>

        {/* The sample's header: its title in the light display cut and the
            facts of the thesis as chips, the way the app heads a thesis. */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="mr-2 text-lg font-light tracking-[-0.02em] text-cream-bright">{c.thesis}</span>
          <DataChip icon={<Users />}>{c.chipCareer}</DataChip>
          <DataChip icon={<Gavel />}>{c.chipScale}</DataChip>
          <DataChip icon={<FileText />}>{c.chipPages}</DataChip>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-12">
          {/* Left column: the way in, and the thesis as a map of where it
              will be pressed. */}
          <div className="flex flex-col gap-3 lg:col-span-4">
            <DashWidget>
              <p className="text-2xl font-light tracking-[-0.03em] text-cream-bright">{c.hello}</p>
              <p className="text-sm text-cream-dim">{c.helloSub}</p>
              <button
                type="button"
                onClick={onPick}
                className="focus-ring flex items-center justify-between rounded-xl bg-surface-lift px-3 py-2.5 font-mono text-xs font-medium uppercase tracking-[0.06em] text-cream-dim transition-colors hover:text-cream-bright"
              >
                {c.drop}
                <Search aria-hidden className="h-4 w-4" />
              </button>
            </DashWidget>
            <DashWidget label={c.map}>
              <TopoMap
                ariaLabel={c.map}
                pins={[
                  { x: 0.04, y: 0.85, tone: "violet" },
                  { x: 0.36, y: 0.6, tone: "ink" },
                  { x: 0.6, y: 0.42, tone: "ink" },
                  { x: 0.9, y: 0.12, tone: "orange" },
                ]}
              />
              <div className="flex justify-between font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">
                <span>{c.mapStart}</span>
                <span>{c.mapPeak}</span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {risks.map((risk) => (
                  <li key={risk.page} className="flex items-center gap-2 text-sm text-cream">
                    <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${risk.tone === "orange" ? "bg-[#F59E0B]" : "bg-[#7C6CF2]"}`} />
                    <span className="min-w-0 flex-1 truncate">{risk.text}</span>
                    <span className="font-mono text-xs text-cream-dim">p. {risk.page}</span>
                  </li>
                ))}
              </ul>
            </DashWidget>

            <DashWidget label={c.extras} className="flex-1">
              <ul className="grid grid-cols-2 gap-2">
                {[c.extra1, c.extra2, c.extra3, c.extra4].map((item) => (
                  <li key={item}>
                    <Well className="flex h-full items-center gap-2 !p-3 text-sm text-cream-bright">
                      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                      {item}
                    </Well>
                  </li>
                ))}
              </ul>
            </DashWidget>
          </div>

          {/* Middle: the call, then the grade over rehearsals. */}
          <div className="flex flex-col gap-3 lg:col-span-5">
            <DashWidget label={c.call} action={<DataChip icon={<Mic />}>{c.callChip}</DataChip>}>
              {call}
            </DashWidget>
            <DashWidget
              label={c.grade}
              action={
                <span className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">
                  <span className="flex items-center gap-1"><span aria-hidden className="h-2 w-2 rounded-full bg-cream-bright" />{c.now}</span>
                  <span className="flex items-center gap-1"><span aria-hidden className="h-2 w-2 rounded-full bg-accent" />{c.next}</span>
                </span>
              }
            >
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
                  { value: "grade", label: c.tabGrade, icon: <Gavel /> },
                  { value: "nerves", label: c.tabNerves, icon: <Mic /> },
                  { value: "time", label: c.tabTime, icon: <Clock /> },
                ]}
              />
            </DashWidget>
          </div>

          {/* Right column: how ready, and the facts of the defence. */}
          <div className="flex flex-col gap-3 lg:col-span-3">
            <DashWidget label={c.ready}>
              <Gauge value={72} center="72%" caption={c.readyWord} left="0" right="100" pill={c.readyPill} />
              <div className="grid grid-cols-2 gap-2">
                <Well className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">
                    <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" />
                    {c.plan}
                  </span>
                  <span className="font-mono text-lg font-medium text-cream-bright">{c.planValue}</span>
                </Well>
                <Well className="flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">
                    <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[#FBD06A]" />
                    {c.questions}
                  </span>
                  <span className="font-mono text-lg font-medium text-cream-bright">{c.questionsValue}</span>
                </Well>
              </div>
            </DashWidget>
            <DashWidget label={c.facts} className="flex-1">
              <StatTile icon={<Clock />} value="15 min" caption={c.exposition} />
              <StatTile icon={<Users />} value={c.panelValue} caption={c.panel} />
              <StatTile icon={<MessageSquareQuote />} value={c.recordValue} caption={c.record} />
            </DashWidget>
          </div>
        </div>
      </Wrap>
    </section>
  );
}

/** The four steps as waypoints on one route, the last one the summit. */
export function LandingRoute({ locale }: { locale: string }) {
  const c = BY_LOCALE[locale] ?? EN;
  const steps = [
    { title: c.step1, sub: c.step1Sub, icon: <FileText /> },
    { title: c.step2, sub: c.step2Sub, icon: <Search /> },
    { title: c.step3, sub: c.step3Sub, icon: <Mic /> },
    { title: c.step4, sub: c.step4Sub, icon: <Gavel /> },
  ];
  return (
    <section id="how" className="scroll-mt-16 py-12 md:py-20">
      <Wrap>
        <DashWidget label={c.routeLabel} className="gap-6 !p-6 sm:!p-8">
          <h2 className="max-w-2xl text-balance text-[clamp(2rem,4.4vw,3.25rem)] font-light leading-[1.05] tracking-[-0.045em] text-cream-bright">
            {c.routeTitle}
          </h2>
          <ol className="relative grid gap-3 md:grid-cols-4">
            {/* The route itself, dotted, behind the waypoints on wide screens. */}
            <span aria-hidden className="absolute left-[12%] right-[12%] top-[1.375rem] hidden border-t-2 border-dotted border-cream-faint/60 md:block" />
            {steps.map((step, index) => (
              <li key={step.title} className="relative flex flex-col items-start gap-3 md:items-center md:text-center">
                <span
                  aria-hidden
                  className={`relative grid h-11 w-11 place-items-center rounded-full [&>svg]:h-5 [&>svg]:w-5 ${
                    index === steps.length - 1 ? "bg-[#F59E0B] text-white" : index === 0 ? "bg-[#7C6CF2] text-white" : "bg-surface-card text-cream-bright ring-2 ring-[color:var(--line-strong)]"
                  }`}
                >
                  {step.icon}
                </span>
                <Well className="w-full">
                  <span className="block font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">0{index + 1} · {step.sub}</span>
                  <span className="mt-1 block text-xl font-light tracking-[-0.03em] text-cream-bright">{step.title}</span>
                </Well>
              </li>
            ))}
          </ol>
        </DashWidget>
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
  const levels = c.lv.split(",");
  return (
    <section id="scenarios" className="scroll-mt-16 py-12 md:py-20">
      <Wrap className="grid gap-3 lg:grid-cols-12">
        <DashWidget label={c.degreesLabel} className="lg:col-span-5">
          <h2 className="text-balance text-[clamp(2rem,4.4vw,3.25rem)] font-light leading-[1.05] tracking-[-0.045em] text-cream-bright">
            {c.degreesTitle}
          </h2>
        </DashWidget>
        <DashWidget className="lg:col-span-7">
          <TabBar<DefenseScenario>
            label={c.degreesLabel}
            value={scenario}
            onChange={setScenario}
            tabs={scenarios.map((entry) => ({ value: entry, label: c[`sc_${entry}` as Key] ?? entry }))}
          />
          <div role="tabpanel" className="grid gap-2 sm:grid-cols-2">
            <StatTile icon={<CalendarDays />} value={option.exposition} caption={c.minutes} />
            <StatTile icon={<MessageSquareQuote />} value={option.questions} caption={c.questionsShort} />
          </div>
          <DashLabel>{c.levels}</DashLabel>
          <div className="grid grid-cols-4 gap-1 rounded-2xl bg-surface-lift p-1">
            {levels.map((level, index) => (
              <span key={level} className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-center font-mono text-xs font-medium uppercase tracking-[0.02em] text-cream-dim">
                <span aria-hidden className="flex items-end gap-0.5 text-cream-bright">
                  {[0, 1, 2, 3].map((bar) => (
                    <span key={bar} className={`w-1 rounded-sm ${bar <= index ? "bg-current" : "bg-current opacity-20"}`} style={{ height: `${6 + bar * 3}px` }} />
                  ))}
                </span>
                {level}
              </span>
            ))}
          </div>
        </DashWidget>
      </Wrap>
    </section>
  );
}
