import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, Trash2, Upload } from "lucide-react";
import { Action, Eyebrow, Field, Panel } from "@/design-system";
import { PageBody, PageHeader } from "./AppShell";
import { useT } from "@/hooks/useLocale";
import {
  ApiError,
  clearProfile,
  fetchCandidateProfile,
  fetchPlan,
  saveProfileLinks,
  uploadProfileDocument,
} from "@/lib/api";
import type { CandidateProfile, Capabilities } from "@/lib/api";
import { formatSessionDate } from "@/lib/format";

const ACCEPT = ".pdf,.docx,.txt,.md";

/**
 * The candidate's own context: a CV or portfolio, and the links they consider
 * part of their work.
 *
 * This is the single biggest lever on how real an interview feels. An
 * interviewer that can ask "you cut approval time to under an hour — what
 * broke first?" is a different product from one asking about a hard tradeoff in
 * the abstract.
 *
 * The brief is shown back verbatim. It is what the interviewer will actually
 * read, and a candidate should be able to see — and disagree with — the summary
 * a model wrote about them before it is used.
 */
export function Profile() {
  const t = useT();
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [can, setCan] = useState<Capabilities | null>(null);
  const [links, setLinks] = useState("");
  const [busy, setBusy] = useState<"idle" | "uploading" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPlan()
      .then((result) => setCan(result.capabilities))
      .catch(() => undefined);
    fetchCandidateProfile()
      .then((result) => {
        setProfile(result.profile);
        setLinks(result.profile.links.map((link) => link.url).join("\n"));
      })
      .catch(() => setProfile(null));
  }, []);

  const describe = (caught: unknown) =>
    setError(caught instanceof ApiError ? caught.message : "Something went wrong.");

  const upload = async (file: File) => {
    setBusy("uploading");
    setError(null);
    setNotice(null);
    try {
      const result = await uploadProfileDocument(file);
      setProfile(result.profile);
      setNotice("Read it. Your next interview will know about this.");
    } catch (caught) {
      describe(caught);
    } finally {
      setBusy("idle");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const persistLinks = async () => {
    setBusy("saving");
    setError(null);
    setNotice(null);
    try {
      const entered = links
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
      const result = await saveProfileLinks(entered);
      setProfile(result.profile);
      setLinks(result.profile.links.map((link) => link.url).join("\n"));
      setNotice(
        result.rejected.length > 0
          ? `Saved. These did not look like links and were skipped: ${result.rejected.join(", ")}`
          : "Saved.",
      );
    } catch (caught) {
      describe(caught);
    } finally {
      setBusy("idle");
    }
  };

  const remove = async () => {
    setError(null);
    try {
      const result = await clearProfile();
      setProfile(result.profile);
      setLinks("");
      setNotice("Removed. Interviews go back to opening broad.");
    } catch (caught) {
      describe(caught);
    }
  };

  if (can && !can.candidateProfile) {
    return (
      <>
        <PageHeader title={t("profile.title")} meta={t("profile.locked")} />
        <PageBody>
          <Panel variant="raised" className="flex max-w-2xl flex-col gap-4 p-6">
            <p className="text-sm text-cream-dim">
              {t("profile.lockedBody")}
            </p>
            <Link to="/#early-access" className="self-start">
              <Action withArrow>{t("setup.sixMonths")}</Action>
            </Link>
          </Panel>
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t("profile.title")}
        meta={t("profile.meta")}
        actions={
          profile?.brief && (
            <button
              onClick={() => void remove()}
              className="focus-ring flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-cream-dim transition-colors hover:text-cream-bright"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Remove
            </button>
          )
        }
      />

      <PageBody className="grid gap-4 lg:grid-cols-2">
        <Panel className="flex flex-col gap-5 p-6">
          <div>
            <Eyebrow>{t("profile.cvTitle")}</Eyebrow>
            <p className="mt-2 text-xs text-cream-faint">
              {t("profile.cvNote")}
            </p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            id="cv"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
            }}
          />
          <label
            htmlFor="cv"
            className="focus-within:ring-2 focus-within:ring-cream flex cursor-pointer items-center justify-center gap-3 rounded-2xl border border-dashed border-line px-6 py-10 text-sm text-cream-dim transition-colors hover:border-cream/40 hover:text-cream-bright"
          >
            <Upload className="h-4 w-4" aria-hidden />
            {busy === "uploading" ? t("profile.reading") : t("profile.choose")}
          </label>

          {profile?.sourceName && (
            <p className="flex items-center gap-2 text-xs text-cream-dim">
              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {profile.sourceName}
              {profile.updatedAt && ` · ${formatSessionDate(profile.updatedAt)}`}
            </p>
          )}

          {error && (
            <p role="alert" className="text-sm text-cream-bright">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm text-cream-dim">
              {notice}
            </p>
          )}
        </Panel>

        <Panel className="flex flex-col gap-5 p-6">
          <div>
            <Eyebrow>{t("profile.links")}</Eyebrow>
            <p className="mt-2 text-xs text-cream-faint">
              {t("profile.linksNote")}
            </p>
          </div>

          <Field label={t("profile.onePerLine")} htmlFor="links">
            <textarea
              id="links"
              rows={6}
              value={links}
              onChange={(event) => setLinks(event.target.value)}
              placeholder={"github.com/you\nlinkedin.com/in/you\nyour-portfolio.com"}
              className="focus-ring resize-none rounded-xl border border-line bg-transparent px-4 py-2.5 text-sm text-cream-bright placeholder:text-cream-faint"
            />
          </Field>

          <Action
            onClick={() => void persistLinks()}
            disabled={busy === "saving"}
            className="self-start"
          >
            {busy === "saving" ? t("profile.saving") : t("profile.saveLinks")}
          </Action>
        </Panel>

        {profile?.brief && (
          <Panel variant="raised" className="flex flex-col gap-4 p-6 lg:col-span-2">
            <div>
              <Eyebrow>{t("profile.briefTitle")}</Eyebrow>
              <p className="mt-2 text-xs text-cream-faint">
                {t("profile.briefNote")}
              </p>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream-dim">
              {profile.brief}
            </p>
          </Panel>
        )}
      </PageBody>
    </>
  );
}
