import { definePreviews } from "../../preview";
import { InsetFrame } from "./InsetFrame";

export const InsetFramePreviews = definePreviews([
  {
    id: "a-page-inside",
    title: "A page inside the frame",
    kind: "default",
    description:
      "The public site: the content fills the window with a small margin around it, and the corners are the paper's own.",
    render: () => (
      <InsetFrame>
        <div className="flex h-full flex-col justify-center gap-4 bg-surface-deep p-8">
          <p className="font-mono text-xs uppercase tracking-[0.06em] text-cream-dim">::EDUCACIÓN</p>
          <h2 className="text-title text-cream-bright">Ensaya con el panel de 3 jurados</h2>
          <p className="max-w-[52rem] text-sm text-cream-dim">
            Un ensayo con el panel completo, en el formato que usa tu universidad.
          </p>
        </div>
      </InsetFrame>
    ),
    code: `<InsetFrame>
  <PublicLanding />
</InsetFrame>`,
  },
  {
    id: "nested",
    title: "A frame inside a frame",
    kind: "misuse",
    description: "The window, inside another window. The second frame has nothing to say: the first one already said it.",
    why: "The frame is the whole of the polish on the public site: one rounded window on a table. A second one turns the page into a picture of a picture, and the corner radius starts to fight itself — two radii at two distances from the edge is a shape nobody drew.",
    render: () => (
      <InsetFrame>
        <InsetFrame>
          <div className="flex h-full items-center justify-center bg-surface-deep text-sm text-cream-dim">
            El contenido
          </div>
        </InsetFrame>
      </InsetFrame>
    ),
    code: `{/* Don't */}
<InsetFrame>
  <InsetFrame>…</InsetFrame>
</InsetFrame>`,
  },
]);
