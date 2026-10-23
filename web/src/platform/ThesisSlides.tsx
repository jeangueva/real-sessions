import { useRef, useState } from "react";
import { AlertTriangle, Download, Loader2, PenLine, Presentation, Trash2, Upload } from "lucide-react";
import { Eyebrow, Panel, DisclosureMark, Segmented } from "@/design-system";
import { ApiError, deleteSlides, uploadSlides, writeThesisScript } from "@/lib/api";
import type { StoredThesis } from "@/lib/api";
import { useThesisT } from "@/lib/thesis-copy";
import { downloadDeck } from "@/lib/deck";
import { ThesisPageDrawer, type PageDrawerTarget } from "./ThesisPageDrawer";

const SLOTS = [15, 20, 30];

const VERDICT = {
  ok: { key: "verdictOk", tone: "bg-grow-soft text-grow-text" },
  recargada: { key: "verdictRecargada", tone: "bg-accent-soft text-accent-text" },
  incoherente: { key: "verdictIncoherente", tone: "bg-step-soft text-step-text" },
  sobra: { key: "verdictSobra", tone: "bg-surface-lift text-cream-dim" },
} as const;

/**
 * The deck, against the thesis and against the clock.
 *
 * Mismatches first, because a jury spots a sample size that differs from the
 * thesis before anything else; then the time, then slide by slide; the script
 * last, folded, since it is read at home rather than on this screen.
 */
