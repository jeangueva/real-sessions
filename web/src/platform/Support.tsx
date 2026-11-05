import { useEffect, useState } from "react";
import { Badge, MonoLabel, Field, Notice, Panel } from "@/design-system";
import { useLocale } from "@/hooks/useLocale";

const COPY = {
  en: {
    eyebrow: "Optional support",
    badge: "100% free platform",
    title: "Free for everyone. Supported by choice.",
    body: "All features in Education and Professional are 100% free. Voluntary contributions never unlock extra features, priority or gated modes.",
    amountLegend: "Suggested amount (USD)",
    customBtn: "Custom",
    customLabel: "Custom amount (USD)",
    freqLegend: "Frequency",
    oneTime: "One-time",
    monthly: "Monthly",
    prefValid: (val: string, freq: string) =>
      `Your preference: USD ${val} (${freq}). Choose this amount and frequency on the external support page.`,
    prefInvalid: "Enter a positive amount with up to two decimal places.",
    providerNote: "Selections here are a reference reminder and are not sent automatically to the payment provider.",
    openLink: "Open support page ↗",
    unconfigured: "Support link is not set up yet. Every feature remains 100% free.",
    checking: "Checking support availability…",
  },
  es: {
    eyebrow: "Apoyo voluntario",
    badge: "Plataforma 100% gratuita",
    title: "Gratis para todos. Apoyado por elección.",
    body: "Todas las herramientas de Educación y Profesional son 100% gratuitas. Apoyar es opcional y nunca desbloquea funciones extra, prioridad ni ventajas.",
    amountLegend: "Monto sugerido (USD)",
    customBtn: "Custom",
    customLabel: "Monto personalizado (USD)",
    freqLegend: "Modalidad de apoyo",
    oneTime: "Aporte único (a demanda)",
    monthly: "Suscripción mensual",
    prefValid: (val: string, freq: string) =>
      `Tu preferencia: USD ${val} (${freq === "monthly" ? "mensual" : "aporte único"}). Elige este monto y modalidad al abrir la página de apoyo.`,
    prefInvalid: "Ingresa un monto positivo con hasta dos decimales.",
    providerNote: "Esta selección sirve como referencia rápida y no genera cobros automáticos.",
    openLink: "Abrir página de apoyo ↗",
    unconfigured: "El enlace de apoyo aún no está configurado. Todo sigue siendo 100% gratuito.",
    checking: "Verificando disponibilidad de apoyo…",
  },
  pt: {
    eyebrow: "Apoio voluntário",
    badge: "Plataforma 100% gratuita",
    title: "Grátis para todos. Apoiado por escolha.",
    body: "Todas as ferramentas de Educação e Profissional são 100% gratuitas. Apoiar é opcional e nunca desbloqueia recursos extras nem prioridade.",
    amountLegend: "Valor sugerido (USD)",
    customBtn: "Custom",
    customLabel: "Valor personalizado (USD)",
    freqLegend: "Frequência",
    oneTime: "Apoio único",
    monthly: "Assinatura mensal",
    prefValid: (val: string, freq: string) =>
      `Sua preferência: USD ${val} (${freq === "monthly" ? "mensal" : "apoio único"}). Escolha este valor na página de apoio.`,
    prefInvalid: "Digite um valor positivo com até duas casas decimais.",
    providerNote: "Esta seleção é apenas uma referência e não inicia cobranças automáticas.",
    openLink: "Abrir página de apoio ↗",
    unconfigured: "O link de apoio ainda não está configurado. Tudo continua 100% gratuito.",
    checking: "Verificando disponibilidade de apoio…",
  },
} as const;

