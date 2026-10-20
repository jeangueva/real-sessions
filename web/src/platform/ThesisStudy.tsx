import { useEffect, useMemo, useState } from "react";
import { BookOpen, FileDown, Layers, Loader2, Shuffle, Square, Volume2 } from "lucide-react";
import { Action, Panel } from "@/design-system";
import { ApiError, prepareStudy } from "@/lib/api";
import type { StoredThesis } from "@/lib/api";
import { useThesisT } from "@/lib/thesis-copy";
import { ThesisPageDrawer, type PageDrawerTarget } from "./ThesisPageDrawer";

/**
 * The night before: the thesis on one page, and the questions on cards.
 *
 * Written on request rather than at upload — most students want it in the
 * last week — and kept with the thesis version it was written from.
 */
export function ThesisStudy({ thesis, onChange }: { thesis: StoredThesis; onChange: (next: StoredThesis) => void }) {
  const t = useThesisT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"sheet" | "cards">("sheet");
  const [speaking, setSpeaking] = useState(false);
  const [pageTarget, setPageTarget] = useState<PageDrawerTarget | null>(null);
  const study = thesis.study ?? null;

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleListen = () => {
    if (!study || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const s = study.sheet;
    const parts = [
      thesis.analysis.title,
      `${t("sheetOneLiner")}: ${s.one_liner}`,
      `${t("sheetProblem")}: ${s.problem}`,
      `${t("sheetObjective")}: ${s.objective}`,
      `${t("sheetMethod")}: ${s.method}`,
      `${t("sheetResults")}: ${s.key_results.join(". ")}`,
      `${t("sheetContribution")}: ${s.contribution}`,
      ...s.hard_questions.map((q, idx) => `${idx + 1}. ${q.question} ${q.answer}`),
    ];
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(parts.join("\n\n"));
    utterance.lang = thesis.analysis.language === "pt" ? "pt-BR" : thesis.analysis.language === "en" ? "en-US" : "es-PE";
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const prepare = async () => {
    setBusy(true);
    setError(null);
    try {
      onChange((await prepareStudy()).thesis);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("error"));
    } finally {
      setBusy(false);
    }
  };

  if (!study) {
    return (
      <Panel variant="raised" className="flex flex-col items-start gap-3 p-5 sm:p-6">
        <p className="text-sm text-cream">{t("studyIntro")}</p>
        {busy ? (
          <p className="flex items-center gap-2 text-sm text-cream-dim">
            <Loader2 aria-hidden className="h-4 w-4 animate-spin text-accent-text" />
            {t("studyPreparing")}
          </p>
        ) : (
          <Action withArrow onClick={() => void prepare()}>
            {t("studyPrepare")}
          </Action>
        )}
        {error && (
          <p role="alert" className="text-sm text-step-text">
            {error}
          </p>
        )}
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        {(
          [
            ["sheet", "studySheet", BookOpen],
            ["cards", "studyCards", Layers],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => setView(value)}
            className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              view === value ? "bg-surface-lift text-cream-bright" : "text-cream-dim hover:text-cream-bright"
            }`}
          >
            <Icon aria-hidden className="h-4 w-4" />
            {t(label)}
          </button>
        ))}
        {view === "sheet" && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {typeof window !== "undefined" && "speechSynthesis" in window && (
              <button
                type="button"
                aria-pressed={speaking}
                onClick={toggleListen}
                className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-surface-card px-3.5 py-1.5 text-sm font-semibold text-cream-bright shadow-card transition-[background-color,color,box-shadow,transform] duration-150 ease-press active:scale-[0.97] hover:shadow-lift"
              >
                {speaking ? (
                  <Square aria-hidden className="h-3.5 w-3.5 text-accent-text" />
                ) : (
                  <Volume2 aria-hidden className="h-4 w-4 text-accent-text" />
                )}
                {t(speaking ? "sheetStopListen" : "sheetListen")}
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-surface-card px-3.5 py-1.5 text-sm font-semibold text-cream-bright shadow-card transition-[background-color,color,box-shadow,transform] duration-150 ease-press active:scale-[0.97] hover:shadow-lift"
            >
              <FileDown aria-hidden className="h-4 w-4" />
              {t("sheetPrint")}
            </button>
          </div>
        )}
      </div>
      {view === "sheet" ? (
        <Sheet study={study} title={thesis.analysis.title} onOpenPage={setPageTarget} />
      ) : (
        <Cards cards={study.cards} onOpenPage={setPageTarget} />
      )}
      <ThesisPageDrawer target={pageTarget} onClose={() => setPageTarget(null)} />
    </div>
  );
}

function Sheet({
  study,
  title,
  onOpenPage,
}: {
  study: NonNullable<StoredThesis["study"]>;
  title: string;
  onOpenPage: (target: PageDrawerTarget) => void;
}) {
  const t = useThesisT();
  const s = study.sheet;
  const row = (label: string, body: React.ReactNode) => (
    <div className="grid gap-1 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-cream-dim">{label}</dt>
      <dd className="text-sm leading-relaxed text-cream">{body}</dd>
    </div>
  );
  return (
    <Panel variant="raised" className="flex flex-col gap-4 p-5 sm:p-6">
      <h2 className="text-base font-semibold text-cream-bright">{title}</h2>
      <dl className="flex flex-col gap-3">
        {row(t("sheetOneLiner"), <strong className="text-cream-bright">{s.one_liner}</strong>)}
        {row(t("sheetProblem"), s.problem)}
        {row(t("sheetObjective"), s.objective)}
        {row(t("sheetMethod"), s.method)}
        {row(
          t("sheetResults"),
          <ul className="list-disc pl-4">
            {s.key_results.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>,
        )}
        {row(t("sheetContribution"), s.contribution)}
        {row(
          t("sheetLimitations"),
          <ul className="list-disc pl-4">
            {s.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>,
        )}
      </dl>
      <div className="flex flex-col gap-2 border-t border-line pt-4">
        <p className="text-sm font-semibold text-cream-bright">{t("sheetHard")}</p>
        <ol className="flex flex-col gap-2.5">
          {s.hard_questions.map((item, index) => (
            <li key={index} className="text-sm leading-relaxed">
              <p className="font-semibold text-cream-bright">
                {index + 1}. {item.question}
                {item.page && (
                  <button
                    type="button"
                    onClick={() => onOpenPage({ page: item.page!, note: item.question })}
                    className="focus-ring ml-1.5 rounded-full bg-surface-lift px-2 py-0.5 text-xs font-semibold tabular-nums text-cream-dim transition-colors hover:bg-accent-soft hover:text-accent-text"
                  >
                    {t("page", { page: item.page })}
                  </button>
                )}
              </p>
              <p className="mt-0.5 text-cream">{item.answer}</p>
            </li>
          ))}
        </ol>
      </div>
    </Panel>
  );
}

/** One card at a time, front then back, in order or shuffled. */
function Cards({
  cards,
  onOpenPage,
}: {
  cards: NonNullable<StoredThesis["study"]>["cards"];
  onOpenPage: (target: PageDrawerTarget) => void;
}) {
  const t = useThesisT();
  const [seed, setSeed] = useState(0);
  const deck = useMemo(() => {
    if (seed === 0) return cards;
    const copy = [...cards];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  }, [cards, seed]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = deck[index];
  if (!card) return null;
  const move = (next: number) => {
    setIndex((next + deck.length) % deck.length);
    setFlipped(false);
  };
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="focus-ring flex min-h-[14rem] flex-col justify-between gap-4 rounded-3xl bg-surface-card p-6 text-left shadow-lift transition-transform duration-150 active:scale-[0.99]"
      >
        <span className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-cream-dim">
          <span>{card.topic.replace("-", " ")}</span>
          <span>{t("cardOf", { n: index + 1, total: deck.length })}</span>
        </span>
        <span className={`text-lg leading-snug ${flipped ? "text-cream" : "font-semibold text-cream-bright"}`}>
          {flipped ? card.back : card.front}
        </span>
        <span className="flex items-center justify-between gap-2 text-xs text-cream-dim">
          <span>{flipped ? "" : t("cardFlip")}</span>
          {flipped && card.page && (
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                onOpenPage({ page: card.page!, note: card.front });
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onOpenPage({ page: card.page!, note: card.front });
                }
              }}
              className="rounded-full bg-surface-lift px-2.5 py-0.5 font-semibold tabular-nums text-accent-text hover:bg-accent-soft"
            >
              {t("page", { page: card.page })}
            </span>
          )}
        </span>
      </button>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={() => move(index - 1)} className="focus-ring rounded-full bg-surface-lift px-4 py-2 text-sm font-semibold text-cream-bright transition-[background-color,color,box-shadow,transform] duration-150 ease-press active:scale-[0.97] hover:bg-cream/15">
          {t("cardPrev")}
        </button>
        <button
          type="button"
          onClick={() => {
            setSeed((value) => value + 1);
            setIndex(0);
            setFlipped(false);
          }}
          className="focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-cream-dim transition-[background-color,color,box-shadow,transform] duration-150 ease-press active:scale-[0.97] hover:text-cream-bright"
        >
          <Shuffle aria-hidden className="h-4 w-4" />
          {t("cardShuffle")}
        </button>
        <button type="button" onClick={() => move(index + 1)} className="focus-ring rounded-full bg-surface-lift px-4 py-2 text-sm font-semibold text-cream-bright transition-[background-color,color,box-shadow,transform] duration-150 ease-press active:scale-[0.97] hover:bg-cream/15">
          {t("cardNext")}
        </button>
      </div>
    </div>
  );
}
