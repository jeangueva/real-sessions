import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  Briefcase,
  Compass,
  FileSearch,
  FileUser,
  GraduationCap,
  MessagesSquare,
  Mic,
  Play,
  Presentation,
  Route,
} from "lucide-react";
import { usePracticeCopy } from "@/lib/practice-copy";
import { useLocale } from "@/hooks/useLocale";
import { thesisPath, type Space } from "@/lib/spaces";
import { PageBody, PageHeader } from "./AppShell";

const homeCopy = {
  es: { open: "Abrir", thesis: "Practica con un jurado que conoce tu tesis.", academic: "Prepara exámenes orales, trabajos grupales y conversaciones con tu asesor.", conversations: "Conversaciones difíciles", conversationsBody: "Practica cómo negociar, dar feedback y poner límites en el trabajo o en familia.", intuition: "Criterio de producto y diseño", intuitionBody: "Toma una decisión y compárala con el desenlace de un caso real." },
  en: { open: "Open", thesis: "Practise with a jury that knows your thesis.", academic: "Prepare for oral exams, group projects and conversations with your advisor.", conversations: "Difficult conversations", conversationsBody: "Practise negotiating, giving feedback and setting boundaries at work or with family.", intuition: "Product and design judgment", intuitionBody: "Make a decision, then compare it with a real case's outcome." },
  pt: { open: "Abrir", thesis: "Pratique com uma banca que conhece seu trabalho.", academic: "Prepare provas orais, trabalhos em grupo e conversas com seu orientador.", conversations: "Conversas difíceis", conversationsBody: "Pratique negociar, dar feedback e estabelecer limites no trabalho ou na família.", intuition: "Critério de produto e design", intuitionBody: "Tome uma decisão e compare com o resultado de um caso real." },
  fr: { open: "Ouvrir", thesis: "Entraînez-vous avec un jury qui connaît votre mémoire.", academic: "Préparez vos examens oraux, travaux de groupe et échanges avec votre directeur.", conversations: "Conversations difficiles", conversationsBody: "Entraînez-vous à négocier, donner du feedback et poser vos limites au travail ou en famille.", intuition: "Jugement produit et design", intuitionBody: "Prenez une décision, puis comparez-la au résultat d’un cas réel." },
};

/** Keep activity selection separate from the detailed setup inside each activity. */
export function WorkspaceHome({ space }: { space: Space }) {
  const c = usePracticeCopy();
  const { locale } = useLocale();
  const t = homeCopy[locale as keyof typeof homeCopy] ?? homeCopy.en;
  const education = space === "defense";

  const cards = education
    ? [
        {
          to: thesisPath("ensayar"),
          icon: Mic,
          title: c.thesis,
          body: t.thesis,
          subLinks: [
            { to: thesisPath("diagnostico"), label: "Diagnóstico", icon: FileSearch },
            { to: thesisPath("repaso"), label: "Repaso espaciado", icon: BookOpenCheck },
            { to: thesisPath("diapositivas"), label: "Diapositivas", icon: Presentation },
          ],
        },
        {
          to: "/app/training/education",
          icon: GraduationCap,
          title: c.academic,
          body: t.academic,
          subLinks: [],
        },
      ]
    : [
        {
          to: "/app/training/professional",
          icon: MessagesSquare,
          title: t.conversations,
          body: t.conversationsBody,
          subLinks: [],
        },
        {
          to: "/app/intuition",
          icon: Compass,
          title: t.intuition,
          body: t.intuitionBody,
          subLinks: [],
        },
        {
          to: "/app/practice",
          icon: Play,
          title: c.interviews,
          body: c.interviewsBody,
          subLinks: [
            { to: "/app/progress", label: c.progress, icon: Route },
            { to: "/app/applications", label: c.applications, icon: Briefcase },
            { to: "/app/profile", label: c.profile, icon: FileUser },
          ],
        },
      ];

  return (
    <main>
      <PageHeader
        title={c.welcome}
        dense
      />

      <PageBody className="!pt-5">
        <div className="max-w-4xl divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface-card">
          {cards.map((card) => {
            const CardIcon = card.icon;
            return (
                <section key={card.to} className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
                  <div>
                    {/* The title is the link. A row that opens something is
                        named by the thing it opens, not by a button that
                        repeats it three times down the page. */}
                    <Link
                      to={card.to}
                      className="focus-ring group inline-flex items-center gap-3 rounded-md"
                    >
                      <CardIcon className="h-5 w-5 shrink-0 text-accent-text" aria-hidden />
                      <h2 className="text-base font-medium text-cream-bright transition-colors group-hover:text-accent-text sm:text-lg">
                        {card.title}
                      </h2>
                    </Link>

                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-cream-dim">{card.body}</p>

                    {card.subLinks.length > 0 && (
                      <nav aria-label={c.tools} className="mt-2 flex flex-wrap gap-x-4">
                          {card.subLinks.map((sub) => {
                            const SubIcon = sub.icon;
                            return (
                              <Link
                                key={sub.to}
                                to={sub.to}
                                className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm text-cream-dim transition-colors hover:text-accent-text"
                              >
                                <SubIcon className="h-3.5 w-3.5 text-accent-text" aria-hidden />
                                {sub.label}
                              </Link>
                            );
                          })}
                      </nav>
                    )}
                  </div>

                  {/* Quiet, not filled. Three solid mustard pills down a list
                      read as three equal demands; the list is a set of
                      siblings and the accent belongs to the one the reader
                      chooses. Right-aligned on a phone so it cannot be
                      mistaken for one more link in the row's link list. */}
                  <Link
                    to={card.to}
                    className="focus-ring group inline-flex min-h-11 shrink-0 items-center gap-2 self-end rounded-full px-4 text-sm font-semibold text-cream-dim transition-colors duration-150 hover:bg-surface-lift hover:text-cream-bright sm:ml-auto sm:self-auto"
                  >
                    {t.open}
                    <ArrowRight
                      className="h-4 w-4 text-accent-text transition-transform duration-200 ease-press group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                      aria-hidden
                    />
                  </Link>
                </section>
            );
          })}
        </div>
      </PageBody>
    </main>
  );
}
