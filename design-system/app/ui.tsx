import { useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";

/**
 * The site's shared pieces: the chrome every page has in common.
 *
 * Small on purpose. A documentation site is a reading surface, and every
 * piece of furniture here earns its place by being used on more than one
 * page.
 */

/** A titled block of a page. The title is an `h2`, so the document has one outline. */
export function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-12 first:mt-0">
      <h2 className="text-title font-semibold text-cream-bright">{title}</h2>
      {hint && <p className="mt-1 max-w-[46rem] text-pretty text-cream-dim">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** A smaller title inside a section. */
export function Subhead({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-sm font-semibold text-cream-bright">{children}</h3>;
}

/** Markdown, rendered. The text is the system's own, so it is trusted. */
export function Prose({ html }: { html: string }) {
  return <div className="doc" dangerouslySetInnerHTML={{ __html: html }} />;
}

/** A snippet of code, with a copy button. */
export function Code({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // A clipboard the browser refuses is not an error worth a message:
      // the code is on the screen and can be selected.
    }
  }

  return (
    <div className="group relative">
      {label && (
        <p className="mb-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-cream-faint">{label}</p>
      )}
      <pre className="overflow-x-auto rounded-[0.75rem] border border-line bg-[rgb(var(--cream)/0.05)] p-4 font-mono text-xs leading-relaxed text-cream">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy the code"}
        className="focus-ring absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-lg border border-line bg-surface-card/80 text-cream-faint opacity-0 transition-opacity duration-150 hover:text-cream-bright focus-visible:opacity-100 group-hover:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
      </button>
    </div>
  );
}

/** A table of facts. The header row is a list of column names. */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[0.75rem] border border-line">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {head.map((name) => (
              <th
                key={name}
                className="whitespace-nowrap border-b border-line bg-[rgb(var(--cream)/0.04)] px-3.5 py-2.5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-cream-dim"
              >
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** A cell that wraps code in the mono voice. */
export function Mono({ children }: { children: ReactNode }) {
  return <span className="font-mono text-xs text-cream-bright">{children}</span>;
}

/** A list of facts, one per line. */
export function Facts({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-cream-dim">
          <span aria-hidden className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-accent/70" />
          <span className="text-pretty">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/** A pair of columns: what to do, what not to do. */
export function DoAndDont({ do: dos, dont }: { do: string[]; dont: string[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-[0.75rem] border border-line bg-[rgb(var(--grow)/0.06)] p-4">
        <Subhead>Do</Subhead>
        <ul className="space-y-2 text-sm text-cream-dim">
          {dos.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span aria-hidden className="mt-[0.5rem] h-1 w-1 shrink-0 rounded-full bg-grow" />
              <span className="text-pretty">{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-[0.75rem] border border-line bg-[rgb(var(--step)/0.07)] p-4">
        <Subhead>Don&apos;t</Subhead>
        <ul className="space-y-2 text-sm text-cream-dim">
          {dont.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span aria-hidden className="mt-[0.5rem] h-1 w-1 shrink-0 rounded-full bg-step" />
              <span className="text-pretty">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
