import { useState } from "react";
import { definePreviews } from "../../preview";
import { Panel } from "../Panel";
import { Segmented } from "./Segmented";

// Specimens hold their own state so every preview can be clicked and driven
// from the keyboard, as it is in the product.
function Live<T extends string>({
  options,
  initial,
  label,
  className,
}: {
  options: readonly { value: T; label: string }[];
  initial: T;
  label: string;
  className?: string;
}) {
  const [value, setValue] = useState<T>(initial);
  return <Segmented label={label} value={value} onChange={setValue} options={options} className={className} />;
}

const THEME = [
  { value: "system", label: "Sistema" },
  { value: "dark", label: "Oscuro" },
  { value: "light", label: "Claro" },
] as const;

const SETTINGS = [
  { value: "account", label: "Cuenta" },
  { value: "defense", label: "Sustentación" },
  { value: "advisor", label: "Asesor e institución" },
  { value: "appearance", label: "Apariencia" },
  { value: "plan", label: "Plan" },
] as const;

function ThemeSetting() {
  const [choice, setChoice] = useState<"system" | "dark" | "light">("system");
  return (
    <Panel className="p-6 sm:p-8">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-cream-dim">
          Tema
        </span>
        <Segmented label="Tema" value={choice} onChange={setChoice} options={THEME} className="self-start" />
        <p className="text-xs text-cream-faint">
          {choice === "system" ? "Sigue a tu dispositivo, que ahora está en Oscuro." : "Fijo, haga lo que haga tu dispositivo."}
        </p>
      </div>
    </Panel>
  );
}

function StudySwitcher() {
  const [view, setView] = useState<"sheet" | "cards">("sheet");
  return (
    <div className="flex flex-col gap-3">
      <Segmented
        label="Repaso"
        value={view}
        onChange={setView}
        options={[
          { value: "sheet", label: "Hoja de defensa" },
          { value: "cards", label: "Tarjetas" },
        ]}
        className="self-start"
      />
      <p className="text-sm text-cream-dim">Una hoja de defensa de una página y 15 tarjetas de repaso, hechas de tu tesis.</p>
    </div>
  );
}

