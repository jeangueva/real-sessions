import { useState } from "react";
import { Action, Backdrop, Eyebrow, Field, Panel, Section } from "@/design-system";
import { ApiError, joinEarlyAccess } from "@/lib/api";
import { useT } from "@/hooks/useLocale";

/**
 * The early-adopter list.
 *
 * Three fields, because three is what we will actually use: the address the
 * grant attaches to, the role that decides which interviews to build next, and
 * the company that tells us which employer to add. Anything more is a form
 * people abandon.
 *
 * The grant is redeemed at sign-up, not here — this endpoint runs before anyone
 * has an account, so all it can do is record the address and wait.
 */
export function EarlyAccess() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

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
    <Section id="early-access" className="relative overflow-hidden bg-surface-base">
      <Backdrop variant="section" />

      <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <Eyebrow>{t("land.eaEyebrow")}</Eyebrow>
          <h2 className="mt-4 text-headline font-normal text-cream-bright">
            {t("land.eaTitle")}
          </h2>
          <p className="mt-5 max-w-xl text-sm text-cream-dim sm:text-base">
            {t("land.eaBody")}
          </p>
          <p className="mt-4 max-w-xl text-xs text-cream-faint">
            {t("land.eaPrivacy")}
          </p>
        </div>

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
          ) : (
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
          )}
        </Panel>
      </div>
    </Section>
  );
}
