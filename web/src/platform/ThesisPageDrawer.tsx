import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { BookOpen, Loader2, X } from "lucide-react";
import { ApiError, fetchThesisPage, type ThesisPageExcerpt } from "@/lib/api";
import { useThesisT } from "@/lib/thesis-copy";

export interface PageDrawerTarget {
  page: number;
  note?: string;
}

/**
 * Side-by-side drawer showing the exact page of the student's thesis cited by
 * a risk, consistency row, slide mismatch, or jury observation.
 */
export function ThesisPageDrawer({
  target,
  onClose,
}: {
  target: PageDrawerTarget | null;
  onClose: () => void;
}) {
  const t = useThesisT();
  const [currentPage, setCurrentPage] = useState<number>(target?.page ?? 1);
  const [data, setData] = useState<ThesisPageExcerpt | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (target) setCurrentPage(target.page);
  }, [target]);

  useEffect(() => {
    if (!target) return;
    let alive = true;
    setBusy(true);
    setError(null);
    fetchThesisPage(currentPage)
      .then((result) => {
        if (alive) setData(result);
      })
      .catch((caught: unknown) => {
        if (alive) setError(caught instanceof ApiError ? caught.message : t("error"));
      })
      .finally(() => {
        if (alive) setBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [target, currentPage]);

  useEffect(() => {
    if (!target) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  if (!target || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs print:hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("pageDrawerTitle", { page: currentPage, total: data?.total ?? currentPage })}
    >
      <div
        className="sheet-in flex h-full w-full max-w-lg flex-col justify-between gap-4 bg-surface-raised p-5 shadow-float sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line pb-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-base font-semibold text-cream-bright">
              <BookOpen aria-hidden className="h-4 w-4 shrink-0 text-accent-text" />
              {t("pageDrawerTitle", { page: data?.page ?? currentPage, total: data?.total ?? "…" })}
            </p>
            {data?.approximate && <p className="mt-0.5 text-xs text-cream-dim">{t("pageDrawerApprox")}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("discClose")}
            className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface-lift text-cream-dim transition-[color,transform] duration-150 ease-press hover:text-cream-bright active:scale-[0.95]"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>

        {target.note && (
          <div className="rounded-xl bg-accent-soft px-3.5 py-2.5 text-xs leading-relaxed text-accent-text">
            {target.note}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl bg-surface-card p-4 shadow-card sm:p-5">
          {busy ? (
            <p className="flex items-center gap-2 text-sm text-cream-dim">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin text-accent-text" />
              {t("pageDrawerLoading")}
            </p>
          ) : error ? (
            <p role="alert" className="text-sm text-step-text">
              {error}
            </p>
          ) : data?.text.trim() ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream">{data.text}</p>
          ) : (
            <p className="text-sm text-cream-dim">{t("pageDrawerEmpty")}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
          <button
            type="button"
            disabled={busy || currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="focus-ring rounded-full bg-surface-card px-3.5 py-1.5 text-xs font-semibold text-cream-bright shadow-card transition-[background-color,transform] duration-150 ease-press active:scale-[0.97] disabled:opacity-40"
          >
            {t("pageDrawerPrev")}
          </button>
          <span className="text-xs font-semibold tabular-nums text-cream-dim">
            {t("page", { page: currentPage })}
          </span>
          <button
            type="button"
            disabled={busy || (data !== null && currentPage >= data.total)}
            onClick={() => setCurrentPage((p) => (data ? Math.min(data.total, p + 1) : p + 1))}
            className="focus-ring rounded-full bg-surface-card px-3.5 py-1.5 text-xs font-semibold text-cream-bright shadow-card transition-[background-color,transform] duration-150 ease-press active:scale-[0.97] disabled:opacity-40"
          >
            {t("pageDrawerNext")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
