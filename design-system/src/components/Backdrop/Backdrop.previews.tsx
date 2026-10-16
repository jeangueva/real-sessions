import { definePreviews } from "../../preview";
import { Action } from "../Action/Action";
import { Backdrop } from "./Backdrop";

/** The frame every specimen needs: positioned, clipping, and dark — the field paints light, not a ground. */
const FRAME = "on-media relative isolate overflow-hidden rounded-card bg-surface-base";

export const BackdropPreviews = definePreviews([
  {
    id: "hero",
    title: "Hero",
    kind: "default",
    theme: "dark",
    description: "The full field: the pale lift from below, the navy across the top-left, a faint third light on the right, grain and a top-weighted scrim. It drifts on minute-long loops.",
    render: () => (
      <div className={`${FRAME} h-80`}>
        <Backdrop />
      </div>
    ),
    code: `<div className="on-media relative isolate h-80 overflow-hidden bg-surface-base">
  <Backdrop />
</div>`,
  },
  {
    id: "still",
    title: "Still",
    kind: "state",
    state: "still",
    theme: "dark",
    description: "The same composition without the drift. What everyone with reduced motion sees, and what to pass under a paused video or a print.",
    render: () => (
      <div className={`${FRAME} h-80`}>
        <Backdrop still />
      </div>
    ),
    code: `<Backdrop still />`,
  },
  {
    id: "section",
    title: "Section",
    kind: "variant",
    theme: "dark",
    description: "Quieter, for mid-page: two lights pushed further out of frame, so the field is mostly dark with a glow at the edges.",
    render: () => (
      <div className={`${FRAME} h-64`}>
        <Backdrop variant="section" />
      </div>
    ),
    code: `<Backdrop variant="section" />`,
  },
  {
    id: "phone-portuguese",
    title: "Phone width, Portuguese hero",
    kind: "edge",
    width: 320,
    theme: "dark",
    description: "At 320px the longer Portuguese line wraps and the frame grows with it; the field fills whatever height results. The lights are sized to the viewport, so a narrow frame on a wide screen shows a crop.",
    render: () => (
      <section lang="pt-BR" className={`${FRAME} flex min-h-[24rem] flex-col justify-end px-5 pb-8`}>
        <Backdrop />
        <div className="relative z-10">
          <p className="text-sm font-semibold text-cream-bright/70">Defesa de TCC, dissertação e tese</p>
          <h2 className="mt-3 text-balance text-[2.25rem] font-semibold leading-[0.98] tracking-[-0.045em] text-cream-bright">
            Defenda antes de defender.
          </h2>
          <p className="mt-4 text-pretty text-base text-cream-bright/80">
            Uma banca de 3 que leu seu trabalho pergunta por voz, faz réplicas como a de verdade e deixa uma ata com sua nota.
          </p>
        </div>
      </section>
    ),
    code: `<section className="on-media relative isolate overflow-hidden bg-surface-base">
  <Backdrop />
  <div className="relative z-10">…</div>
</section>`,
  },
  {
    id: "thesis-hero-fallback",
    title: "The thesis landing without footage",
    kind: "in-context",
    theme: "dark",
    description: "The Sustentación hero when the video is missing or fails to load: HeroVideo falls back to this field, and the headline, the one way in and the note sit on it unchanged.",
    render: () => (
      <section className={`${FRAME} flex min-h-[28rem] flex-col justify-center px-8 py-12 sm:px-12`}>
        <Backdrop />
        <div className="relative z-10 max-w-2xl">
          <p className="text-sm font-semibold text-cream-bright/70">Sustentación de tesis</p>
          <h1 className="mt-4 text-balance text-[clamp(2.75rem,7vw,5.75rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-cream-bright">
            Sustenta antes de sustentar.
          </h1>
          <p className="mt-6 max-w-lg text-pretty text-lg leading-relaxed text-cream-bright/80">
            Un jurado de 3 que leyó tu tesis te pregunta por voz, repregunta como el de verdad y te deja un acta de 0 a 20.
          </p>
          <div className="mt-8">
            <Action withArrow className="px-6 py-3 text-base">
              Sube tu tesis gratis
            </Action>
          </div>
          <p className="mt-4 text-sm text-cream-bright/60">1 ensayo gratis · sin tarjeta</p>
        </div>
      </section>
    ),
    code: `<section className="on-media relative isolate flex min-h-[min(100svh,56rem)] flex-col overflow-hidden bg-black">
  <Backdrop />  {/* HeroVideo renders this when there is no video */}
  <div className="relative z-10">
    <p>Sustentación de tesis</p>
    <h1>Sustenta antes de sustentar.</h1>
    <Action withArrow>Sube tu tesis gratis</Action>
  </div>
</section>`,
  },
  {
    id: "on-a-light-section",
    title: "On a light section, under dark text",
    kind: "misuse",
    theme: "light",
    description: "The field dropped on a white section to add some interest, with near-black copy on it.",
    why: "The field paints light for a dark ground. On white the pale lights vanish, the navy and the scrim survive, and the copy sits in a grey wash — the product shipped exactly this once. On a light page use surface-deep or accent-soft, and keep Backdrop for dark heroes.",
    render: () => (
      <section className="relative isolate overflow-hidden rounded-card bg-white px-8 py-12">
        <Backdrop variant="section" />
        <div className="relative z-10 max-w-lg">
          <h2 className="text-title font-semibold text-neutral-900">Un jurado que leyó tu tesis. Completa.</h2>
          <p className="mt-3 text-base text-neutral-700">
            Hasta 300 páginas, escaneadas o no. Cada pregunta sale de una página que puedes abrir, y cada repregunta, de lo que acabas de responder.
          </p>
        </div>
      </section>
    ),
    code: `{/* Don't */}
<section className="relative overflow-hidden bg-white">
  <Backdrop variant="section" />
  <h2 className="text-neutral-900">Un jurado que leyó tu tesis. Completa.</h2>
</section>`,
  },
]);
