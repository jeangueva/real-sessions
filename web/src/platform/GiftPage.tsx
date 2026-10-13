import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Gift } from "lucide-react";
import { Action } from "@/design-system";
import { AuthLayout } from "./AuthLayout";
import { ApiError, fetchGift, payGift, syncGift, type GiftInfo, type PackKind } from "@/lib/api";
import { useThesisT, type ThesisKey } from "@/lib/thesis-copy";
import { useLocale } from "@/hooks/useLocale";

const OFFER: Partial<Record<PackKind, { name: ThesisKey; body: ThesisKey }>> = {
  sustentacion: { name: "offerSustentacion", body: "offerSustentacionBody" },
  intensivo: { name: "offerIntensivo", body: "offerIntensivoBody" },
  docente: { name: "offerDocente", body: "offerDocenteBody" },
};

/**
 * Where a parent, a partner or a friend pays for a student's plan.
 *
 * Reached from a link the student sent, by someone with no account and no
 * reason to make one. It says whose request this is — a first name and a
 * thesis title, nothing more — and takes them straight to the payment. The
 * plan lands on the student's account; the payer leaves an email only for
 * the receipt.
 */
export function GiftPage() {
  const t = useThesisT();
  const { locale } = useLocale();
  const { token = "" } = useParams();
  const [gift, setGift] = useState<GiftInfo | null | undefined>(undefined);
  const [kind, setKind] = useState<PackKind>("sustentacion");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<"granted" | "already" | "not-yet" | null>(null);

  useEffect(() => {
    fetchGift(token)
      .then(setGift)
      .catch(() => setGift(null));
    // Back from Mercado Pago: settled here rather than waiting on the webhook.
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get("payment_id") ?? params.get("collection_id");
    if (paymentId && /^\d+$/.test(paymentId)) {
      syncGift(token, paymentId)
        .then((result) => setOutcome(result.outcome))
        .catch(() => setOutcome("not-yet"))
        .finally(() => window.history.replaceState(null, "", window.location.pathname));
    }
  }, [token]);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      window.location.assign((await payGift(token, kind, email)).initPoint);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("error"));
      setBusy(false);
    }
  };

  const money = (amount: number, currency: string) =>
    new Intl.NumberFormat(currency === "PEN" ? "es-PE" : undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);

  return (
    <AuthLayout>
      {gift === undefined ? (
        <p aria-busy="true" className="text-sm text-cream-dim">
          …
        </p>
      ) : gift === null ? (
        <p className="text-base text-cream">{t("giftPageMissing")}</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text">
              <Gift aria-hidden className="h-[1.125rem] w-[1.125rem]" />
            </span>
            <h1 className="text-balance text-xl font-semibold leading-snug text-cream-bright">
              {gift.name ? t("giftPageTitle", { name: gift.name }) : t("giftPageTitleAnon")}
            </h1>
          </div>
          <p className="text-pretty text-sm leading-relaxed text-cream-dim">{t("giftPageBody")}</p>
          {gift.thesis && (
            <div className="rounded-2xl bg-surface-lift px-4 py-3">
              <p className="text-xs font-semibold text-cream-dim">{t("giftPageThesis")}</p>
              <p className="mt-0.5 text-sm text-cream-bright">{gift.thesis}</p>
              {gift.defenseDate && (
                <p className="mt-1 text-xs text-cream-dim">
                  {t("giftPageDate", {
                    date: new Date(`${gift.defenseDate}T12:00:00`).toLocaleDateString(locale, { dateStyle: "long" }),
                  })}
                </p>
              )}
            </div>
          )}

          {outcome ? (
            <p className="rounded-xl bg-grow-soft px-3 py-2 text-sm text-grow-text">
              {outcome === "not-yet" ? t("giftPagePending") : t("giftPageThanks")}
            </p>
          ) : !gift.available ? (
            <p className="text-sm text-cream-dim">{t("giftPageOff")}</p>
          ) : (
            <>
              <div role="radiogroup" className="flex flex-col gap-2">
                {gift.offers.map((offer) => {
                  const copy = OFFER[offer.kind];
                  if (!copy) return null;
                  const chosen = kind === offer.kind;
                  return (
                    <button
                      key={offer.kind}
                      type="button"
                      role="radio"
                      aria-checked={chosen}
                      onClick={() => setKind(offer.kind)}
                      className={`focus-ring flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-[background-color,box-shadow,transform] duration-150 ease-press active:scale-[0.98] ${
                        chosen ? "bg-surface-card shadow-card ring-2 ring-accent" : "bg-surface-lift"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-cream-bright">{t(copy.name)}</span>
                        <span className="block text-xs text-cream-dim">{t(copy.body)}</span>
                      </span>
                      <span className="shrink-0 text-base font-bold tabular-nums text-cream-bright">
                        {money(offer.amount, offer.currency)}
                      </span>
                    </button>
                  );
                })}
              </div>
              <label className="flex flex-col gap-1 text-xs font-semibold text-cream-dim">
                {t("giftPageEmail")}
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="focus-ring w-full rounded-xl bg-surface-lift px-3 py-2.5 text-sm text-cream-bright"
                />
              </label>
              {error && (
                <p role="alert" className="rounded-xl bg-step-soft px-3 py-2 text-sm text-step-text">
                  {error}
                </p>
              )}
              <Action withArrow disabled={busy || !/^\S+@\S+\.\S+$/.test(email)} onClick={() => void pay()}>
                {t("giftPagePay")}
              </Action>
              <p className="text-xs text-cream-dim">{t("giftPageSecure")}</p>
            </>
          )}
        </div>
      )}
    </AuthLayout>
  );
}
