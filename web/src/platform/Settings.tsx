import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FileText, LogOut } from "lucide-react";
import { Field, Panel, Action, Notice, SegmentThumb, Segmented } from "@/design-system";
import { Profile } from "./Profile";
import { useTheme } from "@/hooks/useTheme";
import { useLocale } from "@/hooks/useLocale";
import { LOCALES } from "@/lib/i18n";
import { areaLabel } from "@/lib/areas";
import { resetTour } from "@/lib/tour";
import { PageBody, PageHeader } from "./AppShell";
import { Billing } from "./Billing";
import { DeleteAccount } from "./DeleteAccount";
import { AdvisorCard } from "./AdvisorCard";
import { GiftCard, RealJuryCard, refreshDefenseStatus } from "./DefenseExtras";
import { storedSpace, thesisPath, type Space } from "@/lib/spaces";
import { useThesisT } from "@/lib/thesis-copy";
import { canRecord } from "@/lib/recordings";
import {
  ApiError,
  buyDefensePack,
  fetchCareers,
  fetchCatalogue,
  fetchPreferences,
  fetchSession,
  fetchThesis,
  resendVerification,
  saveCareer,
  savePreferences,
  signOut,
} from "@/lib/api";
import type {
  CatalogueCompany,
  CareerCatalogue,
  CareerResolution,
  DefenseAllowance,
  DefenseFormatInfo,
  Level,
  Area,
  PackKind,
  PackOfferDetail,
  Role,
  Preferences,
  Sector,
  Session,
  StoredThesis,
} from "@/lib/api";

/**
 * Shown until the catalogue arrives, so a select is never empty.
 *
 * These are fallbacks, not the list. This screen used to hard-code four roles
 * while the server offered six, which made Frontend Engineer and Engineering
 * Manager unreachable from here — the same bug the setup screen already fixed
 * by reading the catalogue, and the reason both now do.
 */
const FALLBACK_ROLES = [
  "Senior Product Designer",
  "Backend Engineer",
  "Growth PM",
  "Data Analyst",
];
const FALLBACK_COMPANIES = ["Stripe", "Amazon", "Airbnb", "Mercado Libre"];

/** Preferences, stored per identity and used to pre-fill a new session. */
type TabId = "account" | "defense" | "advisor" | "practice" | "context" | "appearance" | "plan";

const ALL_TAB_IDS: TabId[] = ["account", "defense", "advisor", "practice", "context", "appearance", "plan"];

/** The section a link asked for, defaulting to the first. */
function tabFromHash(hash: string, validIds: TabId[]): TabId {
  const id = hash.replace("#", "") as TabId;
  if (validIds.includes(id)) return id;
  if (ALL_TAB_IDS.includes(id)) {
    if (id === "practice") return validIds.includes("defense") ? "defense" : "account";
    if (id === "defense") return validIds.includes("practice") ? "practice" : "account";
    if (id === "context") return validIds.includes("advisor") ? "advisor" : "account";
    if (id === "advisor") return validIds.includes("context") ? "context" : "account";
  }
  return "account";
}

