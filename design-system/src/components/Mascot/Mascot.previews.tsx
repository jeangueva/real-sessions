import { definePreviews } from "../../preview";
import { Action } from "../Action/Action";
import { Wordmark } from "../Wordmark/Wordmark";
import { Mascot, type MascotLevel } from "./Mascot";

const STAGES: MascotLevel[] = [1, 2, 3, 4, 5, 6];

export const MascotPreviews = definePreviews([
  {
    id: "default",
    title: "Default",
    kind: "default",
    description: "Stage 3 at 64px, with the default alt \"Mocki, nivel 3\". The everyday face of the interview product.",
    render: () => <Mascot level={3} />,
    code: `<Mascot level={3} />`,
  },
  {
    id: "decorative",
    title: "Decorative, beside a heading",
    kind: "state",
    state: "decorative",
    description: "alt=\"\": the heading next to it already says what is happening, so Mocki is skipped by screen readers.",
    render: () => (
      <div className="flex items-start gap-4">
        <Mascot level={1} size={56} decorative className="shrink-0" />
        <h2 className="text-base font-semibold text-cream-bright">Primeros pasos en Mockio</h2>
      </div>
    ),
    code: `<Mascot level={1} size={56} decorative className="shrink-0" />
<h2>Primeros pasos en Mockio</h2>`,
  },
  {
    id: "stages",
    title: "The six stages",
    kind: "variant",
    description: "Egg, hatchling, young parrot, headset on, on stage, crowned. Each is a step, not a gradient, so reaching the next one is an event.",
    render: () => (
      <ul className="grid grid-cols-3 gap-6 sm:grid-cols-6">
        {STAGES.map((level) => (
          <li key={level} className="flex flex-col items-center gap-2 text-center">
            <Mascot level={level} size={72} decorative />
            <span className="text-xs text-cream-dim">Forma {level} de 6</span>
          </li>
        ))}
      </ul>
    ),
    code: `<Mascot level={1} />  {/* egg */}
<Mascot level={2} />  {/* hatchling */}
<Mascot level={3} />  {/* young parrot */}
<Mascot level={4} />  {/* headset on */}
<Mascot level={5} />  {/* on stage */}
<Mascot level={6} />  {/* crowned */}`,
  },
  {
    id: "sizes",
    title: "Sizes in the product",
    kind: "variant",
    description: "48px on a pricing card, 56px beside a checklist title, 88px in an empty state, 120px on a level-up. Above 100px the 200px master starts to soften on a 2x screen.",
    render: () => (
      <div className="flex items-end gap-5">
        <Mascot level={2} size={48} />
        <Mascot level={1} size={56} />
        <Mascot level={1} size={88} />
        <Mascot level={4} size={120} />
      </div>
    ),
    code: `<Mascot level={2} size={48} />
<Mascot level={1} size={56} />
<Mascot level={1} size={88} />
<Mascot level={4} size={120} />`,
  },
  {
    id: "translated-alt",
    title: "Portuguese, at phone width",
    kind: "edge",
    width: 320,
    description: "The default alt is Spanish, so another locale passes its own. Beside long Portuguese copy at 320px, shrink-0 keeps Mocki square while the text wraps.",
    render: () => (
      <div lang="pt-BR" className="flex items-center gap-4 rounded-card bg-surface-raised p-5 shadow-card">
        <Mascot level={1} size={56} alt="Mocki, forma 1 de 6" className="shrink-0" />
        <p className="min-w-0 text-sm text-cream-dim">
          Termine uma entrevista e isto se preenche. Uma sessão dá uma base; o formato começa a significar algo por volta da terceira.
        </p>
      </div>
    ),
    code: `<Mascot level={1} size={56} alt="Mocki, forma 1 de 6" className="shrink-0" />`,
  },
  {
    id: "welcome-checklist",
    title: "In the welcome checklist",
    kind: "in-context",
    description: "The interview space's first-run card: Mocki at stage 1, decorative because the title says what this is.",
    render: () => (
      <section aria-labelledby="welcome-title" className="rounded-card bg-surface-card p-5 shadow-card sm:p-7">
        <div className="flex items-start gap-4">
          <Mascot level={1} size={56} decorative className="shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 id="welcome-title" className="text-base font-semibold text-cream-bright">
              Primeros pasos en Mockio
            </h2>
            <p className="mt-0.5 text-sm text-cream-dim">1 de 5 listos</p>
            <ol className="mt-4 flex flex-col gap-2 text-sm text-cream-bright">
              <li className="text-cream-faint line-through">Agrega tu nombre</li>
              <li>Termina tu primera entrevista</li>
              <li>Prueba el modo real, sin ayudas</li>
              <li>Comparte un informe</li>
              <li>Registra una postulación</li>
            </ol>
          </div>
        </div>
      </section>
    ),
    code: `<section aria-labelledby="welcome-title" className="rounded-card bg-surface-card p-5 shadow-card">
  <div className="flex items-start gap-4">
    <Mascot level={1} size={56} decorative className="shrink-0" />
    <div className="min-w-0 flex-1">
      <h2 id="welcome-title">Primeros pasos en Mockio</h2>
      <p>{done} de {total} listos</p>
    </div>
  </div>
</section>`,
  },
  {
    id: "level-up",
    title: "In the level-up card",
    kind: "in-context",
    description: "The form a new level earns, above the level and one way back. Level 7 earns stage 4, so the alt uses the form wording and the two numbers are not both called nivel. The product's eyebrow \"¡Subiste de nivel!\" is left out: it breaks the no-exclamation rule.",
    render: () => (
      <div className="mx-auto w-full max-w-sm rounded-card bg-surface-card p-8 text-center shadow-float">
        <div className="mx-auto grid h-32 w-32 place-items-center">
          <Mascot level={4} size={120} alt="Mocki, forma 4 de 6" />
        </div>
        <h2 className="mt-5 text-headline font-bold text-cream-bright">Nivel 7</h2>
        <p className="mt-2 text-base text-cream-dim">Cada entrevista cuenta. Sigue así.</p>
        <Action className="mt-6 w-full py-3">Continuar</Action>
      </div>
    ),
    code: `<Mascot level={4} size={120} alt="Mocki, forma 4 de 6" />
<h2>Nivel 7</h2>
<p>Cada entrevista cuenta. Sigue así.</p>
<Action className="w-full">Continuar</Action>`,
  },
  {
    id: "sign-in",
    title: "Above the name on sign-in",
    kind: "in-context",
    description: "Mocki peeking over the wordmark, which drops its own mark: the character and the logo never stand side by side.",
    render: () => (
      <div className="flex flex-col items-center gap-4">
        <Mascot level={3} size={72} decorative className="-mb-3" />
        <Wordmark mark={false} className="text-2xl font-semibold text-cream-bright" />
      </div>
    ),
    code: `<Mascot level={3} size={72} decorative className="-mb-3" />
<Wordmark mark={false} className="text-2xl font-semibold text-cream-bright" />`,
  },
  {
    id: "in-the-acta",
    title: "Mocki in the thesis space",
    kind: "misuse",
    description: "A crowned Mocki beside a simulated acta in Sustentación.",
    why: "Sustentación speaks as a calm person sitting beside the student, not a mascot. A cartoon celebrating next to an acta makes a rehearsal of a final exam feel like a game, and Mocki belongs to the interview product's gamified layer only.",
    render: () => (
      <div className="flex items-center gap-4 rounded-card bg-surface-card p-5 shadow-card">
        <Mascot level={6} size={64} />
        <div>
          <p className="text-xs text-cream-faint">Acta simulada</p>
          <p className="text-title font-semibold text-cream-bright">Aprobado por mayoría</p>
        </div>
      </div>
    ),
    code: `{/* Don't */}
<Mascot level={6} />
<p>Acta simulada</p>
<p>Aprobado por mayoría</p>`,
  },
]);
