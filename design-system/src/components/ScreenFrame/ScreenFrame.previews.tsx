import { definePreviews } from "../../preview";
import { ScreenFrame } from "./ScreenFrame";
import { MonoLabel } from "../MonoLabel/MonoLabel";

export const ScreenFramePreviews = definePreviews([
  {
    id: "a-piece-of-the-product",
    title: "A piece of the product",
    kind: "default",
    description:
      "A window with a hairline and the interface inside it: the real thing, drawn as the product draws it.",
    render: () => (
      <ScreenFrame className="w-full max-w-md p-5">
        <div className="flex flex-col gap-3">
          <MonoLabel>::ENTREVISTA</MonoLabel>
          <p className="text-sm text-cream-bright">¿Qué te hizo elegir este tema?</p>
          <p className="text-sm text-cream-dim">Porque ya tenía los datos del proyecto.</p>
        </div>
      </ScreenFrame>
    ),
    code: `<ScreenFrame className="p-5">
  <Transcript />
</ScreenFrame>`,
  },
  {
    id: "the-call",
    title: "The call",
    kind: "state",
    state: "dark",
    description:
      "The call is always dark, as a video call is, whatever the theme: the ground is the media ground, so the ink inside stays light.",
    render: () => (
      <ScreenFrame dark className="w-full max-w-md p-5">
        <div className="flex flex-col gap-3">
          <MonoLabel>::EN VIVO</MonoLabel>
          <p className="text-sm text-cream-bright">Mocki está preguntando</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-lift">
            <div className="h-full w-2/3 rounded-full bg-accent" />
          </div>
        </div>
      </ScreenFrame>
    ),
    code: `<ScreenFrame dark className="p-5">
  <LiveCall />
</ScreenFrame>`,
  },
  {
    id: "something-to-press-inside",
    title: "Something to press inside",
    kind: "misuse",
    description: "A button inside the frame.",
    why: "The frame is hidden from assistive technology, so anything inside it is hidden too: a button a keyboard can reach but a screen reader cannot find is a control nobody can use. The frame is for showing, not for holding.",
    render: () => (
      <ScreenFrame className="w-full max-w-md p-5">
        <button className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
          Ensayar mi sustentación
        </button>
      </ScreenFrame>
    ),
    code: `{/* Don't: nothing inside the frame can be reached */}
<ScreenFrame>
  <Action>Ensayar mi sustentación</Action>
</ScreenFrame>`,
  },
]);
