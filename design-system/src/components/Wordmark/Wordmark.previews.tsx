import { definePreviews } from "../../preview";
import { Mark } from "../Mark/Mark";
import { Wordmark } from "./Wordmark";

export const WordmarkPreviews = definePreviews([
  {
    id: "default",
    title: "Default",
    kind: "default",
    description: "The lockup at the landing nav's size. The mark follows the font-size; the name takes the ink from className.",
    render: () => <Wordmark className="text-xl font-semibold text-cream-bright" />,
    code: `<Wordmark className="text-xl font-semibold text-cream-bright" />`,
  },
  {
    id: "name-only",
    title: "Name only",
    kind: "variant",
    description: "mark={false}: for the app's top bar, where the Mark is already beside it, and for sign-in, where Mocki sits above it.",
    render: () => <Wordmark mark={false} className="text-2xl font-semibold text-cream-bright" />,
    code: `<Wordmark mark={false} className="text-2xl font-semibold text-cream-bright" />`,
  },
  {
    id: "sizes",
    title: "Sizes in the product",
    kind: "variant",
    description: "Footer (text-sm), nav (text-xl), sign-in and unsubscribe (text-2xl). One relation between mark and name at every size.",
    render: () => (
      <div className="flex flex-col items-start gap-4">
        <Wordmark className="text-sm font-semibold text-cream-bright" />
        <Wordmark className="text-xl font-semibold text-cream-bright" />
        <Wordmark className="text-2xl font-semibold text-cream-bright" />
      </div>
    ),
    code: `<Wordmark className="text-sm font-semibold text-cream-bright" />
<Wordmark className="text-xl font-semibold text-cream-bright" />
<Wordmark className="text-2xl font-semibold text-cream-bright" />`,
  },
  {
    id: "phone-nav",
    title: "Nav at phone width, Portuguese",
    kind: "edge",
    width: 320,
    description: "The name never wraps or shrinks; the labels around it are the ones that grow in Portuguese. At 320px the nav keeps the wordmark and one way in.",
    render: () => (
      <nav lang="pt-BR" aria-label="Principal" className="flex h-14 items-center justify-between gap-4 px-4">
        <a href="#top" aria-label="mockio" className="focus-ring rounded-md">
          <Wordmark className="text-xl font-semibold text-cream-bright" />
        </a>
        <a href="#entrar" className="focus-ring whitespace-nowrap rounded-full px-3 py-1.5 text-xs text-cream-dim">
          Entrar
        </a>
      </nav>
    ),
    code: `<a href="#top" aria-label="mockio" className="focus-ring rounded-md">
  <Wordmark className="text-xl font-semibold text-cream-bright" />
</a>`,
  },
  {
    id: "rtl-footer",
    title: "In a right-to-left page",
    kind: "edge",
    description: "The footer in Arabic. The row runs right to left, so the lockup sits at the right; inside it the mark still comes before the name.",
    render: () => (
      <footer lang="ar" dir="rtl" className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-6">
        <p className="flex items-center gap-3 text-xs text-cream-faint">
          <Wordmark className="text-sm font-semibold text-cream-bright" />
          <span>© 2026</span>
        </p>
        <span className="flex gap-5 text-xs text-cream-dim">
          <a href="#terms" className="focus-ring rounded py-1.5">الشروط</a>
          <a href="#privacy" className="focus-ring rounded py-1.5">الخصوصية</a>
        </span>
      </footer>
    ),
    code: `<div dir="rtl">
  <Wordmark className="text-sm font-semibold text-cream-bright" /> {/* mark stays left of the name */}
</div>`,
  },
  {
    id: "landing-nav",
    title: "In the thesis landing's nav",
    kind: "in-context",
    description: "The Sustentación landing: the wordmark is the home link, the section links in the middle, one way in at the end.",
    render: () => (
      <nav aria-label="Principal" className="flex h-14 items-center justify-between gap-4 rounded-card bg-surface-raised px-6 shadow-card">
        <a href="#top" aria-label="mockio" className="focus-ring rounded-md">
          <Wordmark className="text-xl font-semibold text-cream-bright" />
        </a>
        <ul className="hidden items-center gap-1 md:flex">
          {["El jurado", "Cómo funciona", "Grados", "Precios"].map((label) => (
            <li key={label}>
              <a href={`#${label}`} className="focus-ring whitespace-nowrap rounded-full px-3 py-1.5 text-xs text-cream-dim">
                {label}
              </a>
            </li>
          ))}
        </ul>
        <span className="flex items-center gap-1">
          <a href="#signin" className="focus-ring whitespace-nowrap rounded-full px-3 py-1.5 text-xs text-cream-dim">
            Iniciar sesión
          </a>
          <a href="#start" className="focus-ring rounded-full bg-cream-bright px-4 py-1.5 text-xs font-medium text-surface-base">
            Sube tu tesis gratis
          </a>
        </span>
      </nav>
    ),
    code: `<a href="#top" aria-label="mockio" className="focus-ring rounded-md">
  <Wordmark className="text-xl font-semibold text-cream-bright" />
</a>`,
  },
  {
    id: "site-footer",
    title: "In the site footer",
    kind: "in-context",
    description: "Small, beside the year, on the deep surface. The legal links are the interface language's, not the documents'.",
    render: () => (
      <footer className="flex flex-col gap-4 rounded-card border-t border-line bg-surface-deep px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-3 text-xs text-cream-faint">
          <Wordmark className="text-sm font-semibold text-cream-bright" />
          <span>© 2026</span>
        </p>
        <span className="flex gap-5">
          <a href="#terms" className="focus-ring inline-flex rounded py-1.5 text-xs text-cream-dim">Términos</a>
          <a href="#privacy" className="focus-ring inline-flex rounded py-1.5 text-xs text-cream-dim">Privacidad</a>
        </span>
      </footer>
    ),
    code: `<p className="flex items-center gap-3 text-xs text-cream-faint">
  <Wordmark className="text-sm font-semibold text-cream-bright" />
  <span>© {year}</span>
</p>`,
  },
  {
    id: "hand-built",
    title: "A lockup built by hand",
    kind: "misuse",
    description: "A Mark and the name typed next to it, in the heading font.",
    why: "The mark is a fixed 24px while the name follows the font, so the two drift apart at every size; the name is capitalised and set in the page's face; and a translation tool is free to rewrite it. That drift is why the lockup is one component.",
    render: () => (
      <span className="inline-flex items-center gap-1 text-3xl font-bold text-cream-bright">
        <Mark size={24} />
        Mockio
      </span>
    ),
    code: `{/* Don't */}
<span className="text-3xl font-bold">
  <Mark size={24} /> Mockio
</span>`,
  },
]);
