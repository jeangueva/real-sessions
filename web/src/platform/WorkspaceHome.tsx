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
  Sparkles,
} from "lucide-react";
import { Action, Badge, FadeRise } from "@/design-system";
import { Chip, IconTile, Inset, MonoLabel, Widget } from "@/components/marketing";
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
          tag: "TESIS · JURADO EN VIVO",
          icon: Mic,
          title: c.thesis,
          body: c.thesisBody,
          chips: ["UNMSM · PUCP · UNI · UNAM · USP", "Escala 0–20", "Acta del jurado"],
          subLinks: [
            { to: thesisPath("diagnostico"), label: "Diagnóstico", icon: FileSearch },
            { to: thesisPath("repaso"), label: "Repaso espaciado", icon: BookOpenCheck },
            { to: thesisPath("diapositivas"), label: "Diapositivas", icon: Presentation },
          ],
        },
        {
          to: "/app/training/education",
          label: "02",
          tag: "SIMULACIONES ACADÉCIAS",
          icon: GraduationCap,
          title: c.academic,
          body: c.academicBody,
          chips: ["Trabajos grupales", "Rúbricas y notas", "Alcance con asesor", "Examen oral"],
          subLinks: [],
        },
      ]
    : [
        {
          to: "/app/training/professional",
          label: "01",
          tag: "HARDTALK TECH & LATAM",
          icon: MessagesSquare,
          title: c.conversations,
          body: c.conversationsBody,
          chips: ["Decir no a un founder", "Alcance de ingeniería", "Feedback diseño senior", "Familia · Latam & NA"],
          subLinks: [],
        },
        {
          to: "/app/intuition",
          label: "02",
          tag: "INTUICIÓN · CASOS REALES",
          icon: Compass,
          title: c.intuition,
          body: c.intuitionBody,
          chips: ["Priorización", "Trade-offs", "Hipótesis", "Desenlace histórico"],
          subLinks: [],
        },
        {
          to: "/app/practice",
          label: "03",
          tag: "ENTREVISTAS DE TRABAJO",
          icon: Play,
          title: c.interviews,
          body: c.interviewsBody,
          chips: ["Voz en vivo", "Preguntas por rol", "Informe de respuesta"],
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
        actions={
          <Badge tone="live">
            <Sparkles className="h-3 w-3" aria-hidden />
            {education ? c.education : c.professional} · {c.free}
          </Badge>
        }
      />

      <PageBody className="space-y-6 pt-2">
        <div className={`grid gap-5 ${education ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
          {cards.map((card, i) => {
            const CardIcon = card.icon;
            return (
              <FadeRise key={card.to} delay={i * 0.05}>
                <Widget
                  label={`${card.label} · ${card.tag}`}
                  className="flex h-full flex-col justify-between p-6 sm:p-7"
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

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {card.chips.map((chip) => (
                        <Chip key={chip}>{chip}</Chip>
                      ))}
                    </div>

                    {card.subLinks.length > 0 && (
                      <Inset className="mt-4 p-3">
                        <MonoLabel>{c.tools}</MonoLabel>
                        <div className="mt-2 flex flex-wrap gap-2">
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
                      </Inset>
                    )}
                  </div>

                  <div className="mt-6 pt-2">
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
