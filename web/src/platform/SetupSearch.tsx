import { useEffect, useMemo, useRef, useState } from "react";
import { History, Search, X } from "lucide-react";
import type { Persona, SessionSummary, Sector } from "@/lib/api";

/**
 * One field that both configures an interview and finds an old one.
 *
 * The form below it is six controls across five lists; someone who already
 * knows they want "Backend Engineer at Stripe" should not have to walk them.
 * And the more useful half is the past sessions: repeating a configuration
 * exactly — same company, same role, same person across the table — is the
 * only way two scores are comparable. A rerun against a different interviewer
 * measures the interviewer.
 *
 * Past sessions are listed first for that reason. Scoring puts an exact prefix
 * match above a match in the middle of a word, so typing "st" offers Stripe
 * before Data Analyst.
 */

export type SetupChoice =
  | { kind: "sector"; id: string; label: string }
  | { kind: "company"; label: string }
  | { kind: "role"; label: string }
  | { kind: "stage"; label: string }
  | { kind: "persona"; id: string; label: string; detail: string }
  | { kind: "session"; session: SessionSummary; label: string; detail: string };

interface Scored {
  choice: SetupChoice;
  score: number;
}

/**
 * How well `text` matches `query`. Higher is better; 0 means no match.
 *
 * Three tiers, because anything less makes the first suggestion feel random:
 * the whole string, then the start of a word, then anywhere.
 */
export function matchScore(text: string, query: string): number {
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase().trim();
  if (needle === "") return 1;
  if (haystack === needle) return 100;
  if (haystack.startsWith(needle)) return 80;
  // A word boundary — "product" should find "Senior Product Designer".
  if (new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(haystack)) {
    return 60;
  }
  return haystack.includes(needle) ? 30 : 0;
}

/** "12 Aug · 68%" — enough to tell two attempts apart at a glance. */
export function describeSession(session: SessionSummary): string {
  const when = new Date(session.startedAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
  const score = session.score === null ? "not scored" : `${Math.round(session.score)}%`;
  const mode = session.mode === "real" ? "Real" : "Practice";
  return `${when} · ${mode} · ${score}`;
}

/**
 * The label a past session is searched and displayed by.
 *
 * A free session is recorded against a placeholder company, and printing "a
 * well-regarded technology company" back at someone reads like a bug. The
 * placeholder is named by the server rather than guessed at here.
 */
export function sessionLabel(session: SessionSummary, genericCompany = ""): string {
  const parts = [session.role];
  if (session.company && session.company !== genericCompany) parts.push(session.company);
  else parts.push("General role");
  parts.push(session.stage);
  return parts.join(" · ");
}

export function buildChoices({
  sessions,
  companies,
  roles,
  stages,
  sectors,
  personas,
  query,
  genericCompany = "",
  limit = 8,
}: {
  sessions: SessionSummary[];
  companies: string[];
  roles: string[];
  stages: string[];
  sectors: Sector[];
  personas: Persona[];
  query: string;
  genericCompany?: string;
  limit?: number;
}): SetupChoice[] {
  const scored: Scored[] = [];

  for (const session of sessions) {
    const label = sessionLabel(session, genericCompany);
    const score = matchScore(label, query);
    // Past sessions outrank a bare option at equal relevance: repeating one is
    // the thing this field exists for, and setting a single field is the
    // thing the form below already does well.
    if (score > 0) {
      scored.push({
        choice: { kind: "session", session, label, detail: describeSession(session) },
        score: score + 10,
      });
    }
  }

  const plain = (
    [
      ...companies.map((label) => ({ kind: "company", label }) as SetupChoice),
      ...roles.map((label) => ({ kind: "role", label }) as SetupChoice),
      ...stages.map((label) => ({ kind: "stage", label }) as SetupChoice),
      ...sectors.map(
        (entry) => ({ kind: "sector", id: entry.id, label: entry.label }) as SetupChoice,
      ),
      ...personas.map(
        (entry) =>
          ({
            kind: "persona",
            id: entry.id,
            label: entry.name,
            detail: entry.title,
          }) as SetupChoice,
      ),
    ] satisfies SetupChoice[]
  ).map((choice) => ({ choice, score: matchScore(choice.label, query) }));

  scored.push(...plain.filter((entry) => entry.score > 0));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.choice);
}

