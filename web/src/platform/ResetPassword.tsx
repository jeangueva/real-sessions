import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { Action, Eyebrow, Field } from "@/design-system";
import { ApiError, requestPasswordReset, resetPassword } from "@/lib/api";
import { useT } from "@/hooks/useLocale";

/**
 * Both halves of the reset flow. With a `token` in the URL it sets a new
 * password; without one it asks where to send the link.
 */
export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token");
  return token ? <SetNewPassword token={token} /> : <RequestLink />;
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useT();
  return (
    <AuthLayout>
    <Eyebrow>{t("auth.password")}</Eyebrow>
    <h1 className="mt-3 text-title font-normal text-cream-bright">{title}</h1>
    {children}
    <Link
      to="/signin"
      className="focus-ring mt-8 block rounded text-xs text-cream-dim underline underline-offset-4 transition-colors hover:text-cream-bright"
    >
      {t("auth.backToSignIn")}
    </Link>
    </AuthLayout>
  );
}

function RequestLink() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await requestPasswordReset(email);
      // The server answers the same way whether or not the address exists, and
      // so does this screen — confirming it here would undo that.
      setSent(result.message);
    } catch {
      setSent(t("auth.resetFallback"));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Shell title={t("auth.checkEmail")}>
        <p className="mt-6 text-sm text-cream-dim">{sent}</p>
        <p className="mt-3 text-xs text-cream-faint">
          {t("auth.linkOnce")}
        </p>
      </Shell>
    );
  }

  return (
    <Shell title={t("auth.resetTitle")}>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
        <Field label={t("auth.email")} htmlFor="email">
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="focus-ring rounded-xl border border-line-strong bg-transparent px-4 py-2.5 text-sm text-cream-bright placeholder:text-cream-faint"
            placeholder="you@example.com"
          />
        </Field>
        <Action type="submit" disabled={busy} className="self-start">
          {busy ? "…" : t("auth.sendLink")}
        </Action>
      </form>
    </Shell>
  );
}

function SetNewPassword({ token }: { token: string }) {
  const t = useT();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await resetPassword(token, password);
      // The reset signs you in, so there is no reason to ask again.
      navigate("/app", { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : t("auth.couldNotReset"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title={t("auth.chooseNew")}>
      <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
        <Field
          label={t("auth.newPassword")}
          htmlFor="password"
          hint={t("auth.passwordHint")}
        >
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="focus-ring rounded-xl border border-line-strong bg-transparent px-4 py-2.5 text-sm text-cream-bright"
          />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-cream-bright">
            {error}
          </p>
        )}
        <p className="text-xs text-cream-faint">
          {t("auth.signsOutOthers")}
        </p>
        <Action type="submit" disabled={busy} className="self-start">
          {busy ? "…" : t("auth.setPassword")}
        </Action>
      </form>
    </Shell>
  );
}
