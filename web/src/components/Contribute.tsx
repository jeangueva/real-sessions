import { useEffect, useState } from "react";
import { Action, Eyebrow, Field, Panel, Section } from "@/design-system";
import { ApiError, contributeQuestion, fetchCatalogue } from "@/lib/api";
import type { CatalogueCompany, Role, Sector } from "@/lib/api";
import { useT } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n";

/** The value is what the backend stores; the key is what the reader sees. */
const STAGES: { value: string; label: MessageKey }[] = [
  { value: "Behavioral", label: "land.stageBehavioral" },
  { value: "Technical deep dive", label: "land.stageTechnical" },
  { value: "System design", label: "land.stageSystem" },
  { value: "Other", label: "land.stageOther" },
];

/**
 * Crowd-reported interview questions.
 *
 * The interviewer's questions are generated, which makes them plausible rather
 * than real. This closes that gap from the only source that has the answer:
 * people who sat the interview.
 *
 * Two promises are made on this screen and both are kept in the backend rather
 * than here. Contributions are anonymous — the stored row carries a salted,
 * one-way hash that exists for de-duplication and cannot name the contributor.
 * And nothing submitted reaches an interview until a person confirms it, so a
 * rumour cannot be laundered into an authoritative question by volume alone.
 */
export function Contribute() {
  const t = useT();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [companies, setCompanies] = useState<CatalogueCompany[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [sector, setSector] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [stage, setStage] = useState(STAGES[0]!.value);
  const [role, setRole] = useState("");
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<"idle" | "sending">("idle");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCatalogue()
      .then((result) => {
        setSectors(result.sectors);
        setCompanies(result.companies);
        setRoles(result.roles);
        setCompanyId(result.companies[0]?.id ?? "");
      })
      .catch(() => undefined);
  }, []);

  const visible = sector
    ? companies.filter((entry) => entry.sectorId === sector)
    : companies;

  // Narrowing the sector can strand the selected company outside the list.
  useEffect(() => {
    if (visible.length > 0 && !visible.some((entry) => entry.id === companyId)) {
      setCompanyId(visible[0]!.id);
    }
  }, [visible, companyId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("sending");
    setError(null);
    setNotice(null);
    try {
      const result = await contributeQuestion({
        companyId,
        question: question.trim(),
        stage,
        role: role.trim(),
      });
      setNotice(result.message);
      if (result.stored) setQuestion("");
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : t("land.contribFailed"),
      );
    } finally {
      setState("idle");
    }
  };

  return (
    <Section id="contribute" className="bg-surface-base">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <Eyebrow>{t("land.contribEyebrow")}</Eyebrow>
          <h2 className="mt-4 text-headline font-normal text-cream-bright">
            {t("land.contribTitle")}
          </h2>
          <p className="mt-5 max-w-xl text-sm text-cream-dim sm:text-base">
            {t("land.contribBody")}
          </p>

          <dl className="mt-8 flex flex-col gap-5 border-t border-line pt-6">
            <div>
              <dt className="text-sm text-cream-bright">{t("land.contribAnonTitle")}</dt>
              <dd className="mt-1 text-xs text-cream-dim">
                {t("land.contribAnonBody")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-cream-bright">{t("land.contribCheckTitle")}</dt>
              <dd className="mt-1 text-xs text-cream-dim">
                {t("land.contribCheckBody")}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-cream-bright">{t("land.contribNextTitle")}</dt>
              <dd className="mt-1 text-xs text-cream-dim">
                {t("land.contribNextBody")}
              </dd>
            </div>
          </dl>
        </div>

        <Panel className="p-6 sm:p-8">
          <form onSubmit={submit} className="flex flex-col gap-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("land.contribSector")} htmlFor="c-sector">
                <select
                  id="c-sector"
                  value={sector}
                  onChange={(event) => setSector(event.target.value)}
                  className="focus-ring rounded-xl border border-line-strong bg-surface-card px-4 py-2.5 text-sm text-cream-bright"
                >
                  <option value="">{t("land.contribAllSectors")}</option>
                  {sectors.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t("land.contribCompany")} htmlFor="c-company">
                <select
                  id="c-company"
                  value={companyId}
                  onChange={(event) => setCompanyId(event.target.value)}
                  className="focus-ring rounded-xl border border-line-strong bg-surface-card px-4 py-2.5 text-sm text-cream-bright"
                >
                  {visible.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t("land.contribStage")} htmlFor="c-stage">
                <select
                  id="c-stage"
                  value={stage}
                  onChange={(event) => setStage(event.target.value)}
                  className="focus-ring rounded-xl border border-line-strong bg-surface-card px-4 py-2.5 text-sm text-cream-bright"
                >
                  {STAGES.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {t(entry.label)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label={t("land.contribRole")}
                hint={t("land.contribRoleHint")}
                htmlFor="c-role"
              >
                <select
                  id="c-role"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  className="focus-ring rounded-xl border border-line-strong bg-surface-card px-4 py-2.5 text-sm text-cream-bright"
                >
                  {/* A list rather than free text, because these are filtered
                      by role: "Backend Engineer", "backend engineer" and "BE"
                      as separate values would make that filter useless. */}
                  <option value="">{t("land.contribAnyRole")}</option>
                  {roles.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field
              label={t("land.contribQuestion")}
              hint={t("land.contribQuestionHint")}
              htmlFor="c-question"
            >
              <textarea
                id="c-question"
                required
                rows={3}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Walk me through a time you had to ship with incomplete data."
                className="focus-ring resize-none rounded-xl border border-line-strong bg-transparent px-4 py-2.5 text-sm text-cream-bright placeholder:text-cream-faint"
              />
            </Field>

            {notice && (
              <p role="status" className="text-sm text-cream-dim">
                {notice}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-cream-bright">
                {error}
              </p>
            )}

            <Action
              type="submit"
              disabled={state === "sending" || question.trim().length < 12}
              className="self-start"
            >
              {state === "sending" ? t("land.contribSending") : t("land.contribSubmit")}
            </Action>
          </form>
        </Panel>
      </div>
    </Section>
  );
}
