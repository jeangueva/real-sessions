import { Fragment, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Action, Field, Panel, Eyebrow } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { Link } from "react-router-dom";
import { Lock, X } from "lucide-react";
import { fetchCatalogue, fetchHistory, fetchPlan, fetchPreferences } from "@/lib/api";
import type {
  Capabilities,
  CatalogueCompany,
  Persona,
  SessionMode,
  SessionSummary,
  Sector,
} from "@/lib/api";
import { SetupSearch, type SetupChoice } from "./SetupSearch";
import { OverflowRow } from "./OverflowRow";

/**
 * Whether the briefing has been dismissed. Per-device and low stakes, so it
 * lives in the browser rather than in the account's preferences — which hold
 * real settings, not "I have read this".
 */
const BRIEFING_KEY = "realsessions.briefing.dismissed";

function briefingDismissed(): boolean {
  try {
    return localStorage.getItem(BRIEFING_KEY) === "1";
  } catch {
    // Private windows and blocked site data both throw. Showing the tips is
    // the safe answer.
    return false;
  }
}

const ROLES = [
  "Senior Product Designer",
  "Backend Engineer",
  "Growth PM",
  "Data Analyst",
];
const STAGES = ["Behavioral", "Technical deep dive", "System design"];

/** Shown until the catalogue arrives, so the form is never empty on load. */
const FALLBACK_COMPANIES = ["Stripe", "Amazon", "Airbnb", "Mercado Libre"];

