import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { Action, Eyebrow, Panel } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { ApiError, decideQuestion, fetchReviewQueue } from "@/lib/api";
import type { PendingQuestion } from "@/lib/api";
import { formatSessionDate } from "@/lib/format";

/**
 * The review queue.
 *
 * This screen is the only thing between a stranger's text and an interview
 * prompt. Everything a candidate contributes lands here as pending, and nothing
 * reaches a real interview until someone working this queue says it should.
 *
 * The route is invisible to anyone not on the reviewer allowlist — the server
 * answers 404 rather than 403, so whether a deployment even has a queue is not
 * something it confirms to everyone who asks.
 */
export function Review() {
  const [queue, setQueue] = useState<PendingQuestion[] | null>(null);
  const [depth, setDepth] = useState(0);
  const [companies, setCompanies] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    fetchReviewQueue()
      .then((result) => {
        // Defaulted rather than trusted. A 200 carrying an unexpected shape —
        // a proxy answering with its own body, a client and server briefly out
        // of step across a deploy — used to leave `queue` undefined and crash
        // the render on `.length`, turning a recoverable oddity into a blank
        // screen.
        setQueue(result.queue ?? []);
        setDepth(result.depth ?? 0);
        setCompanies(
          Object.fromEntries(
            (result.companies ?? []).map((entry) => [entry.id, entry.name]),
          ),
        );
      })
      .catch((caught: unknown) =>
        setError(
          caught instanceof ApiError && caught.status === 404
            ? "This account is not a reviewer."
            : "Could not load the queue.",
        ),
      );
  };

  useEffect(load, []);

  const decide = async (id: number, status: "verified" | "rejected") => {
    setBusy(id);
    setError(null);
    try {
      const result = await decideQuestion(id, status);
      // Removed locally rather than refetching: the queue is worked one item
      // at a time and a reload would lose the reviewer's place in it.
      setQueue((current) => (current ?? []).filter((entry) => entry.id !== id));
      setDepth((current) => Math.max(0, current - 1));
      if (!result.decided) setError("Someone else had already decided that one.");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not save that.");
    } finally {
      setBusy(null);
    }
  };

  if (error && queue === null) {
    return (
      <>
        <PageHeader title="Review" />
        <PageBody>
          <Panel variant="glass" className="max-w-2xl p-6">
            <p role="alert" className="text-sm text-cream-bright">
              {error}
            </p>
          </Panel>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Review"
        meta={
          queue === null
            ? "Loading…"
            : depth === 0
              ? "Nothing waiting"
              : `${depth} question${depth === 1 ? "" : "s"} waiting`
        }
      />

      <PageBody className="flex flex-col gap-4">
        <Panel className="max-w-3xl p-6">
          <Eyebrow>What you are deciding</Eyebrow>
          <p className="mt-2 text-sm text-cream-dim">
            Verify a question only if it reads like something that company would
            actually ask. A verified question is shown to the interviewer as
            source material for its own questions at that employer.
          </p>
          <p className="mt-3 text-xs text-cream-faint">
            Reject anything naming a person, carrying confidential detail, or
            written as an instruction rather than a question. The prompt is
            built to ignore instructions hidden in here, but that is the second
            line of defence — you are the first.
          </p>
        </Panel>

        {error && queue !== null && (
          <p role="alert" className="text-sm text-cream-bright">
            {error}
          </p>
        )}

        {queue !== null && queue.length === 0 && (
          <Panel variant="raised" className="max-w-3xl p-6">
            <p className="text-sm text-cream-dim">
              The queue is empty. Contributions arrive from the landing page.
            </p>
          </Panel>
        )}

        <ul className="flex flex-col gap-3">
          {(queue ?? []).map((entry) => (
            <li key={entry.id}>
              <Panel className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-cream-faint">
                    {companies[entry.companyId] ?? entry.companyId}
                    {entry.stage && ` · ${entry.stage}`}
                    {entry.role && ` · ${entry.role}`}
                    {` · ${formatSessionDate(entry.createdAt)}`}
                  </p>
                  {/* Rendered as plain text, never as markup: this is the one
                      string on any screen written by a stranger. */}
                  <p className="mt-2 text-sm leading-relaxed text-cream-bright">
                    {entry.question}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={() => void decide(entry.id, "rejected")}
                    disabled={busy === entry.id}
                    className="focus-ring flex items-center gap-2 rounded-full border border-line px-4 py-2 text-xs text-cream-dim transition-colors hover:text-cream-bright disabled:opacity-40"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                    Reject
                  </button>
                  <Action
                    onClick={() => void decide(entry.id, "verified")}
                    disabled={busy === entry.id}
                  >
                    <Check className="h-4 w-4" aria-hidden />
                    Verify
                  </Action>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      </PageBody>
    </>
  );
}
