import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { Action, Eyebrow, Field } from "@/design-system";
import { ApiError, signIn, signUp } from "@/lib/api";
import { privacyFor, termsFor, legalLocale } from "@/legal/content";
import { useLocale, useT } from "@/hooks/useLocale";

/**
 * Sign in or create an account. One screen with a mode switch rather than two
 * routes: the fields are identical and people routinely arrive at the wrong one.
 */
export function SignIn() {
  const t = useT();
  const { locale } = useLocale();
  const navigate = useNavigate();
  const { state } = useLocation() as { state: { from?: string } | null };
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await (mode === "in" ? signIn : signUp)(email, password);
      navigate(state?.from ?? "/app", { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : t("auth.wentWrong"),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
    <Eyebrow>{mode === "in" ? t("auth.welcomeBack") : t("auth.createAccount")}</Eyebrow>
    <h1 className="mt-3 text-title font-normal text-cream-bright">
      {mode === "in"
        ? t("auth.signInTitle")
        : t("auth.signUpTitle")}
    </h1>

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

      <Field
        label={t("auth.password")}
        htmlFor="password"
        hint={mode === "up" ? t("auth.passwordHint") : undefined}
      >
        <input
          id="password"
          type="password"
          required
          /* Tells password managers whether to offer a saved password or
             generate a new one. */
          autoComplete={mode === "in" ? "current-password" : "new-password"}
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

      <Action type="submit" disabled={busy} className="self-start">
        {busy ? "…" : mode === "in" ? t("auth.signIn") : t("auth.create")}
      </Action>
    </form>

    {mode === "up" && (
      <p className="mt-5 text-xs leading-relaxed text-cream-faint">
        {t("auth.acceptPre")}{" "}
        <Link
          to="/terms"
          className="focus-ring rounded underline underline-offset-4 hover:text-cream-bright"
        >
          {termsFor(legalLocale(locale)).title}
        </Link>{" "}
        {t("auth.acceptAnd")}{" "}
        <Link
          to="/privacy"
          className="focus-ring rounded underline underline-offset-4 hover:text-cream-bright"
        >
          {privacyFor(legalLocale(locale)).title}
        </Link>
        .
      </p>
    )}

    {mode === "in" && (
      <Link
        to="/reset"
        className="focus-ring mt-6 block rounded text-xs text-cream-dim underline underline-offset-4 transition-colors hover:text-cream-bright"
      >
        {t("auth.forgot")}
      </Link>
    )}

    <button
      onClick={() => {
        setMode((current) => (current === "in" ? "up" : "in"));
        setError(null);
      }}
      className="focus-ring mt-3 rounded text-xs text-cream-dim underline underline-offset-4 transition-colors hover:text-cream-bright"
    >
      {mode === "in"
        ? t("auth.toSignUp")
        : t("auth.toSignIn")}
    </button>

    <p className="mt-8 border-t border-line pt-5 text-xs text-cream-faint">
      {t("auth.guestNote")}
    </p>
    </AuthLayout>
  );
}
