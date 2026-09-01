import { useEffect, useMemo, useState } from "react";
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Panel variant="glass" className="flex flex-col gap-6 p-6">
            <Eyebrow>Interview setup</Eyebrow>

            {can && !can.targetCompany && (
              <Panel variant="glass" className="flex flex-col gap-3 p-4">
                <p className="flex items-center gap-2 text-sm text-cream-bright">
                  <Lock className="h-4 w-4 shrink-0" aria-hidden />
                  You are on the free plan
                </p>
                <p className="text-xs text-cream-dim">
                  This runs as a general interview for your role — a real one,
                  scored honestly. Targeting a specific company, uploading your
                  CV and live coaching are on the paid plan.
                </p>
                <Link to="/#early-access" className="self-start">
                  <Action tone="glass">Six months free</Action>
                </Link>
              </Panel>
            )}

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
              <div role="radiogroup" aria-label="Sector" className="flex flex-wrap gap-2">
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
              </div>
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

            <Field
              label="Interviewer"
              hint={
                !can?.choosePersona
                  ? "Each company has a default temperament. Choosing your own is part of the paid plan."
                  : (personas.find((p) => p.id === personaId)?.summary ??
                    "Leave it and you get the one this company implies.")
              }
            >
              <div role="radiogroup" aria-label="Interviewer" className="flex flex-wrap gap-2">
                <Pill
                  label="Company default"
                  selected={personaId === ""}
                  onSelect={() => setPersonaId("")}
                  disabled={can ? !can.choosePersona : false}
                />
                {personas.map((entry) => (
                  <Pill
                    key={entry.id}
                    label={entry.label}
                    selected={personaId === entry.id}
                    onSelect={() => setPersonaId(entry.id)}
                    disabled={can ? !can.choosePersona : false}
                  />
                ))}
              </div>
            </Field>

            <Field
              label="Mode"
              hint={
                mode === "practice"
                  ? "Coaching notes appear beside the transcript as you go."
                  : "No coaching until the end — closer to the real thing, and worth more XP."
              }
            >
              <div role="radiogroup" aria-label="Mode" className="flex flex-wrap gap-2">
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
              </div>
            </Field>
          </Panel>

          <div className="flex flex-col justify-between gap-6">
            <Panel className="p-6">
              <Eyebrow>What to expect</Eyebrow>
              <ul className="mt-4 flex flex-col gap-3 text-sm text-cream-dim">
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
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Pill
            key={option}
            label={option}
            selected={option === value}
            onSelect={() => onChange(option)}
            disabled={disabled}
          />
        ))}
      </div>
    </Field>
  );
}
