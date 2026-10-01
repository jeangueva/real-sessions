import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Action, Eyebrow, FadeRise, Meter, Panel } from "@/design-system";
import { useT } from "@/hooks/useLocale";
import { track } from "@/lib/analytics";
import type { Evaluation } from "@/lib/evaluation";
import type { SessionMetrics } from "@/lib/api";

/**
 * A report somebody else shared, read by somebody who may never have been
 * here.
 *
 * Outside the app shell, which is the point: the shell redirects anyone
 * without a session to sign in, and the reader of this page has no session and
 * no reason to want one yet. They were sent a link by a friend preparing for
 * an interview.
 *
 * So the page has two audiences and they want opposite things. The person who
 * shared it wants their result shown properly — the score, the language notes,
 * what to fix. The person reading it has never heard of this product and will
 * decide in about four seconds whether it is worth their attention. The report
 * comes first and the invitation goes at the bottom, in that order, because a
 * page that sells before it shows is a page the first audience stops sharing.
 *
 * What arrives is only what `publicReport` in the server puts in the response:
 * no transcript, no owner, no session id. This file cannot show more than that
 * even by accident, which is deliberate — the alternative was handing a public
 * page the same session object the owner's own screen gets.
 */

/** Exactly the server's public shape. Narrower than a session, on purpose. */
interface SharedReport {
  company: string;
  role: string;
  stage: string;
  completedAt: string | null;
  score: number | null;
  evaluation: Evaluation | null;
  metrics: SessionMetrics | null;
}

export function SharedReport() {
  const t = useT();
  const { token = "" } = useParams();
  const [report, setReport] = useState<SharedReport | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const response = await fetch(`/api/shared/${encodeURIComponent(token)}`);
        if (!response.ok) throw new Error("not available");
        const body = (await response.json()) as { report: SharedReport };
        if (!live) return;
        setReport(body.report);
        setState("ready");
        // The one event worth counting here. A shared link is the only way
        // somebody arrives at this product without being sent by us, so
        // knowing whether these are read at all decides whether the feature
        // earns the screen it takes.
        track("shared report viewed");
      } catch {
        if (live) setState("missing");
      }
    })();
    return () => {
      live = false;
    };
  }, [token]);

  if (state === "loading") {
    return <main className="min-h-screen bg-surface-base" aria-busy="true" />;
  }

  if (state === "missing" || !report?.evaluation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface-base px-6">
        <Panel variant="raised" className="flex w-full max-w-md flex-col gap-5 p-8">
          <h1 className="text-title font-normal text-cream-bright">
            {t("shared.goneTitle")}
          </h1>
          {/* Not "wrong link". It may have been taken down on purpose, and
              the reader cannot tell the difference — nor should they. */}
          <p className="text-sm leading-relaxed text-cream-dim">{t("shared.goneBody")}</p>
          <Link to="/">
            <Action>{t("shared.cta")}</Action>
          </Link>
        </Panel>
      </main>
    );
  }

  const { evaluation } = report;
  const when = report.completedAt
    ? new Date(report.completedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <main className="min-h-screen bg-surface-base px-4 py-10 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <FadeRise>
          <div className="flex flex-col gap-2">
            <Eyebrow>{t("shared.eyebrow")}</Eyebrow>
            <h1 className="text-display font-normal text-cream-bright">
              {t("shared.title", { role: report.role, company: report.company })}
            </h1>
            <p className="text-sm text-cream-dim">
              {[report.stage, when].filter(Boolean).join(" · ")}
            </p>
          </div>
        </FadeRise>

        <div className="grid gap-4 lg:grid-cols-3">
          <FadeRise delay={0.05} className="lg:col-span-1">
            <Panel variant="raised" className="flex h-full flex-col gap-6 p-6">
              <Eyebrow>{t("feedback.overall")}</Eyebrow>
              <p
                className="text-display text-cream-bright"
                style={{ fontSize: "clamp(3rem,8vw,5rem)" }}
              >
                {evaluation.overall_score_percentage}
                <span className="text-cream-faint">%</span>
              </p>
              <div className="flex flex-col gap-4">
                <Meter
                  label={t("feedback.vocabulary")}
                  value={evaluation.vocabulary_feedback.score_out_of_10}
                  max={10}
                  suffix="/10"
                />
                <Meter
                  label={t("feedback.structure")}
                  value={evaluation.structure_feedback.score_out_of_10}
                  max={10}
                  suffix="/10"
                />
              </div>
            </Panel>
          </FadeRise>

          <FadeRise delay={0.1} className="lg:col-span-2">
            <Panel className="flex h-full flex-col gap-6 p-6">
              <div>
                <Eyebrow>{t("feedback.worked")}</Eyebrow>
                <ul className="mt-3 flex flex-col gap-3">
                  {evaluation.strengths.map((item) => (
                    <li key={item} className="text-sm leading-relaxed text-cream-bright">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-t border-line pt-6">
                <Eyebrow>{t("feedback.toFix")}</Eyebrow>
                <ul className="mt-3 flex flex-col gap-3">
                  {evaluation.areas_for_improvement.map((item) => (
                    <li key={item} className="text-sm leading-relaxed text-cream-dim">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>
          </FadeRise>

          <FadeRise delay={0.15} className="lg:col-span-2">
            <Panel className="flex h-full flex-col gap-5 p-6">
              <Eyebrow>{t("feedback.language")}</Eyebrow>
              <div>
                <p className="text-xs text-cream-faint">{t("feedback.usedWell")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {evaluation.vocabulary_feedback.good_usage.map((word) => (
                    <span
                      key={word}
                      className="rounded-full border border-line px-3 py-1 text-xs text-cream-bright"
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-cream-faint">{t("feedback.corrections")}</p>
                <ul className="mt-2 flex flex-col gap-2">
                  {evaluation.vocabulary_feedback.missed_opportunities_or_errors.map(
                    (item) => (
                      <li key={item} className="text-sm text-cream-dim">
                        {item}
                      </li>
                    ),
                  )}
                </ul>
              </div>
            </Panel>
          </FadeRise>

          <FadeRise delay={0.2} className="lg:col-span-1">
            <Panel className="flex h-full flex-col gap-4 p-6">
              <Eyebrow>{t("feedback.structure")}</Eyebrow>
              <p className="text-sm leading-relaxed text-cream-dim">
                {evaluation.structure_feedback.feedback_text}
              </p>
            </Panel>
          </FadeRise>
        </div>

        {/* The invitation, last. A reader who scrolled this far has read
            somebody's whole interview report and knows what the product does
            better than any headline could tell them. */}
        <FadeRise delay={0.25}>
          <Panel variant="raised" className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-cream-bright">{t("shared.ctaTitle")}</p>
              <p className="text-xs text-cream-faint">{t("shared.ctaBody")}</p>
            </div>
            <Link to="/" className="shrink-0">
              <Action>{t("shared.cta")}</Action>
            </Link>
          </Panel>
        </FadeRise>
      </div>
    </main>
  );
}
