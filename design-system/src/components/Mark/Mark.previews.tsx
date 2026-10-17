import { definePreviews } from "../../preview";
import { Wordmark } from "../Wordmark/Wordmark";
import { Mark } from "./Mark";

export const MarkPreviews = definePreviews([
  {
    id: "default",
    title: "Default",
    kind: "default",
    description: "32px, decorative. Most marks sit next to the written name or inside a named link, so they say nothing themselves.",
    render: () => <Mark />,
    code: `<Mark />`,
  },
  {
    id: "named",
    title: "Named, standing alone",
    kind: "state",
    state: "named",
    description: "With label the SVG is role=\"img\" and announced as \"Mockio\". Use it only when nothing beside the mark says the name.",
    render: () => <Mark size={48} label="Mockio" />,
    code: `<Mark size={48} label="Mockio" />`,
  },
  {
    id: "sizes",
    title: "Sizes",
    kind: "variant",
    description: "16px is the favicon floor and 30px is the app's top bar; larger sizes are for an icon tile or a print header. The drawing is the same at every size.",
    render: () => (
      <div className="flex items-end gap-4">
        <Mark size={16} />
        <Mark size={24} />
        <Mark size={30} />
        <Mark size={48} />
        <Mark size={64} />
      </div>
    ),
    code: `<Mark size={16} />
<Mark size={24} />
<Mark size={30} />
<Mark size={48} />
<Mark size={64} />`,
  },
  {
    id: "both-themes",
    title: "The same on both grounds",
    kind: "variant",
    description: "The colours are the brand's, not the theme's: the tile is the same indigo on black and on white.",
    render: () => (
      <div className="flex gap-3">
        <div className="grid h-20 w-20 place-items-center rounded-card bg-black">
          <Mark size={40} />
        </div>
        <div className="grid h-20 w-20 place-items-center rounded-card bg-white shadow-card">
          <Mark size={40} />
        </div>
      </div>
    ),
    code: `<Mark size={40} /> {/* on black and on white: no theme prop, nothing changes */}`,
  },
  {
    id: "phone-top-bar",
    title: "Top bar at phone width",
    kind: "edge",
    width: 320,
    description: "Below lg the app hides the written name and the mark carries the brand alone. The link is named, so the mark stays decorative.",
    render: () => (
      <header className="flex h-16 items-center gap-3 border-b border-line px-3">
        <a href="#inicio" aria-label="Mockio" className="focus-ring flex shrink-0 items-center rounded-[0.6rem]">
          <Mark size={30} className="rounded-[0.55rem] shadow-card" />
        </a>
        <nav aria-label="Espacios" className="flex min-w-0 flex-1 justify-center gap-1">
          <a href="#sustentacion" aria-current="page" className="focus-ring rounded-lg px-2.5 py-2 text-sm font-semibold text-cream-bright">
            Sustentación
          </a>
          <a href="#profesional" className="focus-ring rounded-lg px-2.5 py-2 text-sm font-semibold text-cream-dim">
            Profesional
          </a>
        </nav>
      </header>
    ),
    code: `<a href="/app" aria-label="Mockio" className="focus-ring flex shrink-0 items-center rounded-[0.6rem]">
  <Mark size={30} className="rounded-[0.55rem] shadow-card" />
</a>`,
  },
  {
    id: "app-shell",
    title: "In the app shell",
    kind: "in-context",
    description: "The product's top bar: the mark at 30px with the card shadow, the name beside it on wide screens, one named link around both.",
    render: () => (
      <header className="flex h-16 items-center gap-8 rounded-card bg-surface-raised px-6 shadow-card">
        <a href="#inicio" aria-label="Mockio" className="focus-ring flex shrink-0 items-center gap-2.5 rounded-[0.6rem]">
          <Mark size={30} className="rounded-[0.55rem] shadow-card" />
          <Wordmark mark={false} className="text-lg font-semibold text-cream-bright" />
        </a>
        <nav aria-label="Espacios" className="flex gap-2">
          <a href="#sustentacion" aria-current="page" className="focus-ring rounded-lg px-3 py-2 text-base font-semibold text-cream-bright">
            Sustentación
          </a>
          <a href="#profesional" className="focus-ring rounded-lg px-3 py-2 text-base font-semibold text-cream-dim">
            Profesional
          </a>
        </nav>
      </header>
    ),
    code: `<Link to="/app" aria-label="Mockio" className="focus-ring flex shrink-0 items-center gap-2.5 rounded-[0.6rem]">
  <Mark size={30} className="rounded-[0.55rem] shadow-card" />
  <Wordmark mark={false} className="hidden text-lg font-semibold text-cream-bright lg:inline-flex" />
</Link>`,
  },
  {
    id: "named-twice",
    title: "Named twice",
    kind: "misuse",
    description: "A labelled mark right next to the written name.",
    why: "A screen reader says \"Mockio, imagen, mockio\": the same word twice for one logo. When the name is written beside the mark, leave label off and name the link once.",
    render: () => (
      <span className="inline-flex items-center gap-2.5">
        <Mark size={30} label="Mockio" />
        <Wordmark mark={false} className="text-lg font-semibold text-cream-bright" />
      </span>
    ),
    code: `{/* Don't */}
<Mark size={30} label="Mockio" />
<Wordmark mark={false} />`,
  },
  {
    id: "recoloured",
    title: "Recoloured to match the page",
    kind: "misuse",
    description: "A filter turning the mark grey so it sits quietly on a monochrome page.",
    why: "The colours are the brand. A grey mark is a different logo, and it is no longer the icon people see in their browser tab. If the mark is too loud for the place, it is the wrong place for a mark.",
    render: () => <Mark size={48} className="grayscale" />,
    code: `{/* Don't */}
<Mark size={48} className="grayscale" />`,
  },
]);