/** Collects exactly the variables the Phase 1 prompt needs — nothing more. */
export function SessionSetup() {
  const navigate = useNavigate();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [companies, setCompanies] = useState<CatalogueCompany[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personaId, setPersonaId] = useState("");
  const [can, setCan] = useState<Capabilities | null>(null);
  const [sector, setSector] = useState("");
  const [company, setCompany] = useState(FALLBACK_COMPANIES[0]!);
  const [role, setRole] = useState(ROLES[0]!);
  const [stage, setStage] = useState(STAGES[0]!);
  const [mode, setMode] = useState<SessionMode>("practice");
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [showBriefing, setShowBriefing] = useState(() => !briefingDismissed());
  /** What a free session is stored under. Never shown; used to hide it. */
  const [genericCompany, setGenericCompany] = useState("");

  const dismissBriefing = () => {
    setShowBriefing(false);
    try {
      localStorage.setItem(BRIEFING_KEY, "1");
    } catch {
      // The panel still closes for this visit; it just comes back next time.
    }
  };

  /**
   * Applies a search result.
   *
   * A past session sets every field at once — company, role, stage, mode and
   * the interviewer — because a rerun against a different interviewer measures
   * the interviewer, not the candidate. That is the whole point of repeating
   * one.
   */
  const applyChoice = (choice: SetupChoice) => {
    switch (choice.kind) {
      case "session": {
        const past = choice.session;
        // A free session was recorded against the placeholder, which is not a
        // company anyone can pick. Leave the current choice alone rather than
        // setting a value the picker would immediately snap away from.
        if (past.company && past.company !== genericCompany) setCompany(past.company);
        setRole(past.role);
        setStage(past.stage);
        setMode(past.mode);
        setSector(past.sectorId ?? "");
        setPersonaId(past.personaId ?? "");
        break;
      }
      case "company":
        setCompany(choice.label);
        break;
      case "role":
        setRole(choice.label);
        break;
      case "stage":
        setStage(choice.label);
        break;
      case "sector":
        setSector(choice.id);
        break;
      case "persona":
        setPersonaId(choice.id);
        break;
    }
  };

  useEffect(() => {
    // A failure here is not worth an error banner: the fallback list still
    // produces a working interview.
    fetchCatalogue()
      .then((result) => {
        setSectors(result.sectors);
        setCompanies(result.companies);
        setPersonas(result.personas);
        setGenericCompany(result.genericCompany ?? "");
      })
      .catch(() => undefined);
    fetchPlan()
      .then((result) => setCan(result.capabilities))
      .catch(() => undefined);
    // Only for the search box. A first-time candidate has none, and the field
    // still works as a way into the form.
    fetchHistory()
      .then((result) => setSessions(result.sessions))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetchPreferences()
      .then(({ preferences }) => {
        setRole((current) =>
          ROLES.includes(preferences.defaultRole) ? preferences.defaultRole : current,
        );
        setCompany((current) => preferences.defaultCompany || current);
        setSector(preferences.defaultSector);
        setMode(preferences.defaultMode);
      })
      .catch(() => undefined);
  }, []);

  const visibleCompanies = useMemo(() => {
    if (companies.length === 0) return FALLBACK_COMPANIES;
    const filtered = sector
      ? companies.filter((entry) => entry.sectorId === sector)
      : companies;
    return filtered.map((entry) => entry.name);
  }, [companies, sector]);

  // Narrowing the sector can strand the current pick outside the list. Moving
  // to the first visible option keeps the form and the interview agreeing.
  useEffect(() => {
    if (visibleCompanies.length > 0 && !visibleCompanies.includes(company)) {
      setCompany(visibleCompanies[0]!);
    }
  }, [visibleCompanies, company]);

  const activeSector = sectors.find((entry) => entry.id === sector);

  return (
    <>
      <PageHeader
        title="Start an interview"
        meta="Seven turns, about ten minutes. You can stop at any point."
      />

      <PageBody>
        {/* The spacing lives on a wrapper, not on PageBody: its className goes
            on the outer padding element, and the children sit in a plain block
            inside it — so a gap set there never reaches them, and the search
            box ended up flush against the panel below it. */}
        <div className="flex flex-col gap-6">
        {can && !can.targetCompany && (
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
            <p className="flex min-w-0 flex-1 items-center gap-2 text-xs text-cream-dim">
              <Lock className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                <span className="text-cream-bright">You are on the free plan.</span>{" "}
                A general interview for your role, scored honestly. Targeting a
                company, your CV and live coaching are on the paid plan.
              </span>
            </p>
            <Link to="/#early-access" className="shrink-0">
              <Action tone="glass">Six months free</Action>
            </Link>
          </div>
        )}

        <SetupSearch
          sessions={sessions}
          companies={visibleCompanies}
          roles={ROLES}
          stages={STAGES}
          sectors={sectors}
          personas={personas}
          genericCompany={genericCompany}
          onChoose={applyChoice}
        />

        {/* Full width. Everything inside scrolls sideways rather than
            wrapping, so a longer list costs lateral space, never a new row
            that pushes Begin below the fold. */}
        <Panel variant="glass" className="flex min-w-0 flex-col gap-5 p-6">
          <Eyebrow>Interview setup</Eyebrow>

          {/* All five on one row from `xl`. Each is a rail. */}
          {/* Ordered by what this plan can actually change.
              On free, sector and company are locked, and leading with two
              controls that refuse to move reads as a broken form rather than
              as a paywall. The sort is stable, so a paid plan — where nothing
              is locked — keeps the declared order. */}
          <div className="flex min-w-0 flex-col gap-5">
            {orderByEnabled([
              {
                key: "sector",
                enabled: can?.targetCompany ?? true,
                node: (
                  <Field
                    label="Sector"
                    hint={
                      !can?.targetCompany
                        ? "Part of the paid plan."
                        : activeSector
                          ? `Expect ${activeSector.metrics}.`
                          : "Sets the vocabulary and the numbers you will be asked for."
                    }
                  >
                    <OverflowRow label="Sector" title="Sector">
                      <Pill
                        label="All"
                        selected={sector === ""}
                        onSelect={() => setSector("")}
                        disabled={can ? !can.targetCompany : false}
                      />
                      {sectors.map((entry) => (
                        <Pill
                          key={entry.id}
                          label={entry.label}
                          selected={sector === entry.id}
                          onSelect={() => setSector(entry.id)}
                          disabled={can ? !can.targetCompany : false}
                        />
                      ))}
                    </OverflowRow>
                  </Field>
                ),
              },
              {
                key: "company",
                enabled: can?.targetCompany ?? true,
                node: (
                  <ChoiceField
                    label="Company"
                    options={visibleCompanies}
                    value={company}
                    onChange={setCompany}
                    disabled={can ? !can.targetCompany : false}
                  />
                ),
              },
              {
                key: "role",
                enabled: true,
                node: (
                  <ChoiceField
                    label="Role"
                    options={ROLES}
                    value={role}
                    onChange={setRole}
                  />
                ),
              },
              {
                key: "stage",
                enabled: true,
                node: (
                  <ChoiceField
                    label="Stage"
                    options={STAGES}
                    value={stage}
                    onChange={setStage}
                  />
                ),
              },
              {
                key: "mode",
                enabled: true,
                node: (
                  <Field
                    label="Mode"
                    hint={
                      mode === "practice"
                        ? "Coaching notes appear beside the transcript."
                        : "No coaching until the end. Worth more XP."
                    }
                  >
                    <OverflowRow label="Mode" title="Mode">
                      <Pill
                        label="Practice"
                        selected={mode === "practice"}
                        onSelect={() => setMode("practice")}
                      />
                      <Pill
                        label="Real"
                        selected={mode === "real"}
                        onSelect={() => setMode("real")}
                      />
                    </OverflowRow>
                  </Field>
                ),
              },
            ]).map((entry) => (
              <Fragment key={entry.key}>{entry.node}</Fragment>
            ))}
          </div>

          <Field
            label="Who interviews you"
            hint={
              !can?.choosePersona
                ? "Each company sends the interviewer its culture implies. Picking your own is part of the paid plan."
                : "Six people, six temperaments, six voices. The same answer does not land the same way with each."
            }
          >
            {/* Same rule as every other row: show what fits, and put the rest
                behind one button. Six cards never fitted a laptop, and a card
                you have to drag into view is a card nobody meets. */}
            <OverflowRow label="Interviewer" title="Who interviews you">
              <InterviewerCard
                initials="?"
                name="Company default"
                title="Whoever this company would send"
                summary="Stripe sends a skeptic. Airbnb sends a host."
                selected={personaId === ""}
                onSelect={() => setPersonaId("")}
                disabled={can ? !can.choosePersona : false}
              />
              {personas.map((entry) => (
                <InterviewerCard
                  key={entry.id}
                  initials={entry.initials}
                  name={entry.name}
                  title={entry.title}
                  summary={entry.summary}
                  selected={personaId === entry.id}
                  onSelect={() => setPersonaId(entry.id)}
                  disabled={can ? !can.choosePersona : false}
                />
              ))}
            </OverflowRow>
          </Field>

          <Action
            withArrow
            className="self-start"
            onClick={() =>
              navigate("/app/session", {
                state: { company, role, stage, mode, personaId },
              })
            }
          >
            Begin
          </Action>
        </Panel>

        {/* Dismissible: it is a briefing, and a briefing stops being useful on
            the fourth interview. Closing it is remembered per device. */}
        {showBriefing && (
          <Panel className="relative p-6">
            <button
              type="button"
              onClick={dismissBriefing}
              aria-label="Dismiss what to expect"
              className="focus-ring absolute right-4 top-4 rounded-full p-1 text-cream-faint transition-colors hover:text-cream-bright"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <Eyebrow>What to expect</Eyebrow>
            <ul className="mt-4 grid gap-3 pr-8 text-sm text-cream-dim md:grid-cols-3">
              <li>
                The interviewer stays in character. It will not translate a word
                or correct your grammar mid-interview.
              </li>
              <li>
                Vague answers get challenged. Have a specific example and a
                number ready.
              </li>
              <li>
                {/* Promising coaching to someone who will not get it is the
                    kind of small lie that makes a paywall feel like a bug. */}
                {!can?.liveCoaching
                  ? "Feedback comes as a report at the end. Live coaching is on the paid plan."
                  : mode === "practice"
                    ? "Coaching notes appear on the side. The interviewer never sees them."
                    : "No help until the report at the end."}
              </li>
            </ul>
          </Panel>
        )}
        </div>
      </PageBody>
    </>
  );
}

