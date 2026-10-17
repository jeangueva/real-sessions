import { definePreviews } from "../../preview";
import { Action } from "../Action/Action";
import { Eyebrow } from "../Eyebrow/Eyebrow";
import { Panel } from "../Panel/Panel";
import { Section } from "./Section";

export const SectionPreviews = definePreviews([
  {
    id: "band",
    title: "A landing band",
    kind: "default",
    description:
      "The habit band from the landing page: an Eyebrow, the h2 and one line of body in a narrow centred column. The band's background is in className; the h2 names the section.",
    render: () => (
      <Section id="habit" aria-labelledby="habit-title" className="bg-surface-deep">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Practicar como si fuera un juego</Eyebrow>
          <h2 id="habit-title" className="mt-3 text-balance text-headline font-semibold text-cream-bright">
            Un hábito que vas a querer mantener
          </h2>
          <p className="mt-4 text-base text-cream-dim sm:text-lg">
            XP por cada entrevista, una racha que perdona un mal día, misiones semanales e insignias que te ganas. Y
            Mocki crece contigo.
          </p>
        </div>
      </Section>
    ),
    code: `<Section id="habit" aria-labelledby="habit-title" className="bg-surface-deep">
  <div className="mx-auto max-w-2xl text-center">
    <Eyebrow>Practicar como si fuera un juego</Eyebrow>
    <h2 id="habit-title" className="mt-3 text-balance text-headline font-semibold text-cream-bright">
      Un hábito que vas a querer mantener
    </h2>
    <p className="mt-4 text-base text-cream-dim sm:text-lg">XP por cada entrevista, …</p>
  </div>
</Section>`,
  },
  {
    id: "alternating",
    title: "Alternating backgrounds",
    kind: "variant",
    description:
      "Consecutive bands alternate surface-base and surface-deep through className. The rhythm (padding) is identical; only the ground changes, which is what tells one band from the next without a rule between them.",
    render: () => (
      <div>
        <Section id="journey-demo" aria-labelledby="journey-demo-title" className="bg-surface-base">
          <div className="mx-auto max-w-2xl text-center">
            <Eyebrow>De la entrevista al aumento</Eyebrow>
            <h2 id="journey-demo-title" className="mt-3 text-balance text-headline font-semibold text-cream-bright">
              Cada conversación de un trabajo remoto, ensayada antes de que cuente.
            </h2>
          </div>
        </Section>
        <Section id="features-demo" aria-labelledby="features-demo-title" className="bg-surface-deep">
          <h2 id="features-demo-title" className="mx-auto max-w-3xl text-balance text-center text-headline font-semibold">
            <span className="text-cream-bright">Devoluciones que nombran el error.</span>{" "}
            <span className="text-cream-faint">Hecho para la entrevista, no para una clase de gramática.</span>
          </h2>
        </Section>
      </div>
    ),
    code: `<Section id="journey" aria-labelledby="journey-title" className="bg-surface-base">…</Section>
<Section id="features" aria-labelledby="features-title" className="bg-surface-deep">…</Section>`,
  },
  {
    id: "long-portuguese-phone",
    title: "Long Portuguese heading at 320px",
    kind: "edge",
    width: 320,
    description:
      "At phone width the gutters drop to 16px and the band keeps its 80px above and below. The Portuguese heading takes an extra line; nothing is cut.",
    render: () => (
      <Section id="habit-pt" aria-labelledby="habit-pt-title" className="bg-surface-deep">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Praticar como se fosse um jogo</Eyebrow>
          <h2 id="habit-pt-title" className="mt-3 text-balance text-headline font-semibold text-cream-bright">
            Um hábito que você vai querer manter
          </h2>
          <p className="mt-4 text-base text-cream-dim">
            XP a cada entrevista, uma sequência que perdoa um dia ruim, missões semanais e insígnias que você conquista.
            E o Mocki cresce com você.
          </p>
        </div>
      </Section>
    ),
    code: `<Section id="habit" aria-labelledby="habit-title" className="bg-surface-deep">
  <div className="mx-auto max-w-2xl text-center">
    <Eyebrow>Praticar como se fosse um jogo</Eyebrow>
    <h2 id="habit-title" className="mt-3 text-balance text-headline …">Um hábito que você vai querer manter</h2>
    <p className="mt-4 text-base text-cream-dim">XP a cada entrevista, …</p>
  </div>
</Section>`,
  },
  {
    id: "pricing",
    title: "Pricing: heading and tiers",
    kind: "in-context",
    description:
      "The pricing band of the landing page. The heading block is narrowed inside; the tiers are Panels in a grid on a <div> inside the band, each tier's name an h3 under the band's h2.",
    render: () => (
      <Section id="pricing" aria-labelledby="pricing-title" className="bg-surface-base">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>Precios</Eyebrow>
          <h2 id="pricing-title" className="mt-3 text-balance text-headline font-semibold text-cream-bright">
            Gratis para conseguir el trabajo. Después, al precio de tu país.
          </h2>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-2">
          <Panel className="flex h-full flex-col gap-6 p-7 sm:p-9">
            <div>
              <h3 className="text-title font-semibold text-cream-bright">Gratis</h3>
              <p className="mt-4 text-sm text-cream-dim">Todo para conseguir el trabajo. Cinco entrevistas por semana.</p>
            </div>
            <Action tone="glass" className="mt-auto w-full">
              Empezar a practicar
            </Action>
          </Panel>
          <Panel variant="raised" className="flex h-full flex-col gap-6 p-7 ring-2 ring-accent sm:p-9">
            <div>
              <h3 className="text-title font-semibold text-cream-bright">Premium</h3>
              <p className="mt-4 text-sm text-cream-dim">
                De la entrevista al aumento: tu inglés de trabajo, practicado en voz alta.
              </p>
            </div>
          </Panel>
        </div>
      </Section>
    ),
    code: `<Section id="pricing" aria-labelledby="pricing-title" className="bg-surface-base">
  <div className="mx-auto max-w-3xl text-center">
    <Eyebrow>Precios</Eyebrow>
    <h2 id="pricing-title" className="mt-3 text-balance text-headline font-semibold text-cream-bright">
      Gratis para conseguir el trabajo. Después, al precio de tu país.
    </h2>
  </div>
  <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-2">
    <Panel className="flex h-full flex-col gap-6 p-7 sm:p-9">…</Panel>
    <Panel variant="raised" className="flex h-full flex-col gap-6 p-7 ring-2 ring-accent sm:p-9">…</Panel>
  </div>
</Section>`,
  },
  {
    id: "grid-on-section",
    title: "Grid classes on the Section",
    kind: "misuse",
    description: "The two Panels were meant to sit side by side; they stack.",
    why: "className lands on the outer <section>, whose only child is the centred column. grid-cols-2 lays out that one column, so the Panels stack inside its first cell. Put the grid on a <div> inside the Section.",
    render: () => (
      <Section id="grid-misuse" className="grid gap-5 bg-surface-deep lg:grid-cols-2">
        <Panel className="p-6">
          <p className="text-sm text-cream-bright">Gratis</p>
        </Panel>
        <Panel className="p-6">
          <p className="text-sm text-cream-bright">Premium</p>
        </Panel>
      </Section>
    ),
    code: `{/* Don't */}
<Section className="grid gap-5 lg:grid-cols-2">
  <Panel>…</Panel>
  <Panel>…</Panel>
</Section>

{/* Do */}
<Section>
  <div className="grid gap-5 lg:grid-cols-2">
    <Panel>…</Panel>
    <Panel>…</Panel>
  </div>
</Section>`,
  },
]);
