import { useState } from "react";
import { Action, Backdrop, Eyebrow, Field, Panel, Section } from "@/design-system";
import { ApiError, joinEarlyAccess } from "@/lib/api";

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
        caught instanceof ApiError ? caught.message : "Could not reach the service.",
      );
      setState("idle");
    }
  };

  return (
    <Section id="early-access" className="relative overflow-hidden bg-surface-base">
      <Backdrop variant="section" />

      <div className="relative grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <Eyebrow>Early access</Eyebrow>
          <h2 className="mt-4 text-headline font-normal text-cream-bright">
            Six months of the paid plan, free.
          </h2>
          <p className="mt-5 max-w-xl text-sm text-cream-dim sm:text-base">
            We are building this with the people who will use it. Tell us the
            role you are going for and where you are applying, and the first six
            months are on us when you create an account with the same address.
          </p>
          <p className="mt-4 max-w-xl text-xs text-cream-faint">
            Your email is used to attach the grant and to ask what to build
            next. Nothing else.
          </p>
        </div>

        <Panel variant="raised" className="p-6 sm:p-8">
          {state === "done" ? (
            <div role="status" className="flex flex-col gap-3">
              <p className="text-title font-normal text-cream-bright">
                You are on the list.
              </p>
              <p className="text-sm text-cream-dim">
                Create an account with{" "}
                <span className="text-cream-bright">{email}</span> and the first
                six months unlock automatically.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-5">
              <Field label="Email" htmlFor="ea-email">
                <input
                  id="ea-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="focus-ring rounded-xl border border-line bg-transparent px-4 py-2.5 text-sm text-cream-bright placeholder:text-cream-faint"
                />
              </Field>

              <Field label="Role you are targeting" htmlFor="ea-role">
                <input
                  id="ea-role"
                  required
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="Senior Product Designer"
                  className="focus-ring rounded-xl border border-line bg-transparent px-4 py-2.5 text-sm text-cream-bright placeholder:text-cream-faint"
                />
              </Field>

              <Field
                label="Company you have in mind"
                hint="Optional. It tells us which employer to build next."
                htmlFor="ea-company"
              >
                <input
                  id="ea-company"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  placeholder="Nubank"
                  className="focus-ring rounded-xl border border-line bg-transparent px-4 py-2.5 text-sm text-cream-bright placeholder:text-cream-faint"
                />
              </Field>

              {error && (
                <p role="alert" className="text-sm text-cream-bright">
                  {error}
                </p>
              )}

              <Action type="submit" disabled={state === "sending"} className="self-start">
                {state === "sending" ? "Adding you…" : "Claim six months"}
              </Action>
            </form>
          )}
        </Panel>
      </div>
    </Section>
  );
}
