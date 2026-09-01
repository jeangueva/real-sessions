import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { Action, Eyebrow, Field } from "@/design-system";
import { ApiError, requestPasswordReset, resetPassword } from "@/lib/api";

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
  return (
    <AuthLayout>
    <Eyebrow>Password</Eyebrow>
    <h1 className="mt-3 text-title font-normal text-cream-bright">{title}</h1>
    {children}
    <Link
      to="/signin"
      className="focus-ring mt-8 block rounded text-xs text-cream-dim underline underline-offset-4 transition-colors hover:text-cream-bright"
    >
      Back to sign in
    </Link>
    </AuthLayout>
  );
}

function RequestLink() {
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
      setSent("If that address has an account, a reset link is on its way.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Shell title="Check your email">
        <p className="mt-6 text-sm text-cream-dim">{sent}</p>
        <p className="mt-3 text-xs text-cream-faint">
          The link works once and expires in 30 minutes.
        </p>
      </Shell>
    );
  }

  return (
    <Shell title="Reset your password">
      <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
        <Field label="Email" htmlFor="email">
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="focus-ring rounded-xl border border-line bg-transparent px-4 py-2.5 text-sm text-cream-bright placeholder:text-cream-faint"
            placeholder="you@example.com"
          />
        </Field>
        <Action type="submit" disabled={busy} className="self-start">
          {busy ? "…" : "Send reset link"}
        </Action>
      </form>
    </Shell>
  );
}

function SetNewPassword({ token }: { token: string }) {
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
        caught instanceof ApiError ? caught.message : "Could not reset password.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Choose a new password">
      <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
        <Field
          label="New password"
          htmlFor="password"
          hint="At least 12 characters. A phrase works well."
        >
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="focus-ring rounded-xl border border-line bg-transparent px-4 py-2.5 text-sm text-cream-bright"
          />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-cream-bright">
            {error}
          </p>
        )}
        <p className="text-xs text-cream-faint">
          Setting a new password signs out every other device.
        </p>
        <Action type="submit" disabled={busy} className="self-start">
          {busy ? "…" : "Set password"}
        </Action>
      </form>
    </Shell>
  );
}