/** A preference reminder, not a checkout: the provider confirms the payment. */
export function Support() {
  const { locale } = useLocale();
  const c = locale === "es" ? COPY.es : locale === "pt" ? COPY.pt : COPY.en;
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [amount, setAmount] = useState("5");
  const [custom, setCustom] = useState("");
  const [frequency, setFrequency] = useState<"one-time" | "monthly">("one-time");

  useEffect(() => {
    let mounted = true;
    fetch("/api/support")
      .then(async (response) => {
        if (!response.ok) throw new Error("Support unavailable");
        const config = (await response.json()) as { url?: string | null };
        if (config.url) {
          const target = new URL(config.url);
          if (mounted && target.protocol === "https:" && !target.username && !target.password) {
            setUrl(target.href);
          }
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setLoaded(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selected = amount === "custom" ? custom : amount;
  const valid =
    /^\d+(\.\d{1,2})?$/.test(selected) &&
    Number(selected) > 0 &&
    Number.isFinite(Number(selected));

  return (
    <Panel variant="raised" className="mt-4 max-w-3xl p-6 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MonoLabel>{c.eyebrow}</MonoLabel>
        <Badge tone="live">{c.badge}</Badge>
      </div>

      <h3 className="mt-3 text-2xl font-light tracking-[-0.03em] text-cream-bright sm:text-3xl">
        {c.title}
      </h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-cream-dim">{c.body}</p>

      <div className="mt-6 grid gap-5 rounded-2xl bg-surface-lift p-4 sm:p-5 md:grid-cols-[1.3fr_1fr]">
        <fieldset>
          <legend className="mb-2.5 font-mono text-xs font-medium uppercase tracking-[0.06em] text-cream-dim">
            {c.amountLegend}
          </legend>
          <div className="flex flex-wrap gap-2">
            {["1", "2", "5", "8", "10", "custom"].map((value) => {
              const active = amount === value;
              return (
                <button
                  type="button"
                  key={value}
                  aria-pressed={active}
                  onClick={() => setAmount(value)}
                  className={`focus-ring rounded-full px-4 py-2 font-mono text-sm font-semibold transition-[background-color,color,transform] duration-150 ease-press active:scale-[0.97] ${
                    active
                      ? "bg-accent text-accent-ink"
                      : "bg-surface-card text-cream-bright ring-1 ring-[color:var(--line)] hover:bg-surface-base"
                  }`}
                >
                  {value === "custom" ? c.customBtn : `$${value}`}
                </button>
              );
            })}
          </div>

          {amount === "custom" && (
            <Field label={c.customLabel} htmlFor="support-custom-amount" className="mt-4 max-w-xs">
              <input
                id="support-custom-amount"
                className="focus-ring rounded-xl border border-line bg-surface-card px-3.5 py-2 text-sm text-cream-bright"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                placeholder="3.00"
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
              />
            </Field>
          )}
        </fieldset>

        <fieldset>
          <legend className="mb-2.5 font-mono text-xs font-medium uppercase tracking-[0.06em] text-cream-dim">
            {c.freqLegend}
          </legend>
          <div className="flex flex-col gap-2">
            {(["one-time", "monthly"] as const).map((value) => {
              const checked = frequency === value;
              return (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition-colors ${
                    checked
                      ? "bg-surface-card font-semibold text-cream-bright ring-1 ring-[color:var(--line)]"
                      : "text-cream-dim hover:bg-surface-card/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="support-frequency"
                    value={value}
                    checked={checked}
                    onChange={() => setFrequency(value)}
                  />
                  <span>{value === "monthly" ? c.monthly : c.oneTime}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-cream-dim">
        {valid ? c.prefValid(Number(selected).toFixed(2), frequency) : c.prefInvalid}{" "}
        {c.providerNote}
      </p>

      {url && valid ? (
        <div className="mt-5">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-ring inline-flex select-none items-center justify-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-ink transition-[transform,filter] duration-150 ease-press hover:brightness-105 active:scale-[0.97]"
          >
            {c.openLink}
          </a>
        </div>
      ) : (
        !url && (
          <Notice tone="info" className="mt-4">
            {loaded ? c.unconfigured : c.checking}
          </Notice>
        )
      )}
    </Panel>
  );
}
