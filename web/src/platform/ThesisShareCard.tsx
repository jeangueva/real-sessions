import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, MessageCircle, Share2, X } from "lucide-react";
import { Action } from "@/design-system";
import { useThesisT } from "@/lib/thesis-copy";

export interface ThesisShareData {
  grade: number;
  gradeMax: number;
  passMark: number;
  readiness: number;
  verdictLabel?: string;
  subtitle?: string;
}

/**
 * Quiet academic share card for WhatsApp and Stories: shows the student's
 * rehearsal grade and readiness index without exposing private thesis text.
 */
export function ThesisShareCard({ data }: { data: ThesisShareData }) {
  const t = useThesisT();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const gradeText = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(data.grade);
  const passed = data.grade >= data.passMark;
  const whatsappText = `${t("shareCardMessage", {
    grade: gradeText,
    max: data.gradeMax,
    readiness: data.readiness,
  })} https://getmockio.com`;

  const downloadPng = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Editorial dark slate background
    ctx.fillStyle = "#111216";
    ctx.fillRect(0, 0, 1080, 1350);

    // Subtle card container
    ctx.fillStyle = "#191b22";
    ctx.beginPath();
    ctx.roundRect(72, 120, 936, 1110, 48);
    ctx.fill();

    // Eyebrow
    ctx.fillStyle = "#9ca3af";
    ctx.font = "600 28px system-ui, -apple-system, sans-serif";
    ctx.fillText("MOCKIO · ENSAYO DE SUSTENTACIÓN", 144, 230);

    // Big grade
    ctx.fillStyle = "#f9fafb";
    ctx.font = "700 180px system-ui, -apple-system, sans-serif";
    ctx.fillText(gradeText, 144, 450);

    const gradeWidth = ctx.measureText(gradeText).width;
    ctx.fillStyle = "#6b7280";
    ctx.font = "600 64px system-ui, -apple-system, sans-serif";
    ctx.fillText(`/ ${data.gradeMax}`, 144 + gradeWidth + 24, 450);

    // Verdict pill
    const badgeText = data.verdictLabel ?? (passed ? "Aprobado en ensayo" : "En preparación");
    ctx.font = "600 34px system-ui, -apple-system, sans-serif";
    const badgeWidth = ctx.measureText(badgeText).width + 64;
    ctx.fillStyle = passed ? "rgba(34, 197, 94, 0.16)" : "rgba(245, 158, 11, 0.16)";
    ctx.beginPath();
    ctx.roundRect(144, 510, badgeWidth, 72, 36);
    ctx.fill();
    ctx.fillStyle = passed ? "#4ade80" : "#fbbf24";
    ctx.fillText(badgeText, 176, 558);

    // Readiness bar
    ctx.fillStyle = "#d1d5db";
    ctx.font = "600 34px system-ui, -apple-system, sans-serif";
    ctx.fillText(`${t("readiness")}: ${data.readiness}/100`, 144, 720);

    ctx.fillStyle = "#272a34";
    ctx.beginPath();
    ctx.roundRect(144, 756, 792, 24, 12);
    ctx.fill();

    ctx.fillStyle = data.readiness >= 70 ? "#22c55e" : data.readiness >= 45 ? "#818cf8" : "#f59e0b";
    ctx.beginPath();
    ctx.roundRect(144, 756, Math.max(32, Math.round((792 * Math.min(100, data.readiness)) / 100)), 24, 12);
    ctx.fill();

    if (data.subtitle) {
      ctx.fillStyle = "#9ca3af";
      ctx.font = "500 32px system-ui, -apple-system, sans-serif";
      ctx.fillText(data.subtitle.slice(0, 48), 144, 920);
    }

    ctx.fillStyle = "#6b7280";
    ctx.font = "500 28px system-ui, -apple-system, sans-serif";
    ctx.fillText("getmockio.com · Jurado de 3 con voz", 144, 1140);

    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `mockio-sustentacion-${gradeText}.png`;
    link.click();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-surface-card px-3.5 py-1.5 text-xs font-semibold text-cream-bright shadow-card transition-[background-color,box-shadow,transform] duration-150 ease-press hover:shadow-lift active:scale-[0.97] print:hidden"
      >
        <Share2 aria-hidden className="h-3.5 w-3.5 text-accent-text" />
        {t("shareCardCta")}
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-xs print:hidden"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={t("shareCardTitle")}
          >
            <div
              className="flex w-full max-w-md flex-col gap-4 rounded-3xl bg-surface-raised p-5 shadow-float sm:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-cream-bright">{t("shareCardTitle")}</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("discClose")}
                  className="focus-ring grid h-8 w-8 place-items-center rounded-full bg-surface-lift text-cream-dim transition-[color,transform] duration-150 ease-press hover:text-cream-bright active:scale-[0.95]"
                >
                  <X aria-hidden className="h-4 w-4" />
                </button>
              </div>

              {/* Clean editorial preview */}
              <div className="on-media flex flex-col justify-between gap-5 rounded-2xl bg-[#14161d] p-6 text-cream-bright ring-1 ring-white/10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-cream-dim">
                    Mockio · {t("actaTitle")}
                  </p>
                  <p className="mt-3 flex items-baseline gap-2">
                    <span className="text-5xl font-bold tabular-nums leading-none">{gradeText}</span>
                    <span className="text-lg font-semibold text-cream-dim">/ {data.gradeMax}</span>
                  </p>
                  {data.verdictLabel && (
                    <span
                      className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        passed ? "bg-grow-soft text-grow-text" : "bg-accent-soft text-accent-text"
                      }`}
                    >
                      {data.verdictLabel}
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-cream-dim">{t("readiness")}</span>
                    <span className="tabular-nums">{data.readiness}/100</span>
                  </div>
                  <span className="block h-2 overflow-hidden rounded-full bg-white/10">
                    <span
                      className={`block h-full rounded-full ${
                        data.readiness >= 70 ? "bg-grow" : data.readiness >= 45 ? "bg-accent" : "bg-step"
                      }`}
                      style={{ width: `${Math.max(4, Math.min(100, data.readiness))}%` }}
                    />
                  </span>
                </div>

                <p className="text-xs text-cream-dim">getmockio.com</p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(whatsappText)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white transition-[filter,transform] duration-150 ease-press hover:brightness-105 active:scale-[0.97]"
                >
                  <MessageCircle aria-hidden className="h-4 w-4" />
                  {t("shareCardWhatsapp")}
                </a>
                <Action tone="neutral" onClick={downloadPng}>
                  <Download aria-hidden className="h-4 w-4" />
                  {t("shareCardDownload")}
                </Action>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
