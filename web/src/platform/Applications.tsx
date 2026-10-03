import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Action, Eyebrow, FadeRise, Panel } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { useT } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n";
import {
  APPLICATION_STATUSES,
  ApiError,
  createApplication,
  deleteApplication,
  fetchApplications,
  fetchPlan,
  updateApplication,
  type ApplicationStatus,
  type ApplicationSummary,
} from "@/lib/api";

/**
 * The jobs somebody is actually going after.
 *
 * Kept deliberately thin, and that is the design rather than an unfinished
 * version of something larger. Every field this grows — a note, a contact, a
 * reminder date, a salary — moves it closer to being a worse version of the
 * spreadsheet the candidate already keeps, and that is a competition it loses.
 *
 * What it has that a spreadsheet cannot: the posting, and the rehearsals
 * attached to it. A row here says "you have practised for this three times and
 * your best was 71", which is the only sentence on this screen a spreadsheet
 * could not hold.
 *
 * So the status is changed in the row itself. An edit screen for a single
 * dropdown is a screen somebody has to go into and come back from to say the
 * thing they already decided before they opened the page.
 */

/** The label for each state, so the order lives with the copy. */
const STATUS_KEY: Record<ApplicationStatus, MessageKey> = {
  interested: "apps.interested",
  applied: "apps.applied",
  interviewing: "apps.interviewing",
  offer: "apps.offer",
  rejected: "apps.rejected",
};

export function Applications() {
  const t = useT();
  const [rows, setRows] = useState<ApplicationSummary[] | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const read = () =>
    fetchApplications()
      .then((result) => setRows(result.applications))
      .catch((caught: unknown) => {
        // 402 is not an error to report: it is the plan, and the paywall
        // below says it better than an alert would.
        if (caught instanceof ApiError && caught.status === 402) {
          setRows([]);
          return;
        }
        setError(caught instanceof ApiError ? caught.message : "Could not load your applications.");
      });

  useEffect(() => {
    fetchPlan()
      .then((result) => {
        setAllowed(result.capabilities.trackApplications);
        if (result.capabilities.trackApplications) void read();
        else setRows([]);
      })
      .catch(() => setAllowed(false));
  }, []);

  const move = async (id: string, status: ApplicationStatus) => {
    // Moved on screen first. The dropdown has to feel like a dropdown, and a
    // round trip before the label changes makes it feel like a form.
    setRows((held) =>
      (held ?? []).map((row) => (row.id === id ? { ...row, status } : row)),
    );
    await updateApplication(id, { status }).catch(() => void read());
  };

  const remove = async (id: string) => {
    setRows((held) => (held ?? []).filter((row) => row.id !== id));
    await deleteApplication(id).catch(() => void read());
  };

  if (allowed === false) {
    return (
      <>
        <PageHeader title={t("apps.title")} meta={t("apps.meta")} />
        <PageBody>
          <Panel variant="raised" className="flex max-w-xl flex-col gap-4 p-6">
            <p className="text-sm leading-relaxed text-cream-bright">{t("apps.paid")}</p>
            <p className="text-xs text-cream-dim">{t("apps.paidWhy")}</p>
            <Link to="/app/settings#plan" className="self-start">
              <Action>{t("apps.seePlans")}</Action>
            </Link>
          </Panel>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t("apps.title")}
        meta={
          rows === null
            ? t("apps.loading")
            : rows.length === 0
              ? t("apps.none")
              : t("apps.count", { count: String(rows.length) })
        }
        actions={
          <Action tone="glass" onClick={() => setAdding((held) => !held)}>
            {adding ? t("apps.cancel") : t("apps.add")}
          </Action>
        }
      />

      <PageBody className="flex flex-col gap-4">
        {error && (
          <Panel variant="glass" className="max-w-2xl p-6">
            <p role="alert" className="text-sm text-cream-bright">
              {error}
            </p>
          </Panel>
        )}

        {adding && (
          <AddApplication
            onAdded={() => {
              setAdding(false);
              void read();
            }}
          />
        )}

        {rows !== null && rows.length === 0 && !adding && (
          <Panel variant="raised" className="flex max-w-xl flex-col gap-3 p-6">
            <p className="text-sm text-cream-bright">{t("apps.emptyTitle")}</p>
            {/* What it is for, said once, where somebody with no rows is
                looking. The value is the posting and the rehearsals, not the
                list itself. */}
            <p className="text-sm leading-relaxed text-cream-dim">{t("apps.emptyBody")}</p>
            <Action className="self-start" onClick={() => setAdding(true)}>
              {t("apps.add")}
            </Action>
          </Panel>
        )}

        {(rows ?? []).map((row, index) => (
          <FadeRise key={row.id} delay={Math.min(index, 4) * 0.05}>
            <Panel className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="truncate text-sm text-cream-bright">
                  {row.role} · {row.company}
                </p>
                <p className="text-xs text-cream-faint">
                  {row.sessions === 0
                    ? t("apps.noPractice")
                    : t("apps.practice", {
                        count: String(row.sessions),
                        // Dashed rather than zero: nothing scored yet is not
                        // the same statement as a score of nought.
                        best: row.bestScore === null ? "—" : `${row.bestScore}%`,
                      })}
                  {row.posting ? ` · ${t("apps.hasPosting")}` : ""}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`status-${row.id}`}>
                  {t("apps.status")}
                </label>
                <select
                  id={`status-${row.id}`}
                  value={row.status}
                  onChange={(event) => void move(row.id, event.target.value as ApplicationStatus)}
                  className="focus-ring rounded-xl border border-line bg-surface-card px-3 py-2 text-xs text-cream-bright"
                >
                  {APPLICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {t(STATUS_KEY[status])}
                    </option>
                  ))}
                </select>

                {/* The point of the row. Carries the id, so the setup screen
                    can take the company, the role and the posting from it. */}
                <Link
                  to="/app"
                  state={{ applicationId: row.id, company: row.company, role: row.role }}
                >
                  <Action tone="glass">{t("apps.practise")}</Action>
                </Link>

                <button
                  type="button"
                  onClick={() => void remove(row.id)}
                  className="focus-ring rounded-lg px-2 py-1 text-xs text-cream-faint underline underline-offset-4 hover:text-cream-bright"
                >
                  {t("apps.remove")}
                </button>
              </div>
            </Panel>
          </FadeRise>
        ))}
      </PageBody>
    </>
  );
}

