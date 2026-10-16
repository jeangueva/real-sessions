import { definePreviews } from "../../preview";
import { Action } from "../Action";
import { ShimmerText } from "./ShimmerText";

const CHIP = "inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text";

export const ShimmerTextPreviews = definePreviews([
  {
    id: "premium-chip",
    title: "In the Premium chip",
    kind: "default",
    description: "The product's only use: the plan's name, a slow light across it, then four seconds of stillness.",
    render: () => (
      <span className={CHIP}>
        <ShimmerText>Premium</ShimmerText>
      </span>
    ),
    code: `<span className="inline-flex rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text">
  <ShimmerText>Premium</ShimmerText>
</span>`,
  },
  {
    id: "disabled",
    title: "Disabled",
    kind: "state",
    state: "disabled",
    description: "No sweep: plain accent-text in the same box. This is also how it renders under reduced motion.",
    render: () => (
      <span className={CHIP}>
        <ShimmerText disabled>Premium</ShimmerText>
      </span>
    ),
    code: `<ShimmerText disabled>Premium</ShimmerText>`,
  },
  {
    id: "back-to-back",
    title: "Back to back",
    kind: "variant",
    description: "pause={0}: the next sweep starts as the last one leaves. Busier — keep it for a larger word that is the only thing moving.",
    render: () => (
      <ShimmerText pause={0} className="text-title font-semibold">
        Premium
      </ShimmerText>
    ),
    code: `<ShimmerText pause={0} className="text-title font-semibold">Premium</ShimmerText>`,
  },
  {
    id: "slower",
    title: "Slower",
    kind: "variant",
    description: "speed={4}: the light takes four seconds to cross, for a larger size where 2.4s would look hurried.",
    render: () => (
      <ShimmerText speed={4} className="text-title font-semibold">
        Pack Sustentación
      </ShimmerText>
    ),
    code: `<ShimmerText speed={4} className="text-title font-semibold">Pack Sustentación</ShimmerText>`,
  },
  {
    id: "long-name-phone",
    title: "A long name at phone width",
    kind: "edge",
    width: 320,
    description: "A name too long for its box wraps inside it, and the light crosses both lines at once in the same 2.4 seconds.",
    render: () => (
      <div lang="pt-BR" className="w-40">
        <ShimmerText className="text-title font-semibold">Defesa com professor</ShimmerText>
      </div>
    ),
    code: `<ShimmerText className="text-title font-semibold">Defesa com professor</ShimmerText>`,
  },
  {
    id: "top-bar",
    title: "The app's top bar, light theme",
    kind: "in-context",
    theme: "light",
    description: "The right end of the signed-in top bar on the paid plan: the chip, the person's name and the settings button. The light is the bar's only motion.",
    render: () => (
      <div className="flex items-center justify-end gap-3 bg-surface-deep px-4 py-3">
        <span className={CHIP}>
          <ShimmerText>Premium</ShimmerText>
        </span>
        <span className="max-w-[12rem] truncate text-sm font-medium text-cream-dim">Lucía Quispe</span>
        <a
          href="#ajustes"
          aria-label="Ajustes"
          className="focus-ring grid h-9 w-9 place-items-center rounded-full bg-surface-card text-sm font-semibold text-cream-bright shadow-card"
        >
          L
        </a>
      </div>
    ),
    code: `{isPremium && (
  <span className="hidden rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text sm:inline-flex">
    <ShimmerText>Premium</ShimmerText>
  </span>
)}`,
  },
  {
    id: "on-an-action",
    title: "On a call to action",
    kind: "misuse",
    description: "The shimmer laid over a primary button's label.",
    why: "Two failures at once. The base colour is accent-text, built for surfaces: on the accent fill it is 1.47:1 on the dark theme and 1.00:1 on the light one, so the label all but disappears between sweeps. And a light that returns every few seconds turns the choice into pressure. A primary Action is already the loudest thing on the screen.",
    render: () => (
      <Action withArrow>
        <ShimmerText>Suscribirme</ShimmerText>
      </Action>
    ),
    code: `{/* Don't */}
<Action withArrow>
  <ShimmerText>Suscribirme</ShimmerText>
</Action>

{/* Do */}
<Action withArrow>Suscribirme</Action>`,
  },
]);
