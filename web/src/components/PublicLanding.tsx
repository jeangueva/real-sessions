import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, GraduationCap, HeartHandshake } from "lucide-react";
import { LandingNav } from "./LandingNav";
import { SiteFooter } from "./SiteFooter";
import { usePracticeCopy } from "@/lib/practice-copy";
import { Support } from "@/platform/Support";

const action = "focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-ink";

/** Shared public entry point. Brand tokens also supply the dark theme. */
export function PublicLanding() {
  const c = usePracticeCopy();
  useEffect(() => {
    document.title = `Mockio | ${c.title}`;
    const description = `${c.intro} ${c.free}. ${c.supportBody}`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.querySelector('meta[property="og:title"]')?.setAttribute("content", document.title);
    document.querySelector('meta[property="og:description"]')?.setAttribute("content", description);
  }, [c]);
  return (
    <div id="top" className="bg-surface-base text-cream-bright">
      <a href="#content" className="focus-ring sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-16 focus:z-50 focus:rounded-lg focus:bg-surface-card focus:p-3">{c.skip}</a>
      <LandingNav links={[{ label: c.education, href: "#education" }, { label: c.professional, href: "#professional" }, { label: c.free, href: "#support" }]} cta={{ label: c.start, to: "/app/education" }} />
      <main id="content" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
        <section className="grid items-center gap-8 pb-10 pt-24 md:grid-cols-[1.2fr_1fr] md:gap-12 md:pb-16">
          <div>
            <p className="mb-4 text-sm font-semibold text-accent-text">{c.free}</p>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight lg:text-5xl">{c.title}</h1>
            <p className="mt-5 max-w-lg text-base text-cream-dim">{c.intro}</p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <Link to="/app/education" className={action}>{c.start}<ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <Link to="/app/professional" className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface-card px-5 py-2 text-sm font-semibold text-cream-bright hover:bg-surface-lift">{c.professional}<ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <a href="#support" className="focus-ring inline-flex min-h-11 items-center rounded-lg text-sm font-medium text-cream-dim underline underline-offset-4">{c.explore}</a>
            </div>
          </div>
          <img src="/hero-2.jpg" alt="" width="960" height="720" fetchPriority="high" className="aspect-[4/3] w-full rounded-card object-cover" />
        </section>

        <section id="education" className="scroll-mt-20 border-t border-line py-10 md:py-14">
          <GraduationCap className="mb-4 h-7 w-7 text-accent-text" aria-hidden />
          <h2 className="text-3xl font-semibold tracking-tight">{c.education}</h2>
          <p className="mt-3 max-w-2xl text-cream-dim">{c.educationBody}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ScopeLink to="/app" title={c.thesis} body={c.thesisBody} />
            <ScopeLink to="/app/training/education" title={c.academic} body={c.academicBody} />
          </div>
        </section>

        <section id="professional" className="scroll-mt-20 border-t border-line py-10 md:py-14">
          <Briefcase className="mb-4 h-7 w-7 text-accent-text" aria-hidden />
          <h2 className="text-3xl font-semibold tracking-tight">{c.professional}</h2>
          <p className="mt-3 max-w-2xl text-cream-dim">{c.professionalBody}</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <ScopeLink to="/app/training/professional" title={c.techLab} body={c.techLabBody} />
            <ScopeLink to="/app/training/professional" title={c.culturalLab} body={c.culturalLabBody} />
            <ScopeLink to="/app/intuition" title={c.intuition} body={c.intuitionBody} />
            <ScopeLink to="/app/practice" title={c.interviews} body={c.interviewsBody} />
          </div>
        </section>

        <section id="how-it-works" className="border-t border-line py-10">
          <h2 className="text-2xl font-semibold">{c.how}</h2>
          <p className="mt-3 max-w-2xl text-cream-dim">{c.howBody}</p>
        </section>

        <section id="support" className="mb-10 scroll-mt-20 border-t border-line py-10 md:py-14">
          <HeartHandshake className="mb-4 h-7 w-7 text-accent-text" aria-hidden />
          <h2 className="text-3xl font-semibold tracking-tight">{c.support}</h2>
          <p className="mt-3 max-w-3xl text-cream-dim">{c.supportBody}</p>
          <Support />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ScopeLink({ to, title, body }: { to: string; title: string; body: string }) {
  return <Link to={to} className="focus-ring group flex h-full flex-col rounded-card bg-surface-card p-5 shadow-card transition-colors hover:bg-surface-lift">
    <h3 className="flex items-center justify-between gap-4 text-lg font-semibold">{title}<ArrowRight className="h-5 w-5 shrink-0 text-accent-text" aria-hidden /></h3>
    <p className="mt-2 text-sm text-cream-dim">{body}</p>
  </Link>;
}