const KIND_LABEL: Record<SetupChoice["kind"], string> = {
  session: "Past session",
  company: "Company",
  role: "Role",
  stage: "Stage",
  sector: "Sector",
  persona: "Interviewer",
};

export function SetupSearch({
  sessions,
  companies,
  roles,
  stages,
  sectors,
  personas,
  genericCompany = "",
  onChoose,
  disabled = false,
}: {
  sessions: SessionSummary[];
  companies: string[];
  roles: string[];
  stages: string[];
  sectors: Sector[];
  personas: Persona[];
  /** The placeholder a free session is stored under; never shown to anyone. */
  genericCompany?: string;
  onChoose: (choice: SetupChoice) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const choices = useMemo(
    () =>
      buildChoices({
        sessions,
        companies,
        roles,
        stages,
        sectors,
        personas,
        query,
        genericCompany,
      }),
    [sessions, companies, roles, stages, sectors, personas, query, genericCompany],
  );

  // Clamped rather than reset: a narrowing query should not silently move the
  // highlight to something the person was not looking at.
  useEffect(() => {
    setActive((current) => Math.min(current, Math.max(0, choices.length - 1)));
  }, [choices.length]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const choose = (choice: SetupChoice) => {
    onChoose(choice);
    setOpen(false);
    // A past session sets every field at once, so the query has done its job.
    // A single option leaves the query alone: people pick two in a row.
    if (choice.kind === "session") setQuery("");
  };

  return (
    <div ref={box} className="relative">
      <div className="focus-within:border-cream flex items-center gap-3 rounded-full border border-line px-4 py-3 transition-colors">
        <Search className="h-4 w-4 shrink-0 text-cream-faint" aria-hidden />
        <input
          type="search"
          value={query}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-controls="setup-suggestions"
          aria-autocomplete="list"
          placeholder="Search a company, a role, or a past session to run again"
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (!open || choices.length === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((current) => (current + 1) % choices.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((current) => (current - 1 + choices.length) % choices.length);
            } else if (event.key === "Enter") {
              event.preventDefault();
              const picked = choices[active];
              if (picked) choose(picked);
            }
          }}
          className="w-full bg-transparent text-sm text-cream-bright placeholder:text-cream-faint focus:outline-none disabled:opacity-50 sm:text-base"
        />
        {query !== "" && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            className="focus-ring shrink-0 rounded-full p-1 text-cream-faint transition-colors hover:text-cream-bright"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {open && choices.length > 0 && (
        <ul
          id="setup-suggestions"
          role="listbox"
          // bg-surface-deep, not bg-ink: there is no `ink` in the palette, so the
          // class resolved to nothing and the setup panel showed straight
          // through the suggestions. Opaque, and above the panel.
          className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-line bg-surface-deep p-1 shadow-2xl"
        >
          {choices.map((choice, index) => {
            const key =
              choice.kind === "session"
                ? `session:${choice.session.id}`
                : `${choice.kind}:${choice.label}`;
            const detail =
              choice.kind === "session" || choice.kind === "persona" ? choice.detail : "";
            return (
              <li key={key}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(choice)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${
                    index === active ? "bg-cream/10" : ""
                  }`}
                >
                  {choice.kind === "session" ? (
                    <History className="h-4 w-4 shrink-0 text-cream-faint" aria-hidden />
                  ) : (
                    <span className="w-4 shrink-0" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-cream-bright">
                      {choice.label}
                    </span>
                    {detail && (
                      <span className="block truncate text-xs text-cream-dim">
                        {detail}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-cream-faint">
                    {KIND_LABEL[choice.kind]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
