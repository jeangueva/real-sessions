import { Link } from "react-router-dom";
import { Lede } from "@ds/components/Lede";
import { components, foundations, guides } from "../content";
import { Section } from "../ui";

/**
 * The front page: what the system is, and the way into everything in it.
 */

const LEVELS = ["atom", "molecule", "organism", "template", "utility"] as const;

export default function Home() {
  const groups = LEVELS.map((level) => ({
    level,
    entries: components.filter((entry) => entry.contract.level === level),
  })).filter((group) => group.entries.length > 0);

  return (
    <div>
      <header className="max-w-[46rem]">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-cream-faint">
          {components.length} components · {foundations.length} foundations · {guides.length} guides
        </p>
        <h1 className="mt-3 text-balance text-[clamp(2.25rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.04em] text-cream-bright">
          The Mockio design system
        </h1>
        <Lede className="mt-4">
          Every component of the product comes with a contract: the props it accepts, the states it can be in, what it
          does for a keyboard and for a screen reader, and when not to use it. This site is that contract, written down
          where a person can read it.
        </Lede>
      </header>

      <Section
        title="Foundations"
        hint="The four things everything else is built on. They are decisions, not preferences."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {foundations.map((doc) => (
            <Link
              key={doc.slug}
              to={`/foundations/${doc.slug}`}
              className="focus-ring group rounded-[0.75rem] border border-line bg-[rgb(var(--surface-card)/0.55)] p-4 transition-colors duration-150 hover:border-line-strong"
            >
              <p className="text-sm font-semibold text-cream-bright">{doc.title}</p>
              <p className="mt-1.5 text-pretty text-sm text-cream-dim">{doc.summary}</p>
            </Link>
          ))}
        </div>
      </Section>

      <Section
        title="Components"
        hint="What ships. Each page carries the contract, the previews, the guidance and the code."
      >
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.level}>
              <p className="mb-3 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-cream-faint">
                {group.level} · {group.entries.length}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.entries.map((entry) => (
                  <Link
                    key={entry.name}
                    to={`/component/${entry.name}`}
                    className="focus-ring group rounded-[0.75rem] border border-line bg-[rgb(var(--surface-card)/0.55)] p-4 transition-colors duration-150 hover:border-line-strong"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold text-cream-bright">{entry.name}</p>
                      <p className="font-mono text-[0.625rem] uppercase tracking-[0.08em] text-cream-faint">
                        {entry.contract.version}
                      </p>
                    </div>
                    <p className="mt-1.5 text-pretty text-sm text-cream-dim">{entry.contract.summary}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Guides" hint="How the system is built, used and shipped.">
        <div className="grid gap-3 sm:grid-cols-2">
          {guides.map((doc) => (
            <Link
              key={doc.slug}
              to={`/guides/${doc.slug}`}
              className="focus-ring group rounded-[0.75rem] border border-line bg-[rgb(var(--surface-card)/0.55)] p-4 transition-colors duration-150 hover:border-line-strong"
            >
              <p className="text-sm font-semibold text-cream-bright">{doc.title}</p>
              <p className="mt-1.5 text-pretty text-sm text-cream-dim">{doc.summary}</p>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}
