import { useEffect, useState } from "react";
import { Action, Badge, Eyebrow, Notice, Panel } from "@/design-system";
import { Inset } from "@/components/marketing";
import { ApiError, cancelSubscription, fetchBilling, reconcileBilling } from "@/lib/api";
import type { BillingState } from "@/lib/api";
import { formatSessionDate } from "@/lib/format";
import { Support } from "./Support";
import { useLocale } from "@/hooks/useLocale";

const COPY = {
  es: {
    loadError: "No pudimos cargar tu suscripción. Inténtalo de nuevo.",
    refreshError: "No pudimos consultar al proveedor. Te mostramos el último estado guardado.",
    cancelError: "No se pudo cancelar. Inténtalo de nuevo.",
    title: "Tu suscripción anterior",
    badge: "Todo es gratis",
    body: "Mockio ahora es gratis. Una suscripción que ya tenías no se cancela sola ni se convierte en aporte.",
    retry: "Volver a consultar",
    loading: "Cargando…",
    status: "Estado",
    periodEnd: "Termina el",
    renews: "Puede seguir renovándose hasta que la canceles. Cancelarla no te quita nada de la plataforma.",
    cancelling: "Cancelando…",
    cancel: "Cancelar suscripción",
    cancelled: "Cancelada. Todo sigue siendo gratis.",
  },
  pt: {
    loadError: "Não conseguimos carregar sua assinatura. Tente de novo.",
    refreshError: "Não conseguimos consultar o provedor. Mostramos o último estado salvo.",
    cancelError: "Não foi possível cancelar. Tente de novo.",
    title: "Sua assinatura anterior",
    badge: "Tudo é grátis",
    body: "O Mockio agora é grátis. Uma assinatura que você já tinha não é cancelada sozinha nem vira contribuição.",
    retry: "Consultar de novo",
    loading: "Carregando…",
    status: "Status",
    periodEnd: "Termina em",
    renews: "Ela pode continuar renovando até você cancelar. Cancelar não tira nada da plataforma.",
    cancelling: "Cancelando…",
    cancel: "Cancelar assinatura",
    cancelled: "Cancelada. Tudo continua grátis.",
  },
  en: {
    loadError: "Could not load your subscription. Please try again.",
    refreshError: "Could not reach the provider. The last saved status is shown.",
    cancelError: "Could not cancel. Please try again.",
    title: "Your earlier subscription",
    badge: "Everything is free",
    body: "Mockio is free now. A subscription you already had is not cancelled on its own or turned into a donation.",
    retry: "Check again",
    loading: "Loading…",
    status: "Status",
    periodEnd: "Ends",
    renews: "It may keep renewing until you cancel it. Cancelling takes nothing away from the platform.",
    cancelling: "Cancelling…",
    cancel: "Cancel subscription",
    cancelled: "Cancelled. Everything stays free.",
  },
};

/** Existing charges remain visible and cancellable after the free transition. */
export function Billing() {
  const { locale } = useLocale();
  const c = locale === "es" ? COPY.es : locale === "pt" ? COPY.pt : COPY.en;
  const [state, setState] = useState<BillingState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const read = () =>
    fetchBilling()
      .then(setState)
      .catch(() => setError(c.loadError));

  useEffect(() => {
    void read();
    void reconcileBilling().then(
      read,
      () =>
        setError(
          c.refreshError,
        ),
    );
  }, []);

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await cancelSubscription();
      await read();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : c.cancelError,
      );
    } finally {
      setBusy(false);
    }
  };

  const subscription = state?.subscription;

  return (
    <div id="plan" className="space-y-6">
      <Support />
      {/* Only for someone who paid before Mockio went free: everyone else
          has nothing here, and an empty card is noise. */}
      {(error || !state || subscription) && (
      <Panel variant="raised" className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Eyebrow>{c.title}</Eyebrow>
          <Badge tone="neutral">{c.badge}</Badge>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-cream-dim">
          {c.body}
        </p>

        {error && (
          <div className="mt-4 space-y-3">
            <Notice tone="error">{error}</Notice>
            <Action
              type="button"
              tone="quiet"
              onClick={() => {
                setError(null);
                void read();
              }}
            >
              {c.retry}
            </Action>
          </div>
        )}

        {!state && !error && (
          <p role="status" className="mt-4 text-sm text-cream-dim">
            {c.loading}
          </p>
        )}

        {subscription && (
          <Inset className="mt-4 space-y-3 p-4">
            <p className="text-sm font-medium text-cream-bright">
              {c.status}: {subscription.status}
              {subscription.periodEnd
                ? ` · ${c.periodEnd} ${formatSessionDate(subscription.periodEnd)}`
                : ""}
            </p>
            {subscription.status !== "cancelled" && (
              <>
                <p className="text-sm text-cream-dim">
                  {c.renews}
                </p>
                <Action
                  type="button"
                  tone="quiet"
                  disabled={busy}
                  onClick={() => void cancel()}
                >
                  {busy ? c.cancelling : c.cancel}
                </Action>
              </>
            )}
            {subscription.status === "cancelled" && (
              <p className="text-sm text-cream-dim">
                {c.cancelled}
              </p>
            )}
          </Inset>
        )}
      </Panel>
      )}
    </div>
  );
}
