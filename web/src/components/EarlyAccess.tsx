import { useEffect, useState } from "react";
import { Action, CheckItem, Eyebrow, FadeRise, Field, Panel, Section } from "@/design-system";
import { ApiError, fetchEarlyAccessState, joinEarlyAccess } from "@/lib/api";
import { useT } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n";

const SECOND = 1000;

/** Whole days, hours, minutes and seconds until `target`, never below zero. */
export function timeLeft(target: number, now: number) {
  const total = Math.max(0, Math.floor((target - now) / SECOND));
  return {
    total,
    days: Math.floor(total / 86_400),
    hours: Math.floor(total / 3_600) % 24,
    minutes: Math.floor(total / 60) % 60,
    seconds: total % 60,
  };
}

/**
 * The early-adopter list.
 *
 * Three fields, because three is what we will actually use: the address the
 * grant attaches to, the role that decides which interviews to build next, and
 * the company that tells us which employer to add. Anything more is a form
 * people abandon.
 *
 * The grant is claimed when the address is confirmed, not here — this endpoint
 * runs before anyone has an account, so all it can do is record the address
 * and wait.
 *
 * The countdown shows only when the server reports a real closing moment, and
 * the server refuses new addresses from that same moment on. Without a date the
 * section is the form it always was: an invented deadline would be worse than
 * none.
 */
export function EarlyAccess() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<{ open: boolean; closesAt: number | null } | null>(
    null,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    fetchEarlyAccessState()
      .then((result) => {
        if (cancelled) return;
        const closesAt = result.closesAt ? Date.parse(result.closesAt) : Number.NaN;
        setOffer({
          open: result.open,
          closesAt: Number.isFinite(closesAt) ? closesAt : null,
        });
      })
      // No answer means no countdown, not a closed offer: the form stays, and
      // the server still decides when someone submits it.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const counting = offer?.open === true && offer.closesAt !== null;
  useEffect(() => {
    if (!counting) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), SECOND);
    return () => window.clearInterval(timer);
  }, [counting]);

  const left = counting && offer?.closesAt != null ? timeLeft(offer.closesAt, now) : null;
  const closed = offer?.open === false || left?.total === 0;

  const units: [number, MessageKey][] = left
    ? [
        [left.days, "land.eaDays"],
        [left.hours, "land.eaHours"],
        [left.minutes, "land.eaMinutes"],
        [left.seconds, "land.eaSeconds"],
      ]
    : [];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("sending");
    setError(null);
    try {
      await joinEarlyAccess(email.trim(), role.trim(), company.trim());
      setState("done");
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : t("land.eaUnreachable"),
      );
      setState("idle");
    }
  };

  return (
    <Section id="early-access" className="bg-surface-base">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <FadeRise>
          <Eyebrow>{t("land.eaEyebrow")}</Eyebrow>
          <h2 className="mt-4 text-headline font-normal text-cream-bright">
            {t("land.eaTitle")}
          </h2>
          <p className="mt-5 max-w-xl text-sm text-cream-dim sm:text-base">
            {t("land.eaBody")}
          </p>
          {/* The offer, itemised. "Six months of the paid plan" means nothing
              to someone who has not read the pricing section — which, now that
              this sits second, is most people who see it. */}
          <dl className="mt-8 max-w-xl border-t border-line pt-6">
            <dt className="text-sm text-cream-bright">{t("land.eaWhat")}</dt>
            <dd>
              <ul className="mt-4 flex flex-col gap-3">
                <CheckItem>{t("land.eaInc1")}</CheckItem>
                <CheckItem>{t("land.eaInc2")}</CheckItem>
                <CheckItem>{t("land.eaInc3")}</CheckItem>
                <CheckItem>{t("land.eaInc4")}</CheckItem>
              </ul>
            </dd>
          </dl>

          <p className="mt-6 max-w-xl text-sm text-cream-dim">
            {t("land.eaNoCard")}
          </p>
          <p className="mt-3 max-w-xl text-xs text-cream-faint">
            {t("land.eaPrivacy")}
          </p>
        </FadeRise>

        <FadeRise delay={0.12}>
        <Panel variant="raised" className="p-6 sm:p-8">
          {state === "done" ? (
            <div role="status" className="flex flex-col gap-3">
              <p className="text-title font-normal text-cream-bright">
                {t("land.eaDone")}
              </p>
              <p className="text-sm text-cream-dim">
                {t("land.eaDonePre")}{" "}
                <span className="text-cream-bright">{email}</span>{" "}
                {t("land.eaDonePost")}
              </p>
            </div>
          ) : closed ? (
            <div role="status" className="flex flex-col gap-3">
              <p className="text-title font-normal text-cream-bright">
                {t("land.eaClosedTitle")}
              </p>
              <p className="text-sm text-cream-dim">{t("land.eaClosedBody")}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {left && (
                /* One sentence for assistive technology, which a timer does
                   not announce on every tick; the digits are for the eye. */
                <div
                  role="timer"
                  aria-label={`${t("land.eaClosesIn")} ${left.days} ${t("land.eaDays")}, ${left.hours} ${t("land.eaHours")}, ${left.minutes} ${t("land.eaMinutes")}`}
                  className="flex flex-col gap-3 border-b border-line pb-6"
                >
                  <p className="text-xs text-cream-faint" aria-hidden>
                    {t("land.eaClosesIn")}
                  </p>
                  <div className="grid grid-cols-4 gap-2" aria-hidden>
                    {units.map(([value, label]) => (
                      <div
                        key={label}
                        className="flex flex-col items-center rounded-xl border border-line px-1 py-3"
                      >
                        <span className="text-title tabular-nums text-cream-bright">
                          {label === "land.eaDays" ? value : String(value).padStart(2, "0")}
                        </span>
                        <span className="mt-1 text-xs text-cream-faint">{t(label)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={submit} className="flex flex-col gap-5">
                <Field label={t("auth.email")} htmlFor="ea-email">
                  <input
                    id="ea-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="focus-ring rounded-xl border border-line-strong bg-transparent px-4 py-2.5 text-sm text-cream-bright placeholder:text-cream-faint"
                  />
                </Field>

                <Field label={t("land.eaRole")} htmlFor="ea-role">
                  <input
                    id="ea-role"
                    required
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    placeholder="Senior Product Designer"
                    className="focus-ring rounded-xl border border-line-strong bg-transparent px-4 py-2.5 text-sm text-cream-bright placeholder:text-cream-faint"
                  />
                </Field>

                <Field
                  label={t("land.eaCompany")}
                  hint={t("land.eaCompanyHint")}
                  htmlFor="ea-company"
                >
                  <input
                    id="ea-company"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    placeholder="Nubank"
                    className="focus-ring rounded-xl border border-line-strong bg-transparent px-4 py-2.5 text-sm text-cream-bright placeholder:text-cream-faint"
                  />
                </Field>

                {error && (
                  <p role="alert" className="text-sm text-cream-bright">
                    {error}
                  </p>
                )}

                <Action type="submit" disabled={state === "sending"} className="self-start">
                  {state === "sending" ? t("land.eaSending") : t("land.eaSubmit")}
                </Action>
              </form>
            </div>
          )}
        </Panel>
        </FadeRise>
      </div>
    </Section>
  );
}
