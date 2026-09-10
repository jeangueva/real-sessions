import { useEffect, useState } from "react";
import { Eyebrow, Field, Panel, Action } from "@/design-system";
import { useTheme } from "@/hooks/useTheme";
import { useLocale } from "@/hooks/useLocale";
import { LOCALES } from "@/lib/i18n";
import { resetTour } from "@/lib/tour";
import { PageBody, PageHeader } from "./AppShell";
import { Billing } from "./Billing";
import { DeleteAccount } from "./DeleteAccount";
import { Link } from "react-router-dom";
import {
  ApiError,
  fetchCatalogue,
  fetchPreferences,
  fetchSession,
  resendVerification,
  savePreferences,
} from "@/lib/api";
import type {
  CatalogueCompany,
  Level,
  Role,
  Preferences,
  Sector,
  Session,
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
export function Settings() {
  const { choice, theme, setChoice } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const [tourReset, setTourReset] = useState(false);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [resent, setResent] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [companies, setCompanies] = useState<CatalogueCompany[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    fetchCatalogue()
      .then((result) => {
        setSectors(result.sectors);
        setCompanies(result.companies);
        setLevels(result.levels ?? []);
        setRoles(result.roles ?? []);
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
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save.");
      setStatus("idle");
    }
  };

  const update = (patch: Partial<Preferences>) => {
    setStatus("idle");
    setPreferences((current) => (current ? { ...current, ...patch } : current));
  };

  return (
    <>
      <PageHeader title={t("settings.title")} meta={t("settings.meta")} />
      <PageBody>
        <Panel className="mb-4 flex max-w-2xl flex-col gap-4 p-6">
          <Eyebrow>{t("settings.appearance")}</Eyebrow>
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
            <div
              role="radiogroup"
              aria-label={t("settings.theme")}
              className="flex flex-wrap gap-2"
            >
              {(
                [
                  ["system", t("settings.themeSystem")],
                  ["dark", t("settings.themeDark")],
                  ["light", t("settings.themeLight")],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  role="radio"
                  aria-checked={choice === value}
                  onClick={() => setChoice(value)}
                  className={`focus-ring rounded-full border px-4 py-2 text-xs transition-colors sm:text-sm ${
                    choice === value
                      ? "border-cream bg-cream text-surface-base"
                      : "border-line text-cream-dim hover:text-cream-bright"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>

          {/* The interface language, not the interview's. Free, because
              asking a Latin American candidate to navigate an English app is
              not a thing to charge for — what costs is the interviewer
              speaking their language, and that is chosen per interview. */}
          <Field
            label={t("settings.interfaceLanguage")}
            hint={t("settings.interfaceLanguageHint")}
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
                  className={`focus-ring rounded-full border px-4 py-2 text-xs transition-colors sm:text-sm ${
                    locale === entry.id
                      ? "border-cream bg-cream text-surface-base"
                      : "border-line text-cream-dim hover:text-cream-bright"
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </Field>

          <Field
            label={t("settings.tour")}
            hint={t("settings.tourHint")}
          >
            <button
              onClick={() => {
                resetTour();
                setTourReset(true);
              }}
              className="focus-ring self-start rounded-full border border-line-strong px-4 py-2 text-xs text-cream-dim transition-colors hover:text-cream-bright sm:text-sm"
            >
              {tourReset ? t("settings.tourReset") : t("settings.tourAgain")}
            </button>
          </Field>
        </Panel>

        <Panel className="flex max-w-2xl flex-col gap-6 p-6">
          <Eyebrow>{t("settings.practice")}</Eyebrow>

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
                label={t("settings.yourName")}
                hint={t("settings.yourNameHint")}
                htmlFor="candidate-name"
              >
                <input
                  id="candidate-name"
                  value={preferences.candidateName}
                  onChange={(event) => update({ candidateName: event.target.value })}
                  placeholder={t("settings.yourNamePlaceholder")}
                  maxLength={60}
                  className="focus-ring rounded-xl border border-line-strong bg-surface-card px-4 py-2.5 text-sm text-cream-bright placeholder:text-cream-faint"
                />
              </Field>

              <Field
                label={t("settings.defaultRole")}
                hint={t("settings.defaultRoleHint")}
                htmlFor="role"
              >
                <select
                  id="role"
                  value={preferences.defaultRole}
                  onChange={(event) => update({ defaultRole: event.target.value })}
                  className="focus-ring rounded-xl border border-line-strong bg-surface-card px-4 py-2.5 text-sm text-cream-bright"
                >
                  {(roles.length > 0
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
                  className="focus-ring rounded-xl border border-line-strong bg-surface-card px-4 py-2.5 text-sm text-cream-bright"
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
                  className="focus-ring rounded-xl border border-line-strong bg-surface-card px-4 py-2.5 text-sm text-cream-bright"
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
                  className="focus-ring rounded-xl border border-line-strong bg-surface-card px-4 py-2.5 text-sm text-cream-bright"
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
                  className="focus-ring rounded-xl border border-line-strong bg-surface-card px-4 py-2.5 text-sm text-cream-bright"
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

        <Billing />

        <Panel variant="glass" className="mt-4 max-w-2xl p-6">
          <Eyebrow>{t("settings.account")}</Eyebrow>
          {session?.kind === "user" ? (
            <div className="mt-3 flex flex-col gap-4">
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
          ) : (
            <div className="mt-3 flex flex-col gap-4">
              <p className="text-sm text-cream-dim">
                {t("settings.guestNote")}
              </p>
              <Link to="/signin">
                <Action tone="glass" className="self-start">
                  {t("settings.saveProgress")}
                </Action>
              </Link>
            </div>
          )}
        </Panel>

        {/* Only for an account: a guest has nothing to delete, and the server
            says so rather than pretending otherwise. */}
        {session?.kind === "user" && session.email && (
          <DeleteAccount email={session.email} />
        )}
      </PageBody>
    </>
  );
}
