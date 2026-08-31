import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Action, Eyebrow, Field, Panel } from "@/design-system";
import { ApiError, signIn, signUp } from "@/lib/api";

/**
 * Sign in or create an account. One screen with a mode switch rather than two
 * routes: the fields are identical and people routinely arrive at the wrong one.
 */
export function SignIn() {
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
        caught instanceof ApiError ? caught.message : "Something went wrong.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-deep px-6">
      <Panel variant="raised" className="w-full max-w-md p-8">
        <Eyebrow>{mode === "in" ? "Welcome back" : "Create an account"}</Eyebrow>
        <h1 className="mt-3 text-title font-normal text-cream-bright">
          {mode === "in"
            ? "Sign in to keep your progress."
            : "Keep your history across devices."}
        </h1>

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

          <Field
            label="Password"
            htmlFor="password"
            hint={mode === "up" ? "At least 12 characters. A phrase works well." : undefined}
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
              className="focus-ring rounded-xl border border-line bg-transparent px-4 py-2.5 text-sm text-cream-bright"
            />
          </Field>

          {error && (
            <p role="alert" className="text-sm text-cream-bright">
              {error}
            </p>
          )}

          <Action type="submit" disabled={busy} className="self-start">
            {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
          </Action>
        </form>

        {mode === "in" && (
          <Link
            to="/reset"
            className="focus-ring mt-6 block rounded text-xs text-cream-dim underline underline-offset-4 transition-colors hover:text-cream-bright"
          >
            Forgot your password?
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
            ? "No account yet? Create one"
            : "Already have an account? Sign in"}
        </button>

        <p className="mt-8 border-t border-line pt-5 text-xs text-cream-faint">
          You can practise without an account — anything you do now carries over
          when you sign up from this browser.
        </p>
      </Panel>
    </main>
  );
}
