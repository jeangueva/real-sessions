import { Link, useNavigate } from "react-router-dom";
import {
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
import { Action, FadeRise } from "@/design-system";
import { IconTile, Widget } from "@/components/marketing";
import { usePracticeCopy } from "@/lib/practice-copy";
import { thesisPath, type Space } from "@/lib/spaces";
import { PageBody, PageHeader } from "./AppShell";

/** Workspace entry points designed with the trail-dashboard Widget & Inset architecture. */
export function WorkspaceHome({ space }: { space: Space }) {
  const c = usePracticeCopy();
  const navigate = useNavigate();
  const education = space === "defense";

  const cards = education
    ? [
        {
          to: thesisPath("ensayar"),
          label: "01",
          icon: Mic,
          title: c.thesis,
          body: c.thesisBody,
          subLinks: [
            { to: thesisPath("diagnostico"), label: c.diagnosis, icon: FileSearch },
            { to: thesisPath("repaso"), label: c.review, icon: BookOpenCheck },
            { to: thesisPath("diapositivas"), label: c.slides, icon: Presentation },
          ],
        },
        {
          to: "/app/training/education",
          label: "02",
          icon: GraduationCap,
          title: c.academic,
          body: c.academicBody,
          subLinks: [],
        },
      ]
    : [
        {
          to: "/app/training/professional",
          label: "01",
          icon: MessagesSquare,
          title: c.conversations,
          body: c.conversationsBody,
          subLinks: [],
        },
        {
          to: "/app/intuition",
          label: "02",
          icon: Compass,
          title: c.intuition,
          body: c.intuitionBody,
          subLinks: [],
        },
        {
          to: "/app/practice",
          label: "03",
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
        meta={education ? c.educationBody : c.professionalBody}
      />

      <PageBody className="space-y-6 pt-2">
        <div className={`grid gap-5 ${education ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
          {cards.map((card, i) => {
            const CardIcon = card.icon;
            return (
              <FadeRise key={card.to} delay={i * 0.05}>
                <Widget
                  className="flex h-full flex-col p-6 sm:p-7"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <IconTile>
                        <CardIcon className="h-4 w-4" aria-hidden />
                      </IconTile>
                      <h2 className="text-xl font-medium tracking-[-0.025em] text-cream-bright">
                        {card.title}
                      </h2>
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-cream-dim">{card.body}</p>

                    {card.subLinks.length > 0 && (
                      <div className="mt-4">
                        <div className="flex flex-wrap gap-2" aria-label={c.tools}>
                          {card.subLinks.map((sub) => {
                            const SubIcon = sub.icon;
                            return (
                              <Link
                                key={sub.to}
                                to={sub.to}
                                className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-card px-3 py-1.5 text-xs font-medium text-cream-bright transition-colors hover:border-accent-border hover:text-accent-text"
                              >
                                <SubIcon className="h-3.5 w-3.5 text-accent-text" aria-hidden />
                                {sub.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-auto pt-6">
                    <Action
                      type="button"
                      withArrow
                      onClick={() => navigate(card.to)}
                      className="w-full justify-center"
                    >
                      {c.start}
                    </Action>
                  </div>
                </Widget>
              </FadeRise>
            );
          })}
        </div>
      </PageBody>
    </main>
  );
}
