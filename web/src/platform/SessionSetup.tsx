import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Action, Field, Panel, Eyebrow } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { fetchCatalogue, fetchPlan, fetchPreferences } from "@/lib/api";
import type {
  Capabilities,
  CatalogueCompany,
  Persona,
  SessionMode,
  Sector,
} from "@/lib/api";

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

  useEffect(() => {
    // A failure here is not worth an error banner: the fallback list still
    // produces a working interview.
    fetchCatalogue()
      .then((result) => {
        setSectors(result.sectors);
        setCompanies(result.companies);
        setPersonas(result.personas);
      })
      .catch(() => undefined);
    fetchPlan()
      .then((result) => setCan(result.capabilities))
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
        {/* Two columns from `xl`: the form takes whatever the viewport has,
            the briefing sits in a fixed rail beside it. Below that they stack.
            Everything inside the form scrolls sideways rather than wrapping,
            so adding a company never pushes the Begin button off-screen. */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <Panel variant="glass" className="flex min-w-0 flex-col gap-5 p-6">
            <Eyebrow>Interview setup</Eyebrow>

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

            {/* All four on one row from `xl`, two-up below it. Each is a rail,
                so a long list costs sideways space rather than a fourth row. */}
            <div className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <Field
                label="Sector"
                hint={
                  !can?.targetCompany
                    ? "Choosing a sector is part of the paid plan."
                    : activeSector
                      ? `Your interviewer will expect ${activeSector.metrics}.`
                      : "Sets the vocabulary and the numbers you will be asked for."
                }
              >
                <Rail label="Sector">
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
                </Rail>
              </Field>

              <ChoiceField
                label="Company"
                options={visibleCompanies}
                value={company}
                onChange={setCompany}
                disabled={can ? !can.targetCompany : false}
              />
              <ChoiceField label="Target role" options={ROLES} value={role} onChange={setRole} />
              <ChoiceField label="Stage" options={STAGES} value={stage} onChange={setStage} />
            </div>

            <Field
              label="Who interviews you"
              hint={
                !can?.choosePersona
                  ? "Each company sends the interviewer its culture implies. Picking your own is part of the paid plan."
                  : "Six people, six temperaments, six voices. The same answer does not land the same way with each."
              }
            >
              {/* A carousel rather than a grid: six cards stacked vertically
                  is most of a screen, and the choice is a browse, not a form
                  field. Snap points so a flick lands on a card. */}
              <div
                role="radiogroup"
                aria-label="Interviewer"
                className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2"
              >
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
              </div>
            </Field>
          </Panel>

          <div className="flex flex-col gap-4">
            {/* Mode sits with the briefing because it is what the last line of
                the briefing is describing. */}
            <Panel className="flex flex-col gap-5 p-6">
              <Field
                label="Mode"
                hint={
                  mode === "practice"
                    ? "Coaching notes appear beside the transcript as you go."
                    : "No coaching until the end — closer to the real thing, and worth more XP."
                }
              >
                <Rail label="Mode">
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
                </Rail>
              </Field>
              <Eyebrow>What to expect</Eyebrow>
              <ul className="-mt-2 flex flex-col gap-3 text-sm text-cream-dim">
                <li>
                  The interviewer stays in character. It will not translate a
                  word or correct your grammar mid-interview.
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

            {/* self-start: the parent is a stretch-aligned flex column, which
                pulled the pill to the full column width. */}
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
          </div>
        </div>
      </PageBody>
    </>
  );
}

/** One option in a pill group. */

/**
 * A row of options that scrolls sideways instead of wrapping.
 *
 * Wrapping is what made this screen tall: eighteen companies became four rows,
 * four fields became a column taller than the viewport, and the Begin button
 * ended up below the fold on a laptop. A rail keeps every field one line high
 * whatever the list length, and the overflow is a gesture people already have.
 *
 * `-mx-1 px-1` so a focus ring on the first pill is not clipped by the
 * scroll container.
 */
function Rail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [&>*]:shrink-0"
    >
      {children}
    </div>
  );
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
      className={`focus-ring flex w-60 shrink-0 snap-start items-start gap-3 rounded-2xl border p-3 text-left transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
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
      <Rail label={label}>
        {options.map((option) => (
          <Pill
            key={option}
            label={option}
            selected={option === value}
            onSelect={() => onChange(option)}
            disabled={disabled}
          />
        ))}
      </Rail>
    </Field>
  );
}
