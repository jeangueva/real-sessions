import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Action, Panel, Eyebrow } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { Link } from "react-router-dom";
import { Lock, Plus, Search, X } from "lucide-react";
import { fetchCatalogue, fetchHistory, fetchPlan, fetchPreferences, titleInArea } from "@/lib/api";
import { areaLabel } from "@/lib/areas";
import type {
  Area,
  Capabilities,
  CatalogueCompany,
  Language,
  Level,
  Persona,
  Role,
  Stage,
  SessionMode,
  SessionSummary,
  Sector,
} from "@/lib/api";
import { SetupSearch, type SetupChoice } from "./SetupSearch";
import { FilterHeading, FilterOption, FilterRow, FilterSegment } from "./FilterBar";
import { Tour } from "./Tour";
import { useT } from "@/hooks/useLocale";
import { track } from "@/lib/analytics";
import { RecentSessions } from "./RecentSessions";
import { Today } from "./Today";
import { Welcome } from "./Welcome";
import { Journey } from "./Journey";

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
  const t = useT();
  const navigate = useNavigate();
  const [sectors, setSectors] = useState<Sector[]>([]);
  /** The search opens on demand, from the recent setups' heading. */
  const [searchOpen, setSearchOpen] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [stagesByRole, setStagesByRole] = useState<
    { roleId: string; stages: Stage[] }[]
  >([]);
  const [companies, setCompanies] = useState<CatalogueCompany[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [personaId, setPersonaId] = useState("");
  const [can, setCan] = useState<Capabilities | null>(null);
  const [sector, setSector] = useState("");
  /**
   * The advertisement this interview is for.
   *
   * Not stored with the profile the way a CV is: a posting belongs to one
   * application, and keeping it would quietly apply last month's job to
   * every interview after it. It travels with this session and is gone.
   */
  const [jobPosting, setJobPosting] = useState("");
  /**
   * The tracked application this interview is for, when somebody arrived from
   * the applications screen.
   *
   * Held rather than read inline so that changing the company afterwards
   * detaches it: the link means "rehearse for this job", and a session filed
   * against an application whose company no longer matches would corrupt the
   * one number that screen exists to show.
   */
  const [application, setApplication] = useState<
    { id: string; company: string; role: string } | null
  >(null);
  const [company, setCompany] = useState(FALLBACK_COMPANIES[0]!);
  const [role, setRole] = useState(FALLBACK_ROLES[0]!);
  /**
   * The rounds this session covers, in order, by id.
   *
   * A list rather than one value because real interviews combine — a screen
   * that drifts into behavioural, a technical that closes on values — and
   * rehearsing them one at a time never rehearses the handover.
   */
  const [stageIds, setStageIds] = useState<string[]>([]);
  const [maxCombined, setMaxCombined] = useState(3);
  const [languages, setLanguages] = useState<Language[]>([]);
  /** What the interviewer speaks. Not the interface language. */
  const [languageId, setLanguageId] = useState("en");
  const [levels, setLevels] = useState<Level[]>([]);
  /**
   * How much English to run it in. Free on every plan — see the server's note.
   * Seeded from preferences below, because it changes on the scale of months.
   */
  const [levelId, setLevelId] = useState("b2");
  const [mode, setMode] = useState<SessionMode>("practice");
  /**
   * Stress mode. Free on every plan, so it sits in the bar rather than behind
   * a crown: it changes how hard the interview feels, not what the product
   * gives away.
   */
  const [pressure, setPressure] = useState(false);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  /** Set by the server when recent scores clear the current level's bar. */
  const [levelUp, setLevelUp] = useState<{ to: string; label: string } | null>(null);
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
   * Loads a past interview's configuration back into the bar.
   *
   * Shared by the search field and the recent rail, which are two ways to
   * reach the same action — and two places for it to drift out of step if it
   * were written twice.
   */
  const loadSession = (past: SessionSummary) => {
    // A free session was recorded against the placeholder, which is not a
    // company anyone can pick. Leave the current choice alone rather than
    // setting a value the picker would immediately snap away from.
    if (past.company && past.company !== genericCompany) setCompany(past.company);
    setRole(past.role);
    // A combined session is recorded as joined labels, which is what the
    // rerun has to restore — one round of a two-round interview is not the
    // same rehearsal.
    setStageIds(
      past.stage
        .split(" + ")
        .map((label) => label.trim())
        .map((label) => visibleStages.find((entry) => entry.label === label)?.id)
        .filter((id): id is string => Boolean(id)),
    );
    setMode(past.mode);
    setSector(past.sectorId ?? "");
    setPersonaId(past.personaId ?? "");
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
      case "session":
        loadSession(choice.session);
        break;
      case "company":
        setCompany(choice.label);
        break;
      case "role":
        setRole(choice.label);
        break;
      case "stage": {
        const found = visibleStages.find((entry) => entry.label === choice.label);
        if (found) setStageIds([found.id]);
        break;
      }
      case "sector":
        setSector(choice.id);
        break;
      case "persona":
        setPersonaId(choice.id);
        break;
    }
  };

  /**
   * Arriving from the applications screen.
   *
   * Read once, on mount: the state stays on the history entry, so re-reading
   * it would re-apply the company and role every time anything else on this
   * screen changed, and somebody who deliberately picked a different company
   * would watch it snap back.
   */
  const arrived = (useLocation().state ?? null) as
    | { applicationId?: string; company?: string; role?: string }
    | null;
  useEffect(() => {
    if (!arrived?.applicationId || !arrived.company || !arrived.role) return;
    setApplication({
      id: arrived.applicationId,
      company: arrived.company,
      role: arrived.role,
    });
    setCompany(arrived.company);
    setRole(arrived.role);
    // The posting lives on the application now, so the textarea has nothing
    // to hold — and leaving a stale one would send material the server is
    // about to ignore.
    setJobPosting("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setAreas(result.areas ?? []);
        setStagesByRole(result.stagesByRole ?? []);
        setMaxCombined(result.maxCombinedStages ?? 3);
        setLanguages(result.languages ?? []);
        setLevels(result.levels ?? []);
      })
      .catch(() => undefined);
    fetchPlan()
      .then((result) => setCan(result.capabilities))
      .catch(() => undefined);
    // Only for the search box. A first-time candidate has none, and the field
    // still works as a way into the form.
    fetchHistory()
      .then((result) => {
        setSessions(result.sessions);
        setLevelUp(result.levelUp);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetchPreferences()
      .then(({ preferences }) => {
        // The level is a standing answer, not a per-session choice, so the bar
        // opens on whatever the account settled on.
        if (preferences.defaultLevel) setLevelId(preferences.defaultLevel);
        /**
         * A standing preference must not outrank an explicit arrival.
         *
         * This resolves after mount, so somebody who came from an application
         * had their company and role set and then watched the saved default
         * overwrite both — which detached the session from the application it
         * was started for, silently, and left the rehearsal uncounted.
         */
        if (!arrived?.applicationId) {
          setRole((current) => preferences.defaultRole || current);
          setCompany((current) => preferences.defaultCompany || current);
        }
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
   * The roles, grouped by area in the order the server lists the areas.
   *
   * Without areas (an older server) it is one unlabelled group, which is the
   * flat list this replaced.
   */
  const roleGroups = useMemo(() => {
    if (areas.length === 0) return [{ id: "all", label: "", labels: roleLabels }];
    return areas
      .map((area) => ({
        id: area.id,
        label: areaLabel(t, area),
        labels: roles.filter((entry) => entry.area === area.id).map((entry) => entry.label),
      }))
      .filter((group) => group.labels.length > 0);
  }, [areas, roles, roleLabels, t]);

  /**
   * The area of the chosen role, for the interviewers' job titles.
   *
   * The same person interviews an accountant and an engineer, but not with
   * the same title: the Director of Engineering is the Finance Director in a
   * finance round. The prompt introduces them that way, so the picker does.
   */
  const roleArea = useMemo(
    () => areas.find((area) => area.id === roles.find((entry) => entry.label === role)?.area),
    [areas, roles, role],
  );
  const shownPersonas = useMemo(
    () => personas.map((entry) => ({ ...entry, title: titleInArea(entry.title, roleArea) })),
    [personas, roleArea],
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

  /** The chosen rounds, in the order they were chosen. */
  const chosenStages = useMemo(
    () =>
      stageIds
        .map((id) => visibleStages.find((entry) => entry.id === id))
        .filter((entry): entry is Stage => Boolean(entry)),
    [stageIds, visibleStages],
  );

  // Changing role strands rounds the new role does not sit. Dropping them and
  // falling back to the first keeps the picker and the interview agreeing.
  useEffect(() => {
    if (visibleStages.length === 0) return;
    setStageIds((current) => {
      const kept = current.filter((id) => visibleStages.some((s) => s.id === id));
      return kept.length > 0 ? kept : [visibleStages[0]!.id];
    });
  }, [visibleStages]);

  const toggleStage = (id: string) => {
    setStageIds((current) => {
      if (current.includes(id)) {
        // Never leave the interview with no round at all.
        return current.length === 1 ? current : current.filter((entry) => entry !== id);
      }
      // A solo round replaces the selection rather than joining it, and any
      // solo round already picked gets dropped when something else is. The
      // stand-up is not a round of a hiring loop, so it cannot share a sitting
      // with one; swapping is quieter than refusing the click.
      const picked = visibleStages.find((entry) => entry.id === id);
      if (picked?.solo) return [id];
      const withoutSolo = current.filter(
        (entry) => !visibleStages.find((s) => s.id === entry)?.solo,
      );
      // Past the cap, the oldest choice makes way — quieter than refusing the
      // click and leaving the reader to work out why nothing happened.
      return withoutSolo.length >= maxCombined
        ? [...withoutSolo.slice(1), id]
        : [...withoutSolo, id];
    });
  };

  /**
   * The interviewers who could credibly run these rounds.
   *
   * Prefers someone who covers all of them; when no one title does — a
   * recruiter screen and a system design round in one sitting — it casts for
   * the round that opens the interview.
   */
  const eligiblePersonas = useMemo(() => {
    if (chosenStages.length === 0) return personas;
    const shared = chosenStages.reduce<string[]>(
      (kept, entry) => kept.filter((title) => entry.titles.includes(title)),
      [...(chosenStages[0]?.titles ?? [])],
    );
    const titles = shared.length > 0 ? shared : (chosenStages[0]?.titles ?? []);
    const found = personas.filter((entry) => titles.includes(entry.title));
    return found.length > 0 ? found : personas;
  }, [chosenStages, personas]);

  // A chosen interviewer who does not run the new round is dropped back to the
  // company default rather than silently replaced server-side.
  useEffect(() => {
    if (personaId && !eligiblePersonas.some((entry) => entry.id === personaId)) {
      setPersonaId("");
    }
  }, [eligiblePersonas, personaId]);

  const visibleCompanies = useMemo(() => {
    if (companies.length === 0) return FALLBACK_COMPANIES;
    const filtered = sector
      ? companies.filter((entry) => entry.sectorId === sector)
      : companies;
    return filtered.map((entry) => entry.name);
  }, [companies, sector]);

  // Narrowing the sector can strand the current pick outside the list. Moving
  // to the first visible option keeps the form and the interview agreeing.
  //
  // Except the generic choice, which belongs to no sector by design: someone
  // who asked for an interview about the role rather than an employer should
  // not be handed Nubank because they then picked Fintech.
  useEffect(() => {
    if (company === genericCompany) return;
    /**
     * And not a company that arrived from an application.
     *
     * Most real employers are not in this catalogue — it is a curated list,
     * and somebody tracking a job at a forty-person startup will never find
     * it there. Without this, arriving from an application set the company
     * and then watched it snap to the first name in the list, which both lost
     * the employer and detached the session from the application it was
     * started for.
     */
    if (application && company === application.company) return;
    if (visibleCompanies.length > 0 && !visibleCompanies.includes(company)) {
      setCompany(visibleCompanies[0]!);
    }
  }, [visibleCompanies, company, genericCompany, application]);

  const activeSector = sectors.find((entry) => entry.id === sector);

  /**
   * How much of the free allowance is left.
   *
   * Counted from the history this screen already has rather than asked for
   * separately. It is advisory — the server does the check that matters, on
   * the whole record rather than the three sessions a free plan can see — so
   * the worst a stale count does is show an encouraging number and then get a
   * refusal, which is the right way round.
   */
  const limit = can?.weeklySessions ?? null;
  const usedThisMonth = (() => {
    if (limit === null) return 0;
    const now = new Date();
    const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
    return sessions.filter((entry) => Date.parse(entry.startedAt) >= start).length;
  })();
  const left = limit === null ? null : Math.max(0, limit - usedThisMonth);

  return (
    <>
      <PageHeader
        title={t("setup.title")}
        meta={t("setup.meta")}
        /**
         * The plan, in the row with the title.
         *
         * It was a full-width notice — twice over, once for the allowance and
         * once for the plan — carrying a paragraph of sales copy above the
         * thing someone came to do. What is worth saying at a glance is how
         * many interviews are left; the argument for paying belongs on the
         * page that sells, which is where the button goes.
         */
        actions={
          can && (!can.targetCompany || left !== null) ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
              <p className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface-lift px-3 py-1.5 text-xs font-medium text-cream-dim">
                <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className={left === 0 ? "text-cream-bright" : undefined}>
                  {left === 0
                    ? t("setup.quotaNone")
                    : left !== null && limit !== null
                      ? t("setup.quotaLeft", { left, limit })
                      : t("setup.quotaFree")}
                </span>
              </p>
              <Link to="/app/settings#plan" className="shrink-0">
                <Action tone="glass">{t("cta.seePlans")}</Action>
              </Link>
            </div>
          ) : undefined
        }
      />

      <Tour />
      <PageBody>
        {/* The spacing lives on a wrapper, not on PageBody: its className goes
            on the outer padding element, and the children sit in a plain block
            inside it — so a gap set there never reaches them, and the search
            box ended up flush against the panel below it. */}
        {/* `pb-20 md:pb-0` clears the fixed Begin bar, the same way the shell
            reserves the height of the mobile nav under it. */}
        <div className="flex flex-col gap-6 pb-20 md:pb-0">
        {/* The nudge sits above the bar it changes, so accepting it and
            seeing the level field move are one glance apart. Dismissing is
            local and for this visit only: the condition that raised it is a
            standing fact about their scores, not a notification to clear. */}
        {levelUp && (
          <Panel variant="raised" className="flex flex-wrap items-center justify-between gap-4 p-5">
            <div className="max-w-xl">
              <p className="text-base font-semibold text-cream-bright">
                {t("level.readyTitle", { level: levelUp.label })}
              </p>
              <p className="mt-1 text-sm text-cream-dim">{t("level.readyBody")}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setLevelUp(null)}
                className="focus-ring rounded-full px-4 py-2 text-sm font-medium text-cream-dim transition-colors hover:bg-surface-lift hover:text-cream-bright"
              >
                {t("level.readyDismiss")}
              </button>
              <Action
                onClick={() => {
                  setLevelId(levelUp.to);
                  setLevelUp(null);
                }}
              >
                {t("level.readyAccept", { level: levelUp.label })}
              </Action>
            </div>
          </Panel>
        )}

        {/* No card around it.
            A panel put a border and 24px of padding around the one row that
            matters, and pinned it to the panel's width — so the selectors had
            less room than the page had, and on a narrow screen the padding
            was competing with the fields for it. Out of the card, the row
            reflows against the page itself. */}
        <div className="flex min-w-0 flex-col gap-4">
          <h2 className="text-base font-semibold text-cream-bright">{t("setup.eyebrow")}</h2>

          {/* One bar of selectors rather than six rows of pills. The bar
              shows what is chosen — the thing a person rereads before
              pressing Begin — and opens the options only for the field being
              changed. Ordered by what this plan can actually change: on free,
              leading with two controls that refuse to move reads as a broken
              form rather than as a paywall. */}
          <FilterRow
            moreLabel={(count) => t("setup.moreFilters", { count })}
            fewerLabel={t("setup.fewerFilters")}
            entries={orderByEnabled([
              {
                key: "role",
                enabled: true,
                node: (
                  <FilterSegment
                    label={t("field.role")}
                    value={role}
                    hint={t("field.roleHint")}
                  >
                    {(close) =>
                      roleGroups.map((group) => (
                        <div key={group.id} role="group" aria-label={group.label}>
                          {group.label && <FilterHeading>{group.label}</FilterHeading>}
                          {group.labels.map((option) => (
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
                          ))}
                        </div>
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
                    label={t("field.stage")}
                    value={
                      chosenStages.map((entry) => entry.label).join(" + ") || "Behavioral"
                    }
                    hint={`Which rounds you are sitting. Pick up to ${maxCombined} — real interviews often cover more than one, and the handover between them is its own skill.`}
                  >
                    {() =>
                      visibleStages.map((entry) => (
                        <FilterOption
                          key={entry.id}
                          label={entry.label}
                          detail={entry.summary}
                          selected={stageIds.includes(entry.id)}
                          // Deliberately does not close: picking several is
                          // the point, and a panel that shut after the first
                          // would hide that entirely.
                          onSelect={() => toggleStage(entry.id)}
                        />
                      ))
                    }
                  </FilterSegment>
                ),
              },
              {
                key: "language",
                enabled: can?.interviewLanguage ?? true,
                node: (
                  <FilterSegment
                    label={t("field.language")}
                    value={
                      languages.find((entry) => entry.id === languageId)?.label ??
                      "English"
                    }
                    hint={t("field.languageHint")}
                    disabled={can ? !can.interviewLanguage : false}
                    disabledReason={t("field.languageLocked")}
                  >
                    {(close) =>
                      languages.map((entry) => (
                        <FilterOption
                          key={entry.id}
                          label={entry.label}
                          detail={entry.caveat}
                          selected={languageId === entry.id}
                          onSelect={() => {
                            setLanguageId(entry.id);
                            close();
                          }}
                        />
                      ))
                    }
                  </FilterSegment>
                ),
              },
              {
                key: "level",
                // Never disabled. The candidate who needs this is the one who
                // has not paid yet.
                enabled: true,
                node: (
                  <FilterSegment
                    label={t("field.level")}
                    value={
                      levels.find((entry) => entry.id === levelId)?.label ?? "B2"
                    }
                    hint={t("field.levelHint")}
                  >
                    {(close) =>
                      levels.map((entry) => (
                        <FilterOption
                          key={entry.id}
                          label={entry.label}
                          detail={entry.summary}
                          selected={levelId === entry.id}
                          onSelect={() => {
                            setLevelId(entry.id);
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
                    label={t("field.mode")}
                    value={mode === "practice" ? t("field.practice") : t("field.real")}
                  >
                    {(close) => (
                      <>
                        <FilterOption
                          label={t("field.practice")}
                          detail={t("field.practiceHint")}
                          selected={mode === "practice"}
                          onSelect={() => {
                            setMode("practice");
                            close();
                          }}
                        />
                        <FilterOption
                          label={t("field.real")}
                          detail={t("field.realHint")}
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
                key: "pressure",
                enabled: true,
                node: (
                  <FilterSegment
                    label={t("field.pressure")}
                    value={pressure ? t("field.pressureOn") : t("field.pressureOff")}
                    hint={t("field.pressureHint")}
                  >
                    {(close) => (
                      <>
                        <FilterOption
                          label={t("field.pressureOff")}
                          selected={!pressure}
                          onSelect={() => {
                            setPressure(false);
                            close();
                          }}
                        />
                        <FilterOption
                          label={t("field.pressureOn")}
                          selected={pressure}
                          onSelect={() => {
                            setPressure(true);
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
                    label={t("field.interviewer")}
                    value={
                      personas.find((p) => p.id === personaId)?.name ?? t("field.companyDefault")
                    }
                    hint={t("field.interviewerHint")}
                    disabled={can ? !can.choosePersona : false}
                    disabledReason={t("field.interviewerLocked")}
                  >
                    {(close) => (
                      <>
                        <FilterOption
                          label={t("field.companyDefault")}
                          detail={t("field.companyDefaultHint")}
                          selected={personaId === ""}
                          onSelect={() => {
                            setPersonaId("");
                            close();
                          }}
                        />
                        {eligiblePersonas.map((entry) => (
                          <FilterOption
                            key={entry.id}
                            label={`${entry.name} · ${titleInArea(entry.title, roleArea)}`}
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
                    label={t("field.sector")}
                    value={activeSector?.label ?? t("field.all")}
                    hint={
                      activeSector
                        ? `Expect ${activeSector.metrics}.`
                        : "Sets the vocabulary and the numbers you will be asked for."
                    }
                    disabled={can ? !can.targetCompany : false}
                    disabledReason={t("field.sectorLocked")}
                  >
                    {(close) => (
                      <>
                        <FilterOption
                          label={t("field.all")}
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
                    label={t("field.company")}
                    value={
                      can && !can.targetCompany
                        ? t("field.generalRole")
                        : company === genericCompany
                          ? t("field.anyCompany")
                          : company
                    }
                    disabled={can ? !can.targetCompany : false}
                    disabledReason={t("field.companyLocked")}
                  >
                    {(close) => (
                      <>
                        {/* First, and above the sector's own companies: an
                            interview about the work rather than about an
                            employer is a legitimate thing to rehearse, and
                            until now the only way to get one was to lose the
                            paid plan. It carries no sector, so picking one
                            does not take it away. */}
                        <FilterOption
                          label={t("field.anyCompany")}
                          selected={company === genericCompany}
                          onSelect={() => {
                            setCompany(genericCompany);
                            close();
                          }}
                        />
                        {visibleCompanies.map((option) => (
                          <FilterOption
                            key={option}
                            label={option}
                            selected={company === option}
                            onSelect={() => {
                              setCompany(option);
                              close();
                            }}
                          />
                        ))}
                      </>
                    )}
                  </FilterSegment>
                ),
              },
            ])}
            begin={
              <Action
                withArrow
                data-tour="begin"
                /* The server refuses this anyway. Saying so before the click
                   is the difference between a paywall and a failure. */
                disabled={left === 0}
            onClick={() => {
              // The shape of the interview, never what was typed into the
              // company box: that is a name a person chose to tell us.
              track("interview started", {
                round: chosenStages.map((entry) => entry.id).join("+"),
                language: languageId,
                level: levelId,
                targeted: company !== "",
              });
              navigate("/app/session", {
                state: {
                  company,
                  role,
                  // Only while it still describes the same job. Changing the
                  // company after arriving means this is no longer a rehearsal
                  // for that application, and filing it there would break the
                  // count the applications screen reports.
                  ...(application &&
                  application.company === company &&
                  application.role === role
                    ? { applicationId: application.id }
                    : {}),
                  stage: chosenStages.map((entry) => entry.label).join(" + "),
                  stages: chosenStages.map((entry) => entry.id),
                  language: languageId,
                  level: levelId,
                  bcp47:
                    languages.find((entry) => entry.id === languageId)?.bcp47 ?? "en-US",
                  mode,
                  personaId,
                  pressure,
                  jobPosting,
                },
              });
            }}
              >
                {t("setup.begin")}
              </Action>
            }
          />
        </div>

        {/* When this rehearses for a tracked application the posting already
            exists, so the textarea is replaced by a note saying where the
            material is coming from. Two places to paste one advertisement is
            how the two copies end up different. */}
        {application && application.company === company && application.role === role && (
          <Panel className="flex flex-col gap-1 p-5">
            <p className="text-sm font-medium text-cream-bright">
              {t("setup.fromApplication", { company: application.company })}
            </p>
            <p className="text-xs text-cream-faint">{t("setup.fromApplicationHint")}</p>
          </Panel>
        )}

        {/* Below the filters, because it is the one input that belongs to a
            single application rather than to a standing preference. Only on
            the paid plan, which is where targeting a real employer lives.
            Hidden when an application is supplying it. */}
        {can?.targetCompany &&
          !(application && application.company === company && application.role === role) && (
          /* A quiet link until it is wanted: most interviews start without a
             posting, and a full-width card for an optional field was the
             heaviest thing under the Begin button. */
          <details className="group rounded-card open:bg-surface-card open:shadow-card">
            <summary className="focus-ring inline-flex cursor-pointer list-none items-center gap-1.5 rounded-full px-1 py-1 text-sm font-medium text-accent-text group-open:px-5 group-open:pt-4">
              <Plus aria-hidden className="h-4 w-4 transition-transform duration-150 group-open:rotate-45" />
              {t("setup.postingTitle")}
              <span className="text-xs font-normal text-cream-faint">
                {jobPosting.trim() === "" ? t("setup.postingEmpty") : t("setup.postingSet")}
              </span>
            </summary>
            <div className="flex flex-col gap-3 p-5 pt-3">
              <p className="max-w-prose text-xs text-cream-dim">
                {t("setup.postingHint")}
              </p>
              <textarea
                value={jobPosting}
                onChange={(event) => setJobPosting(event.target.value.slice(0, 4000))}
                rows={6}
                placeholder={t("setup.postingPlaceholder")}
                className="field-control resize-y text-sm text-cream-bright placeholder:text-cream-faint"
              />
            </div>
          </details>
        )}

        {/* Past setups first, three at most; the search opens from their
            heading. A full-width search box above a row of five identical
            cards was the most reading on the screen and the least used. */}
        <div className="flex flex-col gap-3">
          <RecentSessions
            sessions={sessions}
            genericCompany={genericCompany}
            onPick={loadSession}
            action={
              <button
                type="button"
                onClick={() => setSearchOpen((open) => !open)}
                aria-expanded={searchOpen}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-accent-text transition-[background-color,transform] duration-150 hover:bg-accent-soft active:scale-[0.97]"
              >
                <Search aria-hidden className="h-4 w-4" />
                {t("setup.searchToggle")}
              </button>
            }
          />
          {searchOpen && (
            <div data-tour="search" className="pop-in">
              <SetupSearch
                sessions={sessions}
                companies={visibleCompanies}
                roles={roleLabels}
                stages={visibleStages.map((entry) => entry.label)}
                sectors={sectors}
                personas={shownPersonas}
                genericCompany={genericCompany}
                onChoose={(choice) => {
                  applyChoice(choice);
                  setSearchOpen(false);
                }}
              />
            </div>
          )}
        </div>

        {/* Dismissible: it is a briefing, and a briefing stops being useful on
            the fourth interview. Closing it is remembered per device. */}
        {showBriefing && (
          <Panel className="relative p-6">
            <button
              type="button"
              onClick={dismissBriefing}
              aria-label={t("setup.dismissBriefing")}
              className="focus-ring absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-surface-lift text-cream-dim transition-colors hover:text-cream-bright"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
            <Eyebrow>{t("setup.whatToExpect")}</Eyebrow>
            <ul className="mt-4 grid gap-3 pr-8 text-sm text-cream-dim md:grid-cols-3">
              <li>
                {t("setup.expectCharacter")}
              </li>
              <li>
                {t("setup.expectVague")}
              </li>
              <li>
                {/* Promising coaching to someone who will not get it is the
                    kind of small lie that makes a paywall feel like a bug. */}
                {!can?.liveCoaching
                  ? t("setup.expectLocked")
                  : mode === "practice"
                    ? t("setup.expectPractice")
                    : t("setup.expectReal")}
              </li>
            </ul>
          </Panel>
        )}

        {/* The game — the checklist, today's ring and missions, the path —
            after everything that starts an interview. Begin and the setup
            are what this screen is for, so they are never pushed below the
            fold by a panel about them. */}
        <Welcome sessions={sessions} />
        <Today sessions={sessions} />
        <Journey sessions={sessions} />
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