export const SegmentedPreviews = definePreviews([
  {
    id: "theme",
    title: "Theme",
    kind: "default",
    description: "Three options, the most common size: the appearance setting. The thumb slides to the choice; the label brightens.",
    render: () => <Live label="Tema" initial="system" options={THEME} />,
    code: `<Segmented
  label="Tema"
  value={choice}
  onChange={setChoice}
  options={[
    { value: "system", label: "Sistema" },
    { value: "dark", label: "Oscuro" },
    { value: "light", label: "Claro" },
  ]}
/>`,
  },
  {
    id: "selected",
    title: "Another option selected",
    kind: "state",
    state: "selected",
    description: "The thumb sits under the chosen option from the first paint — no slide on load — and only that option is in the tab order.",
    render: () => <Live label="Tema" initial="light" options={THEME} />,
    code: `<Segmented label="Tema" value="light" onChange={setChoice} options={THEME} />`,
  },
  {
    id: "two-options",
    title: "Two options",
    kind: "variant",
    description: "The interview history filter: two options, equal widths.",
    render: () => (
      <Live
        label="Todas tus entrevistas"
        initial="all"
        options={[
          { value: "all", label: "Todas" },
          { value: "scored", label: "Con informe" },
        ]}
      />
    ),
    code: `<Segmented
  label="Todas tus entrevistas"
  value={filter}
  onChange={setFilter}
  options={[
    { value: "all", label: "Todas" },
    { value: "scored", label: "Con informe" },
  ]}
/>`,
  },
  {
    id: "three-options",
    title: "Three options, numbers",
    kind: "variant",
    description: "The exposition length for the slides. Numbers arrive formatted; the value is a string.",
    render: () => (
      <Live
        label="Tiempo de exposición"
        initial="20"
        options={[
          { value: "15", label: "15 min" },
          { value: "20", label: "20 min" },
          { value: "30", label: "30 min" },
        ]}
      />
    ),
    code: `<Segmented
  label="Tiempo de exposición"
  value={String(minutes)}
  onChange={(next) => setMinutes(Number(next))}
  options={[15, 20, 30].map((entry) => ({ value: String(entry), label: \`\${entry} min\` }))}
/>`,
  },
  {
    id: "five-options",
    title: "Five options, the ceiling",
    kind: "edge",
    description:
      "Five is the most a Segmented holds. The labels are the settings screen's five sections, the widest real set in the product, used here only as a length specimen: on that screen they are a tablist, because each one opens its own panel.",
    render: () => <Live label="Ajustes" initial="account" options={SETTINGS} />,
    code: `<Segmented label="Ajustes" value={section} onChange={setSection} options={SECTIONS} />`,
  },
  {
    id: "long-labels-phone",
    title: "Long labels at phone width",
    kind: "edge",
    width: 320,
    description: "At 320px the five slots stay equal and the longest labels wrap inside them, balanced; every slot grows together and nothing overflows.",
    render: () => <Live label="Ajustes" initial="advisor" options={SETTINGS} className="w-full" />,
    code: `<Segmented label="Ajustes" value={section} onChange={setSection} options={SECTIONS} className="w-full" />`,
  },
  {
    id: "keyboard",
    title: "Keyboard",
    kind: "variant",
    description:
      "Tab lands on the chosen option only. ArrowRight or ArrowDown chooses the next one, ArrowLeft or ArrowUp the previous one, both wrapping; Home and End jump to the ends. Each arrow both moves focus and chooses.",
    render: () => (
      <Live
        label="Tiempo de exposición"
        initial="15"
        options={[
          { value: "15", label: "15 min" },
          { value: "20", label: "20 min" },
          { value: "30", label: "30 min" },
        ]}
      />
    ),
    code: `// No props needed: roving tabindex and the arrow keys are built in.
<Segmented label="Tiempo de exposición" value={minutes} onChange={setMinutes} options={SLOTS} />`,
  },
  {
    id: "right-to-left",
    title: "Right to left",
    kind: "edge",
    description: "In a dir=\"rtl\" document the first option sits on the right, the thumb slides leftward to later options, and ArrowLeft moves forward.",
    render: () => (
      <div dir="rtl">
        <Live label="Tema" initial="system" options={THEME} />
      </div>
    ),
    code: `<div dir="rtl">
  <Segmented label="Tema" value={choice} onChange={setChoice} options={THEME} />
</div>`,
  },
  {
    id: "theme-setting",
    title: "The appearance setting",
    kind: "in-context",
    description: "The theme field in Ajustes: the visible field name, the Segmented aligned to the start, and a hint that follows the choice. It applies at once — there is no Save.",
    render: () => <ThemeSetting />,
    code: `<div className="flex flex-col gap-2">
  <span className="text-xs font-semibold text-cream-dim">Tema</span>
  <Segmented label="Tema" value={choice} onChange={setChoice} options={THEME} className="self-start" />
  <p className="text-xs text-cream-faint">
    {choice === "system" ? "Sigue a tu dispositivo, que ahora está en Oscuro." : "Fijo, haga lo que haga tu dispositivo."}
  </p>
</div>`,
  },
  {
    id: "study-switcher",
    title: "Two views of the study material",
    kind: "in-context",
    description: "Switching between the defence sheet and the cards in place: the same content, two views, so a Segmented rather than tabs.",
    render: () => <StudySwitcher />,
    code: `<Segmented
  label="Repaso"
  value={view}
  onChange={setView}
  options={[
    { value: "sheet", label: "Hoja de defensa" },
    { value: "cards", label: "Tarjetas" },
  ]}
  className="self-start"
/>`,
  },
  {
    id: "actions-as-options",
    title: "Actions dressed as options",
    kind: "misuse",
    description: "Copy, download and send in one pill, as if they were values to choose between.",
    why: "A Segmented holds which value is chosen; it does not run commands. Here one action always looks selected, pressing the selected one does nothing, and a screen reader announces three radio buttons. Each action is its own Action, one of them solid at most.",
    render: () => (
      <Live
        label="Tarjeta para WhatsApp"
        initial="copy"
        options={[
          { value: "copy", label: "Copiar enlace" },
          { value: "download", label: "Descargar imagen" },
          { value: "send", label: "Enviar por WhatsApp" },
        ]}
      />
    ),
    code: `{/* Don't */}
<Segmented
  label="Tarjeta para WhatsApp"
  value={last}
  onChange={run}
  options={[
    { value: "copy", label: "Copiar enlace" },
    { value: "download", label: "Descargar imagen" },
    { value: "send", label: "Enviar por WhatsApp" },
  ]}
/>`,
  },
]);
