import { useEffect, useRef, useState } from "react";
import { Headphones, Loader2, Pause, Play } from "lucide-react";
import { Panel } from "@/design-system";
import { ApiError, fetchVoiceConfig, prepareDemoDefense } from "@/lib/api";
import type { DemoDefense, StoredThesis } from "@/lib/api";
import { useThesisT } from "@/lib/thesis-copy";
import { createAuraOutput, createSpeechOutput, JURORS, NEUTRAL_VOICE, type SpeechOutput } from "@/lib/voice";

type Line = DemoDefense["lines"][number];

/** The student's voice: a persona none of the three jurors uses. */
const STUDENT_PERSONA = "warm";

function savedCountry(): string {
  try {
    return localStorage.getItem("mockio.defenseCountry") ?? "PE";
  } catch {
    return "PE";
  }
}

/** The phrase an output speaks: a juror's tag picks their voice. */
function spoken(line: Line): string {
  return line.speaker === "estudiante" ? line.text : `[[${line.speaker}]] ${line.text}`;
}

/**
 * A model defence of this thesis, to listen to before rehearsing.
 *
 * One quiet row until asked for: the rehearsal is what this screen is for.
 * Written on the first open, then kept. Played line by line through the same
 * voices the rehearsal uses, with the line in the air highlighted and the
 * deliberately weak answer marked, so the lesson is seen as well as heard.
 */
export function ThesisDemo({ thesis, onChange }: { thesis: StoredThesis; onChange: (next: StoredThesis) => void }) {
  const t = useThesisT();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const output = useRef<SpeechOutput | null>(null);
  // Bumped on every stop, so a loop still awaiting a phrase knows to quit.
  const run = useRef(0);
  const lines = thesis.demo?.demo.lines ?? [];

  useEffect(() => () => output.current?.cancel(), []);

  const prepare = async () => {
    setOpen(true);
    if (thesis.demo) return;
    setBusy(true);
    setError(null);
    try {
      onChange((await prepareDemoDefense()).thesis);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("error"));
    } finally {
      setBusy(false);
    }
  };

  const voice = async (): Promise<SpeechOutput> => {
    if (output.current) return output.current;
    const language = thesis.analysis.language === "pt" ? "pt" : thesis.analysis.language === "en" ? "en" : "es";
    const country = savedCountry();
    const bcp47 = language === "pt" ? "pt-BR" : language === "en" ? "en-US" : `es-${country}`;
    const config = await fetchVoiceConfig().catch(() => ({ speech: false }));
    output.current = config.speech
      ? createAuraOutput(STUDENT_PERSONA, NEUTRAL_VOICE, bcp47, language, country)
      : createSpeechOutput(bcp47, NEUTRAL_VOICE);
    return output.current;
  };

  const stop = () => {
    run.current += 1;
    output.current?.cancel();
    setPlaying(false);
  };

  const play = async (from: number) => {
    stop();
    const mine = run.current;
    const out = await voice();
    setPlaying(true);
    for (let index = from; index < lines.length; index += 1) {
      if (run.current !== mine) return;
      setCurrent(index);
      const next = lines[index + 1];
      if (next) out.prime?.(spoken(next));
      const result = await out.speak(spoken(lines[index]!));
      if (result === "blocked") break;
    }
    if (run.current === mine) setPlaying(false);
  };

  const who = (line: Line) => (line.speaker === "estudiante" ? t("demoStudent") : JURORS[line.speaker].name);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => void prepare()}
        className="focus-ring flex items-center gap-3 rounded-2xl bg-surface-card px-4 py-3 text-left shadow-card transition-transform duration-150 active:scale-[0.99]"
      >
        <Headphones aria-hidden className="h-5 w-5 shrink-0 text-accent-text" />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-cream-bright">{t("demoTitle")}</span>
          <span className="block text-xs text-cream-dim">{t("demoTeaser")}</span>
        </span>
      </button>
    );
  }

  return (
    <Panel variant="raised" className="flex flex-col gap-4 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <Headphones aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-accent-text" />
          <div>
            <h2 className="text-base font-semibold text-cream-bright">{t("demoTitle")}</h2>
            <p className="text-xs text-cream-dim">{t("demoNote")}</p>
          </div>
        </div>
        {lines.length > 0 && (
          <button
            type="button"
            onClick={() => (playing ? stop() : void play(current !== null && current < lines.length - 1 ? current : 0))}
            className="focus-ring inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white shadow-card transition-transform duration-150 active:scale-[0.97]"
          >
            {playing ? <Pause aria-hidden className="h-4 w-4" /> : <Play aria-hidden className="h-4 w-4" />}
            {playing ? t("demoPause") : current === null ? t("demoPlay") : t("demoResume")}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-2xl bg-step-soft px-4 py-3 text-sm text-step-text">
          {error}
        </p>
      )}
      {busy && (
        <p className="flex items-center gap-2 text-sm text-cream">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin text-accent-text" />
          {t("demoWriting")}
        </p>
      )}

      {lines.length > 0 && (
        <ol className="flex max-h-[26rem] flex-col gap-2 overflow-y-auto pr-1">
          {lines.map((line, index) => (
            <li key={index}>
              <button
                type="button"
                onClick={() => void play(index)}
                aria-current={index === current ? "true" : undefined}
                className={`focus-ring w-full rounded-2xl px-4 py-3 text-left transition-colors ${
                  index === current ? "bg-accent-soft" : line.weak ? "bg-step-soft/60" : "bg-surface-card"
                }`}
              >
                <span className="flex flex-wrap items-center gap-2 text-xs font-semibold text-cream-bright">
                  {who(line)}
                  {line.weak && (
                    <span className="rounded-full bg-step-soft px-2 py-0.5 text-step-text">{t("demoWeak")}</span>
                  )}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-cream">{line.text}</span>
                {line.lesson && <span className="mt-1 block text-xs text-accent-text">{line.lesson}</span>}
              </button>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
