import { Gavel } from "lucide-react";
import { Eyebrow, Panel } from "@/design-system";
import type { Evaluation } from "@/lib/evaluation";
import { useThesisT } from "@/lib/thesis-copy";
import { JURORS } from "@/lib/voice";
import { PrintReport } from "./PrintReport";

type Acta = NonNullable<Evaluation["acta"]>;

const VERDICT = {
  "aprobado-unanimidad": { key: "verdictUnanimidad", tone: "bg-grow-soft text-grow-text" },
  "aprobado-mayoria": { key: "verdictMayoria", tone: "bg-accent-soft text-accent-text" },
  desaprobado: { key: "verdictDesaprobado", tone: "bg-step-soft text-step-text" },
} as const;

const AXES = [
  ["contenido", "axisContenido"],
  ["metodologia", "axisMetodologia"],
  ["claridad", "axisClaridad"],
  ["preguntas", "axisPreguntas"],
  ["tiempo", "axisTiempo"],
  ["seguridad", "axisSeguridad"],
] as const;

/** Green, amber or red by how ready that part is. */
function tone(value: number): string {
  return value >= 70 ? "bg-grow" : value >= 45 ? "bg-accent" : "bg-step";
}

function Bar({ value }: { value: number }) {
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full bg-surface-lift">
      <span className={`block h-full rounded-full ${tone(value)}`} style={{ width: `${Math.max(3, Math.min(100, value))}%` }} />
    </span>
  );
}

/**
 * The jury's record, at the top of a defence report.
 *
 * In the order a student reads a real one: the grade and the verdict, then
 * why each juror voted as they did, then where to work. The readiness index
 * says what it is not — a chance of passing — because a number next to a
 * verdict is read as a prediction unless told otherwise.
 */
export function ActaCard({ acta }: { acta: Acta }) {
  const t = useThesisT();
  const verdict = VERDICT[acta.verdict];
  return (
    <div className="flex flex-col gap-4">
      {/* On paper only: what this document is, for the advisor reading it. */}
      <p className="hidden text-sm font-semibold text-cream-bright print:block">{t("printHeading")}</p>
      <div className="print:hidden">
        <PrintReport />
      </div>
      <Panel variant="raised" className="flex flex-col gap-6 p-6 shadow-lift sm:p-8">
        <div className="flex items-start gap-4">
          <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-lift text-cream-bright">
            <Gavel className="h-6 w-6" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Eyebrow>{t("actaTitle")}</Eyebrow>
            <p className="flex items-baseline gap-2">
              <span className="text-[2.75rem] font-bold leading-none tabular-nums text-cream-bright">{acta.grade}</span>
              <span className="text-lg font-semibold text-cream-faint">{t("outOf", { max: acta.grade_max })}</span>
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${verdict.tone}`}>{t(verdict.key)}</span>
              <span className="text-xs text-cream-dim">{t("passMark", { mark: acta.pass_mark })}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-cream-bright">{t("readiness")}</p>
            <p className="text-sm font-semibold tabular-nums text-cream-bright">{acta.readiness}/100</p>
          </div>
          <Bar value={acta.readiness} />
          <p className="text-xs text-cream-dim">{t("readinessNote")}</p>
        </div>
      </Panel>

      <Panel className="flex flex-col gap-4 p-6 sm:p-8">
        <h2 className="text-base font-semibold text-cream-bright">{t("deliberation")}</h2>
        <ul className="flex flex-col gap-4">
          {acta.deliberation.map((entry) => (
            <li key={entry.juror} className="flex gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-lift text-sm font-bold tabular-nums text-cream-bright">
                {entry.grade}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-cream-bright">
                  {JURORS[entry.juror].name} <span className="font-normal text-cream-dim">· {t(entry.juror)}</span>
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-cream">{entry.opinion}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="grid gap-8 p-6 sm:grid-cols-2 sm:p-8 [&>*]:min-w-0">
        <div className="flex flex-col gap-3">
          <h2 className="text-base font-semibold text-cream-bright">{t("axesTitle")}</h2>
          {AXES.map(([axis, label]) => (
            <div key={axis} className="flex flex-col gap-1">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-cream">{t(label)}</span>
                <span className="tabular-nums text-cream-dim">{acta.axes[axis]}</span>
              </div>
              <Bar value={acta.axes[axis]} />
            </div>
          ))}
        </div>
        {acta.chapters.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-base font-semibold text-cream-bright">{t("chaptersMap")}</h2>
            {acta.chapters.map((chapter) => (
              <div key={chapter.name} className="flex flex-col gap-1">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0 text-cream">{chapter.name}</span>
                  <span className="tabular-nums text-cream-dim">{chapter.readiness}</span>
                </div>
                <Bar value={chapter.readiness} />
              </div>
            ))}
          </div>
        )}
      </Panel>
      <p className="px-1 text-xs text-cream-dim">{t("actaDisclaimer")}</p>
    </div>
  );
}
