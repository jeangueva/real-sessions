import { useEffect, useState } from "react";
import { Building2, Copy, Crown, Users, Wallet } from "lucide-react";
import { Action, Panel } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { ApiError, becomeAdvisor, buyDefensePack, fetchAdvisor, saveAffiliatePayout, syncDefensePack } from "@/lib/api";
import type { PayoutMethod } from "@/lib/api";
import type { AdvisorDashboard } from "@/lib/api";
import { useThesisT } from "@/lib/thesis-copy";
import { useLocale } from "@/hooks/useLocale";

/**
 * The advisor's side: their code, their students' progress, their earnings.
 *
 * Built for someone checking on eight tesistas between classes: who has a date
 * coming, who has rehearsed, who is getting better — one row each.
 */
export function Advisor() {
  const t = useThesisT();
  const { locale } = useLocale();
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
    // Back from paying for Asesor Pro: settle it here, then forget the query.
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("payment_id") ?? params.get("collection_id");
    if (paymentId && /^\d+$/.test(paymentId)) {
      syncDefensePack(paymentId)
        .then(() => load())
        .catch(() => undefined)
        .finally(() => window.history.replaceState(null, "", window.location.pathname));
    }
  }, []);

  const [buying, setBuying] = useState(false);
  const buyPro = async () => {
    setBuying(true);
    setError(null);
    try {
      window.location.assign((await buyDefensePack("asesor_pro")).initPoint);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("error"));
      setBuying(false);
    }
  };

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

        {data?.cohort && <Cohort cohort={data.cohort} />}

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

            {data.pro && (
              <Panel className="flex flex-col gap-3 p-6 sm:p-8">
                <h2 className="flex items-center gap-2 text-base font-semibold text-cream-bright">
                  <Crown aria-hidden className="h-5 w-5 text-premium" />
                  {t("proTitle")}
                </h2>
                <p className="text-sm text-cream-dim">
                  {t("proBody", { seats: data.pro.seats, credits: data.pro.creditsPerStudent })}
                </p>
                {data.pro.active && data.pro.expiresAt ? (
                  <p className="rounded-xl bg-grow-soft px-3 py-2 text-sm text-grow-text">
                    {t("proActive", {
                      date: new Date(data.pro.expiresAt).toLocaleDateString(),
                      used: data.pro.used,
                      seats: data.pro.seats,
                    })}
                  </p>
                ) : (
                  <div>
                    <Action withArrow disabled={buying} onClick={() => void buyPro()}>
                      {t("proBuy", { price: money(data.pro.amount, data.pro.currency) })}
                    </Action>
                  </div>
                )}
              </Panel>
            )}

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
                <StudentList students={data.students!} />
              )}
            </Panel>

            {data.commissions && (
              <Panel className="flex flex-col gap-3 p-6 sm:p-8">
                <h2 className="flex items-center gap-2 text-base font-semibold text-cream-bright">
                  <Wallet aria-hidden className="h-5 w-5 text-accent-text" />
                  {t("advisorEarnings")}
                </h2>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-cream-dim">{t("advisorHeld")}</dt>
                    <dd className="text-xl font-bold tabular-nums text-cream-dim">
                      {money(data.commissions.held ?? 0, data.commissions.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-cream-dim">{t("advisorPending")}</dt>
                    <dd className={`text-xl font-bold tabular-nums ${data.commissions.payable ? "text-grow-text" : "text-cream-bright"}`}>
                      {money(data.commissions.available ?? data.commissions.pending, data.commissions.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-cream-dim">{t("advisorPaid")}</dt>
                    <dd className="text-xl font-bold tabular-nums text-cream-bright">{money(data.commissions.paid, data.commissions.currency)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-cream-dim">{t("advisorSales", { count: data.commissions.count })}</dt>
                    <dd className="text-xl font-bold text-cream-bright">{Math.round(data.commissions.rate * 100)}%</dd>
                  </div>
                </dl>
                <p className="text-xs text-cream-dim">
                  {t("advisorPayout", {
                    days: data.commissions.holdDays ?? 7,
                    date: data.commissions.nextPayout
                      ? new Date(`${data.commissions.nextPayout}T12:00:00`).toLocaleDateString(locale, { day: "numeric", month: "long" })
                      : "10",
                    min: money(data.commissions.minimum ?? 50, data.commissions.currency),
                  })}
                </p>
              </Panel>
            )}

            <PayoutCard
              saved={data.advisor.payout ?? null}
              onSaved={(payout) => setData((current) => (current?.advisor ? { ...current, advisor: { ...current.advisor, payout } } : current))}
            />
          </>
        )}
      </PageBody>
    </>
  );
}

type Student = NonNullable<AdvisorDashboard["students"]>[number];

/** One row per student: who, which thesis, how many rehearsals, first and latest score, when. */
function StudentList({ students }: { students: Student[] }) {
  const t = useThesisT();
  return (
    <ul className="flex flex-col gap-2">
      {students.map((student, index) => (
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
  );
}

/** A school's coordinator: the cohort, its seats and the code to hand out. */
function Cohort({ cohort }: { cohort: NonNullable<AdvisorDashboard["cohort"]> }) {
  const t = useThesisT();
  return (
    <Panel variant="raised" className="flex flex-col gap-3 p-6 sm:p-8">
      <h2 className="flex items-center gap-2 text-base font-semibold text-cream-bright">
        <Building2 aria-hidden className="h-5 w-5 text-accent-text" />
        {t("cohortTitle", { name: cohort.name })}
      </h2>
      <p className="text-xs text-cream-dim">
        {t("cohortMeta", {
          code: cohort.code,
          count: cohort.students.length,
          seats: cohort.seats,
          credits: cohort.creditsPerStudent,
          date: new Date(cohort.expiresAt).toLocaleDateString(),
        })}
      </p>
      {cohort.students.length > 0 && <StudentList students={cohort.students} />}
    </Panel>
  );
}

const METHODS: { id: PayoutMethod; key: "payoutYape" | "payoutPlin" | "payoutTransfer" | "payoutPaypal" }[] = [
  { id: "yape", key: "payoutYape" },
  { id: "plin", key: "payoutPlin" },
  { id: "transferencia", key: "payoutTransfer" },
  { id: "paypal", key: "payoutPaypal" },
];

/**
 * Where an affiliate's commissions go. Paid by hand from the admin, which
 * shows this line beside what is owed.
 */
function PayoutCard({
  saved,
  onSaved,
}: {
  saved: { method: PayoutMethod; account: string; holder: string } | null;
  onSaved: (payout: { method: PayoutMethod; account: string; holder: string }) => void;
}) {
  const t = useThesisT();
  const [method, setMethod] = useState<PayoutMethod>(saved?.method ?? "yape");
  const [account, setAccount] = useState(saved?.account ?? "");
  const [holder, setHolder] = useState(saved?.holder ?? "");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const field = "field-control text-sm text-cream-bright";
  const label = "flex min-w-0 flex-col gap-1 text-xs font-semibold text-cream-dim";

  const save = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await saveAffiliatePayout({ method, account, holder });
      onSaved(result.payout);
      setNotice(t("payoutSaved"));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel className="flex flex-col gap-4 p-6 sm:p-8">
      <h2 className="text-base font-semibold text-cream-bright">{t("payoutTitle")}</h2>
      {saved && (
        <p className="text-sm text-cream-dim">
          {t("payoutCurrent", { method: t(METHODS.find((entry) => entry.id === saved.method)?.key ?? "payoutYape"), account: saved.account })}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={label}>
          {t("payoutMethod")}
          <select value={method} onChange={(event) => setMethod(event.target.value as PayoutMethod)} className={field}>
            {METHODS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {t(entry.key)}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          {t("payoutHolder")}
          <input value={holder} onChange={(event) => setHolder(event.target.value)} maxLength={120} autoComplete="name" className={field} />
        </label>
        <label className={`${label} sm:col-span-2`}>
          {t("payoutAccount")}
          <input value={account} onChange={(event) => setAccount(event.target.value)} maxLength={120} className={field} />
          <span className="font-normal">{t("payoutAccountHint")}</span>
        </label>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-step-soft px-3 py-2 text-sm text-step-text">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Action tone="neutral" disabled={busy || account.trim().length < 4 || holder.trim().length < 3} onClick={() => void save()}>
          {t("payoutSave")}
        </Action>
        {notice && <span className="text-sm text-grow-text">{notice}</span>}
      </div>
    </Panel>
  );
}
