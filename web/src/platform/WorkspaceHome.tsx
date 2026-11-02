import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { usePracticeCopy } from "@/lib/practice-copy";
import type { Space } from "@/lib/spaces";

/** Workspace entry points; training screens are owned by their own modules. */
export function WorkspaceHome({ space }: { space: Space }) {
  const c = usePracticeCopy();
  const education = space === "defense";
  const items = education ? [
    { to: "/app", title: c.thesis, body: c.thesisBody },
    { to: "/app/training/education", title: c.academic, body: c.academicBody },
  ] : [
    { to: "/app/practice", title: c.interviews, body: c.interviewsBody },
    { to: "/app/training/professional", title: c.conversations, body: c.conversationsBody },
    { to: "/app/intuition", title: c.intuition, body: c.intuitionBody },
  ];
  return <main className="mx-auto w-full max-w-4xl px-4 py-6 text-cream-bright sm:p-8">
    <p className="text-sm font-semibold text-accent-text">{education ? c.education : c.professional}</p>
    <h1 className="mt-2 text-3xl font-semibold tracking-tight">{c.welcome}</h1>
    <p className="mt-3 max-w-2xl text-cream-dim">{education ? c.educationBody : c.professionalBody}</p>
    <div className="mt-6 grid gap-3">
      {items.map(({ to, title, body }) => <Link key={to} to={to} className="focus-ring rounded-card bg-surface-card p-5 shadow-card hover:bg-surface-lift">
        <h2 className="flex items-center justify-between gap-3 text-lg font-semibold">{title}<ArrowRight className="h-5 w-5 shrink-0 text-accent-text" aria-hidden /></h2>
        <p className="mt-2 text-sm text-cream-dim">{body}</p>
      </Link>)}
    </div>
    {!education && <nav aria-label={c.tools} className="mt-6 flex flex-wrap gap-3">
      {([["/app/progress", c.progress], ["/app/applications", c.applications], ["/app/profile", c.profile]] as const).map(([to, label]) => <Link key={to} to={to} className="focus-ring inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-accent-text underline underline-offset-4">{label}</Link>)}
    </nav>}
  </main>;
}
