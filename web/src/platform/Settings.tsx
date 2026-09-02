import { useEffect, useState } from "react";
import { Eyebrow, Field, Panel, Action } from "@/design-system";
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
import type { CatalogueCompany, Preferences, Sector, Session } from "@/lib/api";

const ROLES = [
  "Senior Product Designer",
  "Backend Engineer",
  "Growth PM",
  "Data Analyst",
];
/** Shown until the catalogue arrives, so the select is never empty. */
const FALLBACK_COMPANIES = ["Stripe", "Amazon", "Airbnb", "Mercado Libre"];

/** Preferences, stored per identity and used to pre-fill a new session. */
export function Settings() {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [resent, setResent] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [companies, setCompanies] = useState<CatalogueCompany[]>([]);

  useEffect(() => {
    fetchCatalogue()
      .then((result) => {
        setSectors(result.sectors);
        setCompanies(result.companies);
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
      <PageHeader title="Settings" meta="Account and practice preferences" />
      <PageBody>
        <Panel className="flex max-w-2xl flex-col gap-6 p-6">
          <Eyebrow>Practice</Eyebrow>

          {!preferences && !error && (
            <p className="text-sm text-cream-dim">Loading…</p>
          )}

          {error && (
            <p role="alert" className="text-sm text-cream-bright">
              {error}
            </p>
          )}

          {preferences && (
            <>
              <Field
                label="Default target role"
                hint="Used to pre-fill new sessions."
                htmlFor="role"
              >
                <select
                  id="role"
                  value={preferences.defaultRole}
                  onChange={(event) => update({ defaultRole: event.target.value })}
                  className="focus-ring rounded-xl border border-line bg-surface-card px-4 py-2.5 text-sm text-cream-bright"
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Default sector"
                hint="Sets which companies the setup screen offers, and the numbers the interviewer asks for."
                htmlFor="sector"
              >
                <select
                  id="sector"
                  value={preferences.defaultSector}
                  onChange={(event) => update({ defaultSector: event.target.value })}
                  className="focus-ring rounded-xl border border-line bg-surface-card px-4 py-2.5 text-sm text-cream-bright"
                >
                  <option value="">All sectors</option>
                  {sectors.map((sector) => (
                    <option key={sector.id} value={sector.id}>
                      {sector.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Default company" htmlFor="company">
                <select
                  id="company"
                  value={preferences.defaultCompany}
                  onChange={(event) =>
                    update({ defaultCompany: event.target.value })
                  }
                  className="focus-ring rounded-xl border border-line bg-surface-card px-4 py-2.5 text-sm text-cream-bright"
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
                label="Default mode"
                hint="Real mode withholds coaching until the report, the way an actual interview does. It is worth more XP."
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
                  className="focus-ring rounded-xl border border-line bg-surface-card px-4 py-2.5 text-sm text-cream-bright"
                >
                  <option value="practice">Practice — coaching as you go</option>
                  <option value="real">Real — no coaching until the end</option>
                </select>
              </Field>

              <Field
                label={`Interview length — ${preferences.interviewLength} turns`}
                hint="Shorter sessions give the evaluator less to judge, so scores are less reliable."
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
                  className="focus-ring accent-cream"
                />
              </Field>

              <div className="flex items-center gap-4">
                <Action
                  className="self-start"
                  onClick={() => void save()}
                  disabled={status === "saving"}
                >
                  {status === "saving" ? "Saving…" : "Save"}
                </Action>
                {status === "saved" && (
                  <span role="status" className="text-xs text-cream-dim">
                    Saved
                  </span>
                )}
              </div>
            </>
          )}
        </Panel>

        <Billing />

        <Panel variant="glass" className="mt-4 max-w-2xl p-6">
          <Eyebrow>Account</Eyebrow>
          {session?.kind === "user" ? (
            <div className="mt-3 flex flex-col gap-4">
              <p className="text-sm text-cream-dim">
                Signed in as{" "}
                <span className="text-cream-bright">{session.email}</span>. Your
                history follows the account, on any device.
              </p>
              {session.emailVerified === false && (
                <div className="flex flex-col gap-3 border-t border-line pt-4">
                  <p className="text-sm text-cream-dim">
                    This address is not confirmed yet. Until it is, we cannot
                    send you a password reset — so you would lose the account if
                    you forgot the password.
                  </p>
                  <Action
                    tone="glass"
                    className="self-start"
                    disabled={resent}
                    onClick={() => {
                      void resendVerification().then(() => setResent(true));
                    }}
                  >
                    {resent ? "Sent — check your inbox" : "Resend confirmation"}
                  </Action>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 flex flex-col gap-4">
              <p className="text-sm text-cream-dim">
                You are practising as a guest. Your progress, badges and
                settings live in this browser only — clearing cookies loses
                them. Signing up carries everything across.
              </p>
              <Link to="/signin">
                <Action tone="glass" className="self-start">
                  Save my progress
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
