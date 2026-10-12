import { useEffect, useState } from "react";
import { Copy, Users, Wallet } from "lucide-react";
import { Action, Panel } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { ApiError, becomeAdvisor, fetchAdvisor } from "@/lib/api";
import type { AdvisorDashboard } from "@/lib/api";
import { useThesisT } from "@/lib/thesis-copy";

/**
 * The advisor's side: their code, their students' progress, their earnings.
 *
 * Built for someone checking on eight tesistas between classes: who has a date
 * coming, who has rehearsed, who is getting better — one row each.
 */
export function Advisor() {
  const t = useThesisT();
  const [data, setData] = useState<AdvisorDashboard | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = () =>
    fetchAdvisor()
      .then(setData)
      .catch((caught) => setError(caught instanceof ApiError ? caught.message : t("error")));
  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setError(null);
    try {
      await becomeAdvisor(name);
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("error"));
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Nothing to do: the text is on screen to copy by hand.
    }
  };

  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat(currency === "PEN" ? "es-PE" : undefined, { style: "currency", currency }).format(amount);

  return (
    <>
      <PageHeader title={t("advisorPageTitle")} meta={t("advisorPageMeta")} />
      <PageBody className="mx-auto flex max-w-3xl flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-2xl bg-step-soft px-4 py-3 text-sm text-step-text">
            {error}
          </p>
        )}

        {data && !data.advisor && (
          <Panel variant="raised" className="flex flex-col gap-4 p-6 sm:p-8">
            <p className="max-w-prose text-sm text-cream-dim">{t("advisorHow")}</p>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("advisorName")}
              maxLength={80}
              className="focus-ring rounded-2xl bg-surface-lift px-4 py-3 text-base text-cream-bright placeholder:text-cream-faint"
            />
            <div>
              <Action withArrow onClick={() => void create()} disabled={name.trim().length < 3}>
                {t("advisorCreate")}
              </Action>
            </div>
          </Panel>
        )}

        {data?.advisor && (
          <>
            <Panel variant="raised" className="flex flex-col gap-4 p-6 sm:p-8">
              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-xs font-semibold text-cream-dim">{t("advisorYourCode")}</span>
                <span className="font-mono text-3xl font-bold tracking-widest text-cream-bright">{data.advisor.code}</span>
              </div>
              {data.link && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-cream-dim">{t("advisorYourLink")}</span>
                  <code className="min-w-0 break-all rounded-xl bg-surface-lift px-3 py-2 text-sm text-cream-bright">{data.link}</code>
                  <button
                    type="button"
                    onClick={() => void copy(data.link!)}
                    className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-surface-card px-3 py-1.5 text-xs font-semibold text-cream-bright shadow-card active:scale-[0.97]"
                  >
                    <Copy aria-hidden className="h-3.5 w-3.5" />
                    {copied ? t("advisorCopied") : t("advisorCopy")}
                  </button>
                </div>
              )}
              <p className="max-w-prose text-sm text-cream-dim">{t("advisorHow")}</p>
            </Panel>

            <Panel className="flex flex-col gap-3 p-6 sm:p-8">
              <h2 className="flex items-center gap-2 text-base font-semibold text-cream-bright">
                <Users aria-hidden className="h-5 w-5 text-accent-text" />
                {t("advisorStudents")}
              </h2>
              <p className="text-xs text-cream-dim">
                {t("advisorLinkedCount", { count: data.linked ?? 0, shared: data.students?.length ?? 0 })}
              </p>
              {(data.students?.length ?? 0) === 0 ? (
                <p className="text-sm text-cream-dim">{t("advisorNoStudents")}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.students!.map((student, index) => (
                    <li key={index} className="rounded-2xl bg-surface-lift p-4">
                      <p className="text-sm font-semibold text-cream-bright">
                        {student.name ?? "—"}
                        {student.thesis && <span className="font-normal text-cream-dim"> · {student.thesis}</span>}
                      </p>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-cream-dim">
                        <span>{t("advisorRehearsals", { count: student.rehearsals })}</span>
                        {student.firstScore !== null && student.lastScore !== null && (
                          <span>{t("advisorScore", { first: student.firstScore, last: student.lastScore })}</span>
                        )}
                        {student.defenseDate && <span>{t("advisorDefense", { date: student.defenseDate })}</span>}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            {data.commissions && (
              <Panel className="flex flex-col gap-3 p-6 sm:p-8">
                <h2 className="flex items-center gap-2 text-base font-semibold text-cream-bright">
                  <Wallet aria-hidden className="h-5 w-5 text-accent-text" />
                  {t("advisorEarnings")}
                </h2>
                <dl className="grid grid-cols-3 gap-3">
                  <div>
                    <dt className="text-xs text-cream-dim">{t("advisorPending")}</dt>
                    <dd className="text-xl font-bold text-cream-bright">{money(data.commissions.pending, data.commissions.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-cream-dim">{t("advisorPaid")}</dt>
                    <dd className="text-xl font-bold text-cream-bright">{money(data.commissions.paid, data.commissions.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-cream-dim">{t("advisorSales", { count: data.commissions.count })}</dt>
                    <dd className="text-xl font-bold text-cream-bright">{Math.round(data.commissions.rate * 100)}%</dd>
                  </div>
                </dl>
                <p className="text-xs text-cream-dim">{t("advisorPayout")}</p>
              </Panel>
            )}
          </>
        )}
      </PageBody>
    </>
  );
}