export function ThesisSlides({ thesis, onChange }: { thesis: StoredThesis; onChange: (next: StoredThesis) => void }) {
  const t = useThesisT();
  const [minutes, setMinutes] = useState(() => (thesis.slides ? Math.round(thesis.slides.slotSeconds / 60) : 20));
  const [busy, setBusy] = useState<"upload" | "write" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pageTarget, setPageTarget] = useState<PageDrawerTarget | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const slides = thesis.slides ?? null;

  const upload = async (file: File) => {
    setBusy("upload");
    setError(null);
    try {
      onChange((await uploadSlides(file, minutes)).thesis);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("error"));
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const download = async () => {
    if (!slides) return;
    setError(null);
    try {
      await downloadDeck({ title: thesis.analysis.title, career: thesis.analysis.career, review: slides.review });
    } catch {
      setError(t("error"));
    }
  };

  const write = async () => {
    setBusy("write");
    setError(null);
    try {
      onChange((await writeThesisScript(minutes)).thesis);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("error"));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    try {
      onChange((await deleteSlides()).thesis);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("error"));
    }
  };

  const review = slides?.review;
  // Written from the thesis rather than read from a deck: no verdicts or word
  // counts to show, and the script is the point, so it opens unfolded.
  const fromThesis = slides?.source === "thesis";
  // Whole minutes: "about 12 of 20" is what someone plans with, and a decimal
  // point reads wrong in Spanish and Portuguese anyway.
  const totalMinutes = review ? Math.max(1, Math.round(review.total_seconds / 60)) : 0;
  const slotMinutes = slides ? Math.round(slides.slotSeconds / 60) : minutes;
  const share = review && slides ? review.total_seconds / slides.slotSeconds : 0;

  return (
    <Panel variant="raised" className="flex flex-col gap-5 p-6 sm:p-8">
      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <div className="flex items-start gap-3">
        <Presentation aria-hidden className="mt-1 h-5 w-5 shrink-0 text-accent-text" />
        <div className="min-w-0">
          <h2 className="text-title font-semibold text-cream-bright">{t("slidesTitle")}</h2>
          {!slides && <p className="mt-1 max-w-prose text-sm text-cream-dim">{t("slidesBody")}</p>}
          {slides && (
            <p className="mt-1 text-sm text-cream-dim">
              {fromThesis
                ? t("scriptFromThesis", { count: slides.slideCount })
                : `${slides.fileName} · ${t("slidesCount", { count: slides.slideCount })}`}
            </p>
          )}
        </div>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-xs font-semibold text-cream-dim">{t("slidesSlot")}</legend>
        <Segmented
          label={t("slidesSlot")}
          value={String(minutes)}
          onChange={(next) => setMinutes(Number(next) as typeof minutes)}
          options={SLOTS.map((entry) => ({ value: String(entry), label: t("slidesMinutes", { count: entry }) }))}
          className="self-start"
        />
      </fieldset>

      {error && (
        <p role="alert" className="rounded-2xl bg-step-soft px-4 py-3 text-sm text-step-text">
          {error}
        </p>
      )}

      {busy ? (
        <p className="flex items-center gap-2 text-sm text-cream">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin text-accent-text" />
          {busy === "write" ? t("scriptWriting") : t("slidesReading")}
        </p>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-surface-card px-4 py-2 text-sm font-semibold text-cream-bright shadow-card transition-transform duration-150 active:scale-[0.97]"
          >
            <Upload aria-hidden className="h-4 w-4" />
            {slides && !fromThesis ? t("slidesReplace") : t("slidesUpload")}
          </button>
          {(!slides || fromThesis) && (
            <button
              type="button"
              onClick={() => void write()}
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-surface-card px-4 py-2 text-sm font-semibold text-cream-bright shadow-card transition-transform duration-150 active:scale-[0.97]"
            >
              <PenLine aria-hidden className="h-4 w-4" />
              {fromThesis ? t("scriptRewrite") : t("scriptWrite")}
            </button>
          )}
          {/* Older scripts were written before slides carried their points;
              a deck of titles alone is not worth downloading. */}
          {fromThesis && slides.review.slides.some((slide) => (slide.points ?? []).length > 0) && (
            <button
              type="button"
              onClick={() => void download()}
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-card transition-transform duration-150 active:scale-[0.97]"
            >
              <Download aria-hidden className="h-4 w-4" />
              {t("deckDownload")}
            </button>
          )}
          {slides && (
            <button
              type="button"
              onClick={() => void remove()}
              className="focus-ring inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-step-text transition-transform duration-150 active:scale-[0.97]"
            >
              <Trash2 aria-hidden className="h-4 w-4" />
              {t("slidesRemove")}
            </button>
          )}
        </div>
      )}

      {review && slides && (
        <>
          <p className="max-w-prose text-base leading-relaxed text-cream">{review.summary}</p>

          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-cream-bright">
              {t("slidesTime", { minutes: totalMinutes, slot: slotMinutes })}
            </p>
            <span className="block h-2 overflow-hidden rounded-full bg-surface-lift">
              <span
                className={`block h-full rounded-full ${share > 1 ? "bg-step" : share > 0.85 ? "bg-accent" : "bg-grow"}`}
                style={{ width: `${Math.max(3, Math.min(100, share * 100))}%` }}
              />
            </span>
          </div>

          {review.inconsistencies.length > 0 && (
            <section className="flex flex-col gap-2">
              <Eyebrow>{t("slidesMismatch")}</Eyebrow>
              {review.inconsistencies.map((entry, index) => (
                <p key={index} className="flex gap-2 rounded-2xl bg-step-soft px-4 py-3 text-sm text-step-text">
                  <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    <span className="font-semibold">{t("slideN", { n: entry.slide })}</span>
                    {entry.thesis_page ? (
                      <>
                        {" · "}
                        <button
                          type="button"
                          onClick={() => setPageTarget({ page: entry.thesis_page!, note: entry.issue })}
                          className="focus-ring rounded-full bg-surface-card/80 px-2 py-0.5 text-xs font-semibold tabular-nums text-cream-bright underline decoration-cream-faint/50 underline-offset-2"
                        >
                          {t("page", { page: entry.thesis_page })}
                        </button>
                      </>
                    ) : (
                      ""
                    )}
                    : {entry.issue}
                  </span>
                </p>
              ))}
            </section>
          )}

          <section className="flex flex-col gap-2">
            <Eyebrow>{fromThesis ? t("scriptOutline") : t("slidesPerSlide")}</Eyebrow>
            <ol className="flex flex-col gap-2">
              {review.slides.map((slide) => (
                <li key={slide.n} className="rounded-2xl bg-surface-card p-4 shadow-card">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-cream-bright">
                      {slide.n}. {slide.title}
                    </span>
                    {!fromThesis && (
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${VERDICT[slide.verdict].tone}`}>
                        {t(VERDICT[slide.verdict].key)}
                      </span>
                    )}
                    <span className="text-xs tabular-nums text-cream-dim">
                      {fromThesis ? `${slide.seconds}s` : `${slide.seconds}s · ${t("words", { count: slides.words[slide.n - 1] ?? 0 })}`}
                    </span>
                  </div>
                  {fromThesis && (slide.points ?? []).length > 0 && (
                    <ul className="mt-1 list-disc pl-5 text-sm text-cream">
                      {slide.points!.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-1 text-sm text-cream-dim">{slide.note}</p>
                </li>
              ))}
            </ol>
          </section>

          {fromThesis && <p className="max-w-prose text-sm text-cream-dim">{t("scriptDraftNote")}</p>}

          <details open={fromThesis} className="rounded-2xl bg-surface-card p-4 shadow-card">
            <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl text-sm font-semibold text-cream-bright">
              {t("script")}
              <DisclosureMark />
            </summary>
            <ol className="mt-3 flex flex-col gap-3">
              {review.script.map((entry) => (
                <li key={entry.slide} className="text-sm leading-relaxed text-cream">
                  <span className="font-semibold text-cream-bright">{t("slideN", { n: entry.slide })}. </span>
                  {entry.say}
                </li>
              ))}
            </ol>
          </details>
        </>
      )}
      <ThesisPageDrawer target={pageTarget} onClose={() => setPageTarget(null)} />
    </Panel>
  );
}