export function Settings() {
  const { choice, theme, setChoice } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const tt = useThesisT();
  const [space, setSpace] = useState<Space>(() => storedSpace());
  const [tourReset, setTourReset] = useState(false);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [resent, setResent] = useState(false);
  const { hash } = useLocation();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [companies, setCompanies] = useState<CatalogueCompany[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  useEffect(() => {
    const onSpace = (event: Event) => {
      const next = (event as CustomEvent<Space>).detail;
      if (next === "defense" || next === "career") setSpace(next);
    };
    window.addEventListener("mockio:space", onSpace);
    return () => window.removeEventListener("mockio:space", onSpace);
  }, []);

  const tabs: { id: TabId; label: string }[] =
    space === "defense"
      ? [
          { id: "account", label: t("settings.account") },
          { id: "defense", label: tt("settingsDefenseTab") },
          { id: "advisor", label: tt("settingsAdvisorTab") },
          { id: "appearance", label: t("settings.appearance") },
          { id: "plan", label: t("billing.plan") },
        ]
      : [
          { id: "account", label: t("settings.account") },
          { id: "practice", label: t("settings.practice") },
          { id: "context", label: t("nav.context") },
          { id: "appearance", label: t("settings.appearance") },
          { id: "plan", label: t("billing.plan") },
        ];
  const validTabIds = tabs.map((entry) => entry.id);

  useEffect(() => {
    fetchCatalogue()
      .then((result) => {
        setSectors(result.sectors);
        setCompanies(result.companies);
        setLevels(result.levels ?? []);
        setRoles(result.roles ?? []);
        setAreas(result.areas ?? []);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    fetchSession()
      .then(setSession)
      .catch(() => setSession({ kind: null, email: null }));
  }, []);

  useEffect(() => {
    fetchPreferences()
      .then((result) => setPreferences(result.preferences))
      .catch((caught: unknown) =>
        setError(
          caught instanceof ApiError
            ? caught.message
            : "Could not load your settings.",
        ),
      );
  }, []);

  const save = async () => {
    if (!preferences) return;
    setStatus("saving");
    setError(null);
    try {
      // The server echoes what it stored, so any clamping it applied shows up
      // in the form rather than silently disagreeing with it.
      const result = await savePreferences(preferences);
      setPreferences(result.preferences);
      setStatus("saved");
      // The sidebar shows this name; tell it without a reload.
      window.dispatchEvent(
        new CustomEvent("mockio:name", { detail: result.preferences.candidateName }),
      );
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save.");
      setStatus("idle");
    }
  };

  /**
   * One section at a time.
   *
   * Everything used to be stacked in one narrow column: four panels, a page
   * and a half of scrolling, and the right two-thirds of a wide screen empty.
   * Nothing here is read in sequence — theme, then practice defaults, then
   * billing — so the page is four destinations rather than one long one, and
   * each gets the full width it was already being given.
   *
   * The hash names the section, which is what makes the pricing card's
   * `#plan` link land on billing rather than at the top of the page.
   */
  const [tab, setTab] = useState<TabId>(() => tabFromHash(hash, validTabIds));
  useEffect(() => {
    setTab((current) => {
      if (hash) return tabFromHash(hash, validTabIds);
      if (validTabIds.includes(current)) return current;
      return tabFromHash(`#${current}`, validTabIds);
    });
  }, [hash, space]);

  const update = (patch: Partial<Preferences>) => {
    setStatus("idle");
    setPreferences((current) => (current ? { ...current, ...patch } : current));
  };

  return (
    <>
      <PageHeader
        title={t("settings.title")}
        meta={space === "defense" ? tt("settingsMetaDefense") : t("settings.meta")}
      />
      <PageBody>
        {/* One row that scrolls sideways on a phone, the way iOS segmented
            filters do, instead of wrapping "Cuenta" onto a second line of a
            pill. Bleeds to the screen edge so the cut-off tab says "more". */}
        <div className="-mx-4 mb-8 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
        <div
          role="tablist"
          aria-label={t("settings.sections")}
          className="inline-flex flex-nowrap items-center gap-1 rounded-full bg-surface-lift p-1"
        >
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              id={`settings-tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`settings-panel-${id}`}
              onClick={(event) => {
                setTab(id);
                event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
                // The section becomes linkable and the back button steps
                // through the four rather than leaving the page.
                history.pushState(null, "", `#${id}`);
              }}
              className={`focus-ring relative shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium transition-[color,transform] duration-150 ease-press active:scale-[0.97] sm:text-sm ${
                tab === id ? "text-cream-bright" : "text-cream-dim hover:text-cream-bright"
              }`}
            >
              {tab === id && <SegmentThumb id="settings-tab" />}
              <span className="relative">{label}</span>
            </button>
          ))}
        </div>
        </div>

        {tab === "appearance" && (
        <Panel
          role="tabpanel"
          id="settings-panel-appearance"
          aria-labelledby="settings-tab-appearance"
          className="grid gap-6 p-6 sm:p-8 lg:grid-cols-2"
        >
          <Field
            label={t("settings.theme")}
            hint={
              choice === "system"
                ? t("settings.themeFollowing", {
                    theme:
                      theme === "dark" ? t("settings.themeDark") : t("settings.themeLight"),
                  })
                : t("settings.themeFixed")
            }
          >
            <Segmented
              label={t("settings.theme")}
              value={choice}
              onChange={setChoice}
              options={[
                { value: "system", label: t("settings.themeSystem") },
                { value: "dark", label: t("settings.themeDark") },
                { value: "light", label: t("settings.themeLight") },
              ]}
              className="self-start"
            />
          </Field>

          {/* The interface language, not the interview's. Free, because
              asking a Latin American candidate to navigate an English app is
              not a thing to charge for — what costs is the interviewer
              speaking their language, and that is chosen per interview. */}
          <Field
            label={t("settings.tour")}
            hint={t("settings.tourHint")}
          >
            <button
              onClick={() => {
                resetTour();
                setTourReset(true);
              }}
              className="focus-ring self-start rounded-full bg-surface-lift px-4 py-2 text-xs font-medium text-cream-bright transition-[background-color,transform] duration-200 ease-press hover:bg-cream/15 active:scale-[0.97] sm:text-sm"
            >
              {tourReset ? t("settings.tourReset") : t("settings.tourAgain")}
            </button>
          </Field>
          <Field
            label={t("settings.interfaceLanguage")}
            hint={t("settings.interfaceLanguageHint")}
            className="lg:col-span-2"
          >
            <div
              role="radiogroup"
              aria-label={t("settings.interfaceLanguage")}
              className="flex flex-wrap gap-2"
            >
              {LOCALES.map((entry) => (
                <button
                  key={entry.id}
                  role="radio"
                  aria-checked={locale === entry.id}
                  onClick={() => setLocale(entry.id)}
                  className={`focus-ring rounded-full border px-4 py-2 text-xs transition-[background-color,border-color,color,transform] duration-150 ease-press active:scale-[0.97] sm:text-sm ${
                    locale === entry.id
                      ? "border-cream bg-cream text-surface-base"
                      : "border-line-strong text-cream-dim hover:text-cream-bright"
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </Field>

        </Panel>
        )}

        {tab === "practice" && (
        <Panel
          role="tabpanel"
          id="settings-panel-practice"
          aria-labelledby="settings-tab-practice"
          className="grid gap-6 p-6 sm:p-8 lg:grid-cols-2"
        >

          {!preferences && !error && (
            <p className="text-sm text-cream-dim">{t("settings.loading")}</p>
          )}

          {error && (
            <p role="alert" className="text-sm text-cream-bright">
              {error}
            </p>
          )}

          {preferences && (
            <>

              <Field
                label={t("settings.defaultRole")}
                hint={t("settings.defaultRoleHint")}
                htmlFor="role"
              >
                <select
                  id="role"
                  value={preferences.defaultRole}
                  onChange={(event) => update({ defaultRole: event.target.value })}
                  className="field-control text-sm text-cream-bright"
                >
                  {/* Grouped by area, like the setup picker: forty roles in one
                      flat native list is a scroll with no landmarks. */}
                  {areas.length > 0 && roles.length > 0
                    ? areas.map((area) => {
                        const inArea = roles.filter((entry) => entry.area === area.id);
                        return inArea.length === 0 ? null : (
                          <optgroup key={area.id} label={areaLabel(t, area)}>
                            {inArea.map((entry) => (
                              <option key={entry.id} value={entry.label}>
                                {entry.label}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })
                    : (roles.length > 0
                        ? roles.map((entry) => entry.label)
                        : FALLBACK_ROLES
                      ).map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                </select>
              </Field>

              <Field
                label={t("settings.defaultSector")}
                hint={t("settings.defaultSectorHint")}
                htmlFor="sector"
              >
                <select
                  id="sector"
                  value={preferences.defaultSector}
                  onChange={(event) => update({ defaultSector: event.target.value })}
                  className="field-control text-sm text-cream-bright"
                >
                  <option value="">{t("settings.allSectors")}</option>
                  {sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t("settings.defaultCompany")} htmlFor="company">
                <select
                  id="company"
                  value={preferences.defaultCompany}
                  onChange={(event) =>
                    update({ defaultCompany: event.target.value })
                  }
                  className="field-control text-sm text-cream-bright"
                >
                  {(companies.length === 0
                    ? FALLBACK_COMPANIES
                    : companies
                        .filter(
                          (entry) =>
                            !preferences.defaultSector ||
                            entry.sectorId === preferences.defaultSector,
                        )
                        .map((entry) => entry.name)
                  ).map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label={t("settings.defaultLevel")}
                hint={t("settings.defaultLevelHint")}
                htmlFor="level"
              >
                <select
                  id="level"
                  value={preferences.defaultLevel}
                  onChange={(event) => update({ defaultLevel: event.target.value })}
                  className="field-control text-sm text-cream-bright"
                >
                  {levels.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label={t("settings.defaultMode")}
                hint={t("settings.defaultModeHint")}
                htmlFor="mode"
              >
                <select
                  id="mode"
                  value={preferences.defaultMode}
                  onChange={(event) =>
                    update({
                      defaultMode:
                        event.target.value === "real" ? "real" : "practice",
                    })
                  }
                  className="field-control text-sm text-cream-bright"
                >
                  <option value="practice">{t("settings.modePractice")}</option>
                  <option value="real">{t("settings.modeReal")}</option>
                </select>
              </Field>

              <Field
                label={t("settings.length", { turns: preferences.interviewLength })}
                hint={t("settings.lengthHint")}
                htmlFor="length"
              >
                <input
                  id="length"
                  type="range"
                  min={5}
                  max={7}
                  value={preferences.interviewLength}
                  onChange={(event) =>
                    update({ interviewLength: Number(event.target.value) })
                  }
                  /* `h-6` is the touch target. A native range track is 16px tall,
                     under what WCAG 2.5.8 asks of a control you have to drag;
                     the taller box grows the hit area without thickening the
                     track the browser draws inside it. */
                  className="focus-ring accent-cream h-6"
                />
              </Field>

              <div className="flex items-center gap-4">
                <Action
                  className="self-start"
                  onClick={() => void save()}
                  disabled={status === "saving"}
                >
                  {status === "saving" ? t("settings.saving") : t("settings.save")}
                </Action>
                {status === "saved" && (
                  <span role="status" className="text-xs text-cream-dim">
                    {t("settings.saved")}
                  </span>
                )}
              </div>
            </>
          )}
        </Panel>
        )}

        {tab === "defense" && <DefenseSettingsPanel />}

        {tab === "advisor" && <AdvisorSettingsPanel />}

        {tab === "context" && <Profile embedded />}

        {tab === "plan" && (
          <div
            role="tabpanel"
            id="settings-panel-plan"
            aria-labelledby="settings-tab-plan"
            className="flex flex-col gap-6"
          >
            {space === "defense" && <DefensePlanSection />}
            <Billing />
          </div>
        )}

        {tab === "account" && (
        <>
        <Panel
          role="tabpanel"
          id="settings-panel-account"
          aria-labelledby="settings-tab-account"
          variant="card"
          className="p-6 sm:p-8"
        >
          {/* The name lives with the account: it is who you are, used by the
              interviewer and shown in the sidebar instead of your email. */}
          {preferences && (
            <div className="flex max-w-md flex-col gap-3">
            <Field
              label={t("settings.yourName")}
              hint={space === "defense" ? tt("settingsYourNameHintDefense") : t("settings.yourNameHint")}
              htmlFor="candidate-name"
            >
              <input
                id="candidate-name"
                value={preferences.candidateName}
                onChange={(event) => update({ candidateName: event.target.value })}
                placeholder={t("settings.yourNamePlaceholder")}
                maxLength={60}
                className="field-control text-sm text-cream-bright placeholder:text-cream-faint"
              />
            </Field>
              <Action
                className="self-start"
                disabled={status === "saving"}
                onClick={() => void save()}
              >
                {status === "saving" ? t("settings.saving") : t("settings.save")}
              </Action>
              {status === "saved" && (
                <Notice tone="success">{t("settings.saved")}</Notice>
              )}
            </div>
          )}
          {session?.kind === "user" ? (
            <div className="mt-6 flex max-w-prose flex-col gap-4 border-t border-line pt-6">
              <p className="text-sm text-cream-dim">
                {t("settings.signedInAs")}{" "}
                <span className="text-cream-bright">{session.email}</span>.{" "}
                {t("settings.signedInNote")}
              </p>
              {session.emailVerified === false && (
                <div className="flex flex-col gap-3 border-t border-line pt-4">
                  <p className="text-sm text-cream-dim">
                    {t("settings.unconfirmed")}
                  </p>
                  <Action
                    tone="glass"
                    className="self-start"
                    disabled={resent}
                    onClick={() => {
                      void resendVerification().then(() => setResent(true));
                    }}
                  >
                    {resent ? t("settings.sent") : t("settings.resend")}
                  </Action>
                </div>
              )}
            </div>
          ) : null}
        </Panel>

        {/* Signing out lives in the sidebar on a wide screen, but the phone's
            bottom bar has no room for it, so it was nowhere at all there.
            Here it is findable on both — Account is where people look. */}
        <Panel className="flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
          <p className="text-sm text-cream-dim">{t("settings.signOutHint")}</p>
          <Action
            tone="neutral"
            onClick={() => void signOut().then(() => window.location.assign("/"))}
          >
            <LogOut aria-hidden className="h-4 w-4" />
            {t("nav.signOut")}
          </Action>
        </Panel>

        {/* Guarded on the email rather than on having an account: the shell
            above already refuses anyone without one. */}
        {session?.kind === "user" && session.email && (
          <DeleteAccount email={session.email} />
        )}
        </>
        )}
      </PageBody>
    </>
  );
}

/**
 * Sustentación preferences: university, country/grading scale, career jury
 * preset, optional real examiner names, fluency accessibility, and recording.
 */
function DefenseSettingsPanel() {
  const { t } = useLocale();
  const tt = useThesisT();
  const [thesis, setThesis] = useState<StoredThesis | null | undefined>(undefined);
  const [formats, setFormats] = useState<DefenseFormatInfo[]>([]);
  const [catalogue, setCatalogue] = useState<CareerCatalogue | null>(null);
  const [careerRes, setCareerRes] = useState<CareerResolution | null>(null);
  const [savedNotice, setSavedNotice] = useState(false);

  const [university, setUniversity] = useState(() => {
    try {
      return localStorage.getItem("mockio.university") ?? "";
    } catch {
      return "";
    }
  });
  const [country, setCountry] = useState(() => {
    try {
      return localStorage.getItem("mockio.defenseCountry") ?? "PE";
    } catch {
      return "PE";
    }
  });
  const [fluencyNeutral, setFluencyNeutral] = useState(() => {
    try {
      return localStorage.getItem("mockio.fluencyNeutral") === "1";
    } catch {
      return false;
    }
  });
  const [record, setRecord] = useState(() => {
    try {
      return localStorage.getItem("mockio.recordRehearsal") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    let cancelled = false;
    fetchThesis()
      .then((result) => {
        if (cancelled) return;
        setThesis(result.thesis ?? null);
        if (result.formats) setFormats(result.formats);
        if (result.career !== undefined) setCareerRes(result.career);
        try {
          if (!localStorage.getItem("mockio.defenseCountry") && result.thesis?.analysis.language === "pt") {
            setCountry("BR");
          }
        } catch {
          // Private mode.
        }
      })
      .catch(() => {
        if (!cancelled) setThesis(null);
      });
    fetchCareers()
      .then((result) => {
        if (!cancelled) setCatalogue(result);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const saveLocalDefaults = () => {
    try {
      localStorage.setItem("mockio.university", university.trim());
      localStorage.setItem("mockio.defenseCountry", country);
      localStorage.setItem("mockio.fluencyNeutral", fluencyNeutral ? "1" : "0");
      localStorage.setItem("mockio.recordRehearsal", record ? "1" : "0");
    } catch {
      // Private mode.
    }
    setSavedNotice(true);
  };

  const activeFamily = catalogue?.families.find(
    (entry) => entry.id === (thesis?.careerOverride ?? careerRes?.family),
  );
  const seatSummary = activeFamily
    ? [activeFamily.roles.presidente.m, activeFamily.roles.metodologo.f, activeFamily.roles.especialista.m].join(" · ")
    : null;

  return (
    <div
      role="tabpanel"
      id="settings-panel-defense"
      aria-labelledby="settings-tab-defense"
      className="flex flex-col gap-6"
    >
      <Panel className="grid gap-6 p-6 sm:p-8 lg:grid-cols-2">
        <Field
          label={tt("university")}
          htmlFor="defense-university"
        >
          <input
            id="defense-university"
            value={university}
            onChange={(event) => {
              setSavedNotice(false);
              setUniversity(event.target.value);
            }}
            placeholder={tt("universityPlaceholder")}
            maxLength={120}
            className="field-control text-sm text-cream-bright placeholder:text-cream-faint"
          />
        </Field>

        <Field
          label={tt("country")}
          hint={tt("countryNote")}
          htmlFor="defense-country"
        >
          <select
            id="defense-country"
            value={country}
            onChange={(event) => {
              setSavedNotice(false);
              setCountry(event.target.value);
            }}
            className="field-control text-sm text-cream-bright"
          >
            {(formats.length > 0
              ? formats
              : [
                  { country: "PE", countryName: "Perú", scale: { min: 0, max: 20 } },
                  { country: "MX", countryName: "México", scale: { min: 0, max: 10 } },
                  { country: "CO", countryName: "Colombia", scale: { min: 0, max: 5 } },
                  { country: "CL", countryName: "Chile", scale: { min: 1, max: 7 } },
                  { country: "AR", countryName: "Argentina", scale: { min: 1, max: 10 } },
                  { country: "ES", countryName: "España", scale: { min: 0, max: 10 } },
                  { country: "BR", countryName: "Brasil", scale: { min: 0, max: 10 } },
                ]
            ).map((format) => (
              <option key={format.country} value={format.country}>
                {format.countryName} · {format.scale.min}–{format.scale.max}
              </option>
            ))}
          </select>
        </Field>

        {thesis && catalogue && catalogue.families.length > 0 && (
          <Field
            label={tt("careerJuryLabel")}
            hint={seatSummary ? tt("careerJurySeats", { roles: seatSummary }) : tt("careerJuryCustomHint")}
            htmlFor="settings-career-jury"
            className="lg:col-span-2"
          >
            <select
              id="settings-career-jury"
              value={thesis.careerOverride ?? ""}
              onChange={(event) => {
                const next = event.target.value === "" ? null : event.target.value;
                setSavedNotice(false);
                saveCareer(next)
                  .then((res) => {
                    setThesis(res.thesis);
                    setCareerRes(res.career);
                    setSavedNotice(true);
                  })
                  .catch(() => undefined);
              }}
              className="field-control text-sm text-cream-bright"
            >
              <option value="">
                {tt("careerJuryAuto", {
                  name: careerRes?.careerName ?? careerRes?.familyName ?? thesis.analysis.field,
                })}
              </option>
              {catalogue.families.map((family) => (
                <option key={family.id} value={family.id}>
                  {family.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="flex flex-col gap-3 lg:col-span-2">
          <label className="flex items-start gap-2.5 text-sm text-cream">
            <input
              type="checkbox"
              className="mt-1"
              checked={fluencyNeutral}
              onChange={(event) => {
                setSavedNotice(false);
                setFluencyNeutral(event.target.checked);
              }}
            />
            <span>
              <span className="font-medium text-cream-bright">{tt("fluencyNeutral")}</span>{" "}
              <span className="block text-xs text-cream-dim">{tt("fluencyNeutralNote")}</span>
            </span>
          </label>

          {canRecord() && (
            <label className="flex items-start gap-2.5 text-sm text-cream">
              <input
                type="checkbox"
                className="mt-1"
                checked={record}
                onChange={(event) => {
                  setSavedNotice(false);
                  setRecord(event.target.checked);
                }}
              />
              <span>
                <span className="font-medium text-cream-bright">{tt("recordLabel")}</span>{" "}
                <span className="block text-xs text-cream-dim">{tt("recordNote")}</span>
              </span>
            </label>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 lg:col-span-2">
          <Action className="self-start" onClick={saveLocalDefaults}>
            {t("settings.save")}
          </Action>
          {savedNotice && (
            <span role="status" className="text-xs text-grow-text">
              {tt("settingsDefenseSaved")}
            </span>
          )}
        </div>
      </Panel>

      {thesis ? (
        <RealJuryCard thesis={thesis} onChange={setThesis} />
      ) : thesis === null ? (
        <Panel className="flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8">
          <div className="max-w-prose">
            <h2 className="text-base font-semibold text-cream-bright">{tt("settingsThesisDocTitle")}</h2>
            <p className="mt-1 text-sm text-cream-dim">{tt("settingsThesisDocNone")}</p>
          </div>
          <Link to={thesisPath("ensayar")}>
            <Action tone="neutral">{tt("settingsThesisGoUpload")}</Action>
          </Link>
        </Panel>
      ) : null}
    </div>
  );
}

/**
 * Advisor & institution link, plus a quick summary of the uploaded thesis.
 */
function AdvisorSettingsPanel() {
  const tt = useThesisT();
  const [thesis, setThesis] = useState<StoredThesis | null | undefined>(undefined);

  useEffect(() => {
    fetchThesis()
      .then((result) => setThesis(result.thesis ?? null))
      .catch(() => setThesis(null));
  }, []);

  return (
    <div
      role="tabpanel"
      id="settings-panel-advisor"
      aria-labelledby="settings-tab-advisor"
      className="flex max-w-3xl flex-col gap-6"
    >
      <AdvisorCard />

      {thesis && (
        <Panel className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text">
              <FileText aria-hidden className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-cream-dim">{tt("settingsThesisDocTitle")}</p>
              <p className="truncate text-base font-semibold text-cream-bright">{thesis.analysis.title}</p>
              <p className="text-xs text-cream-dim">
                {thesis.analysis.field} · {tt("pages", { count: thesis.pageCount })}
              </p>
            </div>
          </div>
          <Link to={thesisPath("ensayar")}>
            <Action tone="neutral">{tt("shortRehearse")}</Action>
          </Link>
        </Panel>
      )}
    </div>
  );
}

const DEFENSE_PACK_LABELS: Record<
  Exclude<PackKind, "asesor_pro">,
  { name: Parameters<ReturnType<typeof useThesisT>>[0]; body: Parameters<ReturnType<typeof useThesisT>>[0] }
> = {
  sustentacion: { name: "offerSustentacion", body: "offerSustentacionBody" },
  intensivo: { name: "offerIntensivo", body: "offerIntensivoBody" },
  grupal: { name: "offerGrupal", body: "offerGrupalBody" },
  docente: { name: "offerDocente", body: "offerDocenteBody" },
};

/**
 * Shown at the top of the Plan tab when the student is in Sustentación:
 * weekly free defence status or remaining credits, one-off defence packs,
 * and the family gift link.
 */
function DefensePlanSection() {
  const tt = useThesisT();
  const [allowance, setAllowance] = useState<DefenseAllowance | null>(null);
  const [offers, setOffers] = useState<PackOfferDetail[]>([]);
  const [payments, setPayments] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchThesis()
      .then((result) => {
        setAllowance(result.allowance ?? { credits: 0, freeLeft: 0 });
        setOffers((result.offers ?? []).filter((offer) => offer.kind !== "asesor_pro"));
        setPayments(result.pack?.available ?? false);
      })
      .catch(() => undefined);
  }, []);

  if (!allowance) return null;

  const isUnlimited = allowance.unlimited === true || allowance.credits === null;
  const hasCredits = isUnlimited || (allowance.credits ?? 0) > 0;
  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat(currency === "PEN" ? "es-PE" : undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const buy = async (kind: PackKind) => {
    setBuying(true);
    setError(null);
    try {
      refreshDefenseStatus();
      window.location.assign((await buyDefensePack(kind)).initPoint);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : tt("error"));
      setBuying(false);
    }
  };

  return (
    <Panel className="flex max-w-2xl flex-col gap-4 p-6 sm:p-8">
      <div>
        <h2 className="text-base font-semibold text-cream-bright">{tt("settingsPlanDefenseTitle")}</h2>
        <p className="mt-1 text-xs text-cream-dim">{tt("settingsPlanDefenseSubtitle")}</p>
      </div>

      <p className="rounded-xl bg-surface-lift px-4 py-3 text-sm font-medium text-cream-bright">
        {isUnlimited
          ? tt("unlimitedAvailable")
          : hasCredits
            ? `${tt("creditsLeft", { count: allowance.credits ?? 0 })}${
                allowance.sponsor ? ` (${tt("sponsoredBy", { name: allowance.sponsor.name })})` : ""
              }`
            : allowance.freeLeft > 0
              ? tt("freeAvailable")
              : tt("freeUsed")}
      </p>

      {!isUnlimited && payments && offers.length > 0 && (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {offers.map((offer) => {
            const copy = DEFENSE_PACK_LABELS[offer.kind as Exclude<PackKind, "asesor_pro">];
            if (!copy) return null;
            return (
              <button
                key={offer.kind}
                type="button"
                disabled={buying}
                onClick={() => void buy(offer.kind)}
                className="focus-ring flex flex-col items-start gap-1 rounded-xl bg-surface-lift px-4 py-3 text-left transition-[background-color,transform] duration-150 ease-press hover:bg-cream/10 active:scale-[0.98] disabled:opacity-60"
              >
                <span className="flex w-full items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-cream-bright">{tt(copy.name)}</span>
                  <span className="text-base font-bold tabular-nums text-cream-bright">
                    {money(offer.amount, offer.currency)}
                  </span>
                </span>
                <span className="text-xs text-cream-dim">{tt(copy.body)}</span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-step-text">
          {error}
        </p>
      )}

      {!isUnlimited && <GiftCard compact />}
    </Panel>
  );
}
