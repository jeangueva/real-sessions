import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Action, Eyebrow, Field, Panel } from "@/design-system";
import { ApiError, deleteAccount } from "@/lib/api";
import { useT } from "@/hooks/useLocale";

/**
 * Erasing an account.
 *
 * Kept behind a disclosure and a typed confirmation, because it is the one
 * action in the product with no undo. The typed address is checked on the
 * server too — this is not a courtesy the client could skip.
 *
 * What it removes is listed plainly rather than summarised as "your data". A
 * person deciding whether to delete an account is entitled to know that their
 * transcripts and their progress go with it, and that their contributed
 * questions do not.
 */
export function DeleteAccount({ email }: { email: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(typed.trim());
      // A full navigation, not a router push: the identity cookie is gone and
      // every screen behind it would now render as a stranger's.
      window.location.assign("/");
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : t("delete.couldNot"),
      );
      setBusy(false);
    }
  };

  return (
    <Panel className="mt-4 max-w-2xl border border-line p-6">
      <Eyebrow>{t("delete.title")}</Eyebrow>

      {!open ? (
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <p className="text-sm text-cream-dim">
            {t("delete.summary")}
          </p>
          <button
            onClick={() => setOpen(true)}
            className="focus-ring shrink-0 rounded-full border border-line-strong px-4 py-2 text-xs text-cream-dim transition-colors hover:text-cream-bright"
          >
            {t("delete.button")}
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-cream" aria-hidden />
            <div className="text-sm text-cream-dim">
              <p className="text-cream-bright">{t("delete.noUndo")}</p>
              <ul className="mt-3 flex flex-col gap-1.5 text-xs">
                <li>{t("delete.itemSessions")}</li>
                <li>{t("delete.itemProgress")}</li>
                <li>{t("delete.itemProfile")}</li>
                <li>{t("delete.itemPreferences")}</li>
              </ul>
              <p className="mt-3 text-xs">
                {t("delete.questionsStay")}
              </p>
            </div>
          </div>

          <Field
            label={t("delete.typeToConfirm", { email })}
            htmlFor="confirm-email"
          >
            <input
              id="confirm-email"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              placeholder={email}
              className="focus-ring rounded-xl border border-line-strong bg-transparent px-4 py-2.5 text-sm text-cream-bright placeholder:text-cream-faint"
            />
          </Field>

          {error && (
            <p role="alert" className="text-sm text-cream-bright">
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Action
              onClick={() => void confirm()}
              // Compared here only to keep the button honest; the server does
              // the check that matters.
              disabled={busy || typed.trim().toLowerCase() !== email.toLowerCase()}
            >
              {busy ? t("delete.deleting") : t("delete.confirm")}
            </Action>
            <button
              onClick={() => {
                setOpen(false);
                setTyped("");
                setError(null);
              }}
              className="focus-ring rounded-full px-4 py-2 text-xs text-cream-dim transition-colors hover:text-cream-bright"
            >
              {t("delete.cancel")}
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}
