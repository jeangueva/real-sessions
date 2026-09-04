import { Fragment, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Action, Panel, Eyebrow } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { Link } from "react-router-dom";
import { Lock, X } from "lucide-react";
import { fetchCatalogue, fetchHistory, fetchPlan, fetchPreferences } from "@/lib/api";
import type {
  Capabilities,
  CatalogueCompany,
  Persona,
  Role,
  Stage,
  SessionMode,
  SessionSummary,
  Sector,
} from "@/lib/api";
import { SetupSearch, type SetupChoice } from "./SetupSearch";
import { FilterBar, FilterOption, FilterSegment } from "./FilterBar";

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

/**
 * Shown until the catalogue arrives. The server owns both lists — it had six
 * roles while this file hard-coded four, so two of them were unreachable.
 */
const FALLBACK_ROLES = ["Senior Product Designer", "Backend Engineer"];

/** Shown until the catalogue arrives, so the form is never empty on load. */
const FALLBACK_COMPANIES = ["Stripe", "Amazon", "Airbnb", "Mercado Libre"];

/** Collects exactly the variables the Phase 1 prompt needs — nothing more. */
export function SessionSetup() {
  const navigate = useNavigate();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stagesByRole, setStagesByRole] = useState<
    { roleId: string; stages: Stage[] }[]
  >([]);
  const [companies, setCompanies] = useState<CatalogueCompany[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personaId, setPersonaId] = useState("");
  const [can, setCan] = useState<Capabilities | null>(null);
  const [sector, setSector] = useState("");
  const [company, setCompany] = useState(FALLBACK_COMPANIES[0]!);
  const [role, setRole] = useState(FALLBACK_ROLES[0]!);
  const [stage, setStage] = useState("Behavioral");
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
        setRoles(result.roles ?? []);
        setStagesByRole(result.stagesByRole ?? []);
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
          preferences.defaultRole || current,
        );
        setCompany((current) => preferences.defaultCompany || current);
        setSector(preferences.defaultSector);
        setMode(preferences.defaultMode);
      })
      .catch(() => undefined);
  }, []);

  const roleLabels = useMemo(
    () => (roles.length > 0 ? roles.map((entry) => entry.label) : FALLBACK_ROLES),
    [roles],
  );

  /**
   * The rounds this role actually sits.
   *
   * Every role used to be offered the same three, so a Senior Product Designer
   * could pick "System design" and get a convincing interview about something
   * that round does not mean for them. Convincing and wrong is the worst of
   * the options: nothing on screen said the rehearsal was off-target.
   */
  const visibleStages = useMemo(() => {
    const id = roles.find((entry) => entry.label === role)?.id;
    return stagesByRole.find((entry) => entry.roleId === id)?.stages ?? [];
  }, [roles, stagesByRole, role]);

  // Changing role can strand the current round outside the list. Falling back
  // to the first keeps the picker and the interview agreeing.
  useEffect(() => {
    if (visibleStages.length > 0 && !visibleStages.some((s) => s.label === stage)) {
      setStage(visibleStages[0]!.label);
    }
  }, [visibleStages, stage]);

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
          roles={roleLabels}
          stages={visibleStages.map((entry) => entry.label)}
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

          {/* One bar of selectors rather than six rows of pills. The bar
              shows what is chosen — the thing a person rereads before
              pressing Begin — and opens the options only for the field being
              changed. Ordered by what this plan can actually change: on free,
              leading with two controls that refuse to move reads as a broken
              form rather than as a paywall. */}
          <FilterBar>
            {orderByEnabled([
              {
                key: "role",
                enabled: true,
                node: (
                  <FilterSegment
                    label="Role"
                    value={role}
                    hint="What you are interviewing for. It also decides which rounds exist."
                  >
                    {(close) =>
                      roleLabels.map((option) => (
                        <FilterOption
                          key={option}
                          label={option}
                          detail={roles.find((r) => r.label === option)?.focus}
                          selected={role === option}
                          onSelect={() => {
                            setRole(option);
                            close();
                          }}
                        />
                      ))
                    }
                  </FilterSegment>
                ),
              },
              {
                key: "stage",
                enabled: true,
                node: (
                  <FilterSegment
                    label="Stage"
                    value={stage}
                    hint="Which round of the process you are sitting."
                  >
                    {(close) =>
                      visibleStages.map((entry) => (
                        <FilterOption
                          key={entry.id}
                          label={entry.label}
                          detail={entry.summary}
                          selected={stage === entry.label}
                          onSelect={() => {
                            setStage(entry.label);
                            close();
                          }}
                        />
                      ))
                    }
                  </FilterSegment>
                ),
              },
              {
                key: "mode",
                enabled: true,
                node: (
                  <FilterSegment
                    label="Mode"
                    value={mode === "practice" ? "Practice" : "Real"}
                  >
                    {(close) => (
                      <>
                        <FilterOption
                          label="Practice"
                          detail="Coaching notes appear beside the transcript."
                          selected={mode === "practice"}
                          onSelect={() => {
                            setMode("practice");
                            close();
                          }}
                        />
                        <FilterOption
                          label="Real"
                          detail="No coaching until the end. Worth more XP."
                          selected={mode === "real"}
                          onSelect={() => {
                            setMode("real");
                            close();
                          }}
                        />
                      </>
                    )}
                  </FilterSegment>
                ),
              },
              {
                key: "interviewer",
                enabled: can?.choosePersona ?? true,
                node: (
                  <FilterSegment
                    label="Interviewer"
                    value={
                      personas.find((p) => p.id === personaId)?.name ?? "Company default"
                    }
                    hint="Six people, six temperaments, six voices. The same answer does not land the same way with each."
                    disabled={can ? !can.choosePersona : false}
                    disabledReason="Each company sends the interviewer its culture implies. Picking your own is part of the paid plan."
                  >
                    {(close) => (
                      <>
                        <FilterOption
                          label="Company default"
                          detail="Stripe sends a skeptic. Airbnb sends a host."
                          selected={personaId === ""}
                          onSelect={() => {
                            setPersonaId("");
                            close();
                          }}
                        />
                        {personas.map((entry) => (
                          <FilterOption
                            key={entry.id}
                            label={`${entry.name} · ${entry.title}`}
                            detail={entry.summary}
                            selected={personaId === entry.id}
                            onSelect={() => {
                              setPersonaId(entry.id);
                              close();
                            }}
                          />
                        ))}
                      </>
                    )}
                  </FilterSegment>
                ),
              },
              {
                key: "sector",
                enabled: can?.targetCompany ?? true,
                node: (
                  <FilterSegment
                    label="Sector"
                    value={activeSector?.label ?? "All"}
                    hint={
                      activeSector
                        ? `Expect ${activeSector.metrics}.`
                        : "Sets the vocabulary and the numbers you will be asked for."
                    }
                    disabled={can ? !can.targetCompany : false}
                    disabledReason="Choosing a sector is part of the paid plan."
                  >
                    {(close) => (
                      <>
                        <FilterOption
                          label="All"
                          selected={sector === ""}
                          onSelect={() => {
                            setSector("");
                            close();
                          }}
                        />
                        {sectors.map((entry) => (
                          <FilterOption
                            key={entry.id}
                            label={entry.label}
                            detail={entry.metrics}
                            selected={sector === entry.id}
                            onSelect={() => {
                              setSector(entry.id);
                              close();
                            }}
                          />
                        ))}
                      </>
                    )}
                  </FilterSegment>
                ),
              },
              {
                key: "company",
                enabled: can?.targetCompany ?? true,
                node: (
                  <FilterSegment
                    label="Company"
                    value={can && !can.targetCompany ? "General role" : company}
                    disabled={can ? !can.targetCompany : false}
                    disabledReason="Targeting a specific company is part of the paid plan."
                  >
                    {(close) =>
                      visibleCompanies.map((option) => (
                        <FilterOption
                          key={option}
                          label={option}
                          selected={company === option}
                          onSelect={() => {
                            setCompany(option);
                            close();
                          }}
                        />
                      ))
                    }
                  </FilterSegment>
                ),
              },
            ]).map((entry) => (
              <Fragment key={entry.key}>{entry.node}</Fragment>
            ))}
          </FilterBar>

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