/**
 * Adding one. Two fields and the advertisement.
 *
 * The posting is a textarea here rather than on the setup screen, because this
 * is where it belongs: pasted once, against the job, and read by every
 * rehearsal after it.
 */
function AddApplication({ onAdded }: { onAdded: () => void }) {
  const t = useT();
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [posting, setPosting] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (company.trim() === "" || role.trim() === "") return;
    setSaving(true);
    try {
      await createApplication({
        company: company.trim(),
        role: role.trim(),
        ...(posting.trim() === "" ? {} : { posting: posting.trim() }),
      });
      onAdded();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel variant="raised" className="flex max-w-2xl flex-col gap-4 p-6">
      <Eyebrow>{t("apps.add")}</Eyebrow>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Field label={t("apps.company")} value={company} onChange={setCompany} />
        <Field label={t("apps.role")} value={role} onChange={setRole} />
      </div>
      <label className="flex flex-col gap-1 text-xs text-cream-faint">
        {t("apps.posting")}
        <textarea
          value={posting}
          onChange={(event) => setPosting(event.target.value.slice(0, 4000))}
          rows={5}
          placeholder={t("apps.postingPlaceholder")}
          className="focus-ring resize-y rounded-xl border border-line-strong bg-transparent px-4 py-3 text-sm text-cream-bright placeholder:text-cream-faint"
        />
      </label>
      <Action
        className="self-start"
        onClick={() => void save()}
        disabled={saving || company.trim() === "" || role.trim() === ""}
      >
        {t("apps.save")}
      </Action>
    </Panel>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-1 flex-col gap-1 text-xs text-cream-faint">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, 120))}
        className="focus-ring rounded-xl border border-line-strong bg-transparent px-4 py-2.5 text-sm text-cream-bright"
      />
    </label>
  );
}