/** One option in a pill group. */

/** A setup control, with whether this plan can actually change it. */
export interface SetupFieldEntry {
  key: string;
  enabled: boolean;
  node: ReactNode;
}

/**
 * Puts the controls this plan can change first.
 *
 * A free candidate opening the form met sector and company — the two things
 * they cannot touch — before anything they can. That reads as a form that does
 * not work, which is a worse first impression than a paywall.
 *
 * Stable by construction: partitioning preserves declaration order inside each
 * group, so a paid plan (nothing locked) is untouched.
 */
export function orderByEnabled<T extends { enabled: boolean }>(entries: T[]): T[] {
  return [...entries.filter((e) => e.enabled), ...entries.filter((e) => !e.enabled)];
}

/**
 * One interviewer in the roster.
 *
 * Deliberately a card and not a pill: these are people, and a row of pills
 * reading "The skeptic / The warm host" reads as a tone setting rather than as
 * choosing who is across the table. The name and the job are what the
 * interviewer says out loud in their first sentence, so they belong here.
 */
function InterviewerCard({
  initials,
  name,
  title,
  summary,
  selected,
  onSelect,
  disabled = false,
}: {
  initials: string;
  name: string;
  title: string;
  summary: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onSelect}
      className={`focus-ring flex w-60 shrink-0 items-start gap-3 rounded-2xl border p-3 text-left transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
        selected
          ? "border-cream bg-cream text-black"
          : "border-line text-cream-dim hover:text-cream-bright"
      }`}
    >
      <span
        aria-hidden
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold tracking-wide ${
          selected ? "bg-black/10 text-black" : "bg-cream/10 text-cream-bright"
        }`}
      >
        {initials}
      </span>
      <span className="min-w-0">
        <span
          className={`block text-sm font-medium ${selected ? "text-black" : "text-cream-bright"}`}
        >
          {name}
        </span>
        <span className={`block text-xs ${selected ? "text-black/70" : "text-cream-dim"}`}>
          {title}
        </span>
        <span
          className={`mt-1 line-clamp-2 block text-xs leading-snug ${
            selected ? "text-black/70" : "text-cream-dim"
          }`}
        >
          {summary}
        </span>
      </span>
    </button>
  );
}

function Pill({
  label,
  selected,
  onSelect,
  disabled = false,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="radio"
      aria-checked={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={onSelect}
      className={`focus-ring rounded-full border px-4 py-2 text-xs transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm ${
        selected
          ? "border-cream bg-cream text-black"
          : "border-line text-cream-dim hover:text-cream-bright"
      }`}
    >
      {label}
    </button>
  );
}

/** Pill-group selector. Used wherever a short option list needs picking. */
function ChoiceField({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  return (
    <Field label={label}>
      <OverflowRow label={label} title={label}>
        {options.map((option) => (
          <Pill
            key={option}
            label={option}
            selected={option === value}
            onSelect={() => onChange(option)}
            disabled={disabled}
          />
        ))}
      </OverflowRow>
    </Field>
  );
}
