import { Upload } from "lucide-react";
import { definePreviews } from "../../preview";
import { Action } from "./Action";

export const ActionPreviews = definePreviews([
  {
    id: "primary",
    title: "Primary",
    kind: "default",
    description: "The one primary action of a view: solid, with the forward arrow.",
    render: () => <Action withArrow>Sube tu tesis gratis</Action>,
    code: `<Action withArrow>Sube tu tesis gratis</Action>`,
  },
  {
    id: "tones",
    title: "Tones",
    kind: "variant",
    description: "From loudest to quietest. A view uses one solid at most.",
    render: () => (
      <div className="flex flex-wrap items-center gap-3">
        <Action>Ensayar</Action>
        <Action tone="neutral">Ver planes</Action>
        <Action tone="ghost">Ahora no</Action>
      </div>
    ),
    code: `<Action>Ensayar</Action>
<Action tone="neutral">Ver planes</Action>
<Action tone="ghost">Ahora no</Action>`,
  },
  {
    id: "glass",
    title: "Glass, over imagery",
    kind: "variant",
    theme: "dark",
    description: "For video or photography, where a solid fill would cover the picture.",
    render: () => (
      <div className="on-media rounded-card bg-gradient-to-br from-[#1b1b3a] to-black p-8">
        <Action tone="glass">Cómo funciona</Action>
      </div>
    ),
    code: `<Action tone="glass">Cómo funciona</Action>`,
  },
  {
    id: "with-icon",
    title: "With a leading icon",
    kind: "variant",
    description: "A 16px icon before the label, hidden from screen readers.",
    render: () => (
      <Action tone="neutral">
        <Upload className="h-4 w-4" aria-hidden />
        Elegir archivo
      </Action>
    ),
    code: `<Action tone="neutral">
  <Upload className="h-4 w-4" aria-hidden />
  Elegir archivo
</Action>`,
  },
  {
    id: "disabled",
    title: "Disabled, with the reason",
    kind: "state",
    state: "disabled",
    description: "Disabled solid goes grey, not pale violet. The reason sits next to it.",
    render: () => (
      <div className="flex flex-col items-start gap-2">
        <Action disabled>Eliminar definitivamente</Action>
        <p className="text-xs text-cream-dim">Escribe tu correo para confirmar.</p>
      </div>
    ),
    code: `<Action disabled>Eliminar definitivamente</Action>
<p className="text-xs text-cream-dim">Escribe tu correo para confirmar.</p>`,
  },
  {
    id: "full-width-phone",
    title: "Full width at phone size",
    kind: "edge",
    width: 360,
    description: "On a phone the primary spans the column so the thumb cannot miss it.",
    render: () => (
      <Action withArrow className="w-full">
        Terminar y ver informe
      </Action>
    ),
    code: `<Action withArrow className="w-full">Terminar y ver informe</Action>`,
  },
  {
    id: "two-primaries",
    title: "Two primaries side by side",
    kind: "misuse",
    description: "Both shout, so neither leads.",
    why: "The user has to read both labels to know which one matters. Keep one solid and demote the other to neutral or ghost.",
    render: () => (
      <div className="flex gap-3">
        <Action>Ensayar</Action>
        <Action>Ver planes</Action>
      </div>
    ),
    code: `{/* Don't */}
<Action>Ensayar</Action>
<Action>Ver planes</Action>`,
  },
]);
