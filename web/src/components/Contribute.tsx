import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  MessageSquarePlus,
  Route,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Action, Eyebrow, FadeRise, Panel, Section } from "@/design-system";
import { ApiError, NotSignedIn, contributeQuestion, fetchCatalogue } from "@/lib/api";
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

/** The bounds the server enforces (`readQuestion`), mirrored for the counter. */
const MIN_QUESTION = 12;
const MAX_QUESTION = 400;

const PROMISES: { icon: typeof ShieldCheck; title: MessageKey; body: MessageKey }[] = [
  { icon: ShieldCheck, title: "land.contribAnonTitle", body: "land.contribAnonBody" },
  { icon: UserCheck, title: "land.contribCheckTitle", body: "land.contribCheckBody" },
  { icon: Route, title: "land.contribNextTitle", body: "land.contribNextBody" },
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
  /** No account: the lists cannot load and nothing could be stored. */
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    fetchCatalogue()
      .then((result) => {
        setSectors(result.sectors);
        setCompanies(result.companies);
        setRoles(result.roles);
        setCompanyId(result.companies[0]?.id ?? "");
      })
      .catch((caught: unknown) => {
        if (caught instanceof NotSignedIn) setSignedOut(true);
      });
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

  const length = question.trim().length;
  const ready = length >= MIN_QUESTION && Boolean(companyId);

  return (
    <Section id="contribute" className="bg-surface-base">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20 [&>*]:min-w-0">
        <FadeRise className="lg:pt-4">
          <Eyebrow>{t("land.contribEyebrow")}</Eyebrow>
          <h2 className="mt-3 text-balance text-headline font-semibold text-cream-bright">
            {t("land.contribTitle")}
          </h2>
          <p className="mt-5 max-w-xl text-base text-cream-dim sm:text-lg">
            {t("land.contribBody")}
          </p>
          <p className="mt-3 max-w-xl text-sm text-cream-faint">{t("land.contribBank")}</p>

          {/* Three promises, each with its own mark — the way Apple lists
              what a feature guarantees. No rule above them: the space and the
              icons already say "a list starts here". */}
          <ul className="mt-10 flex flex-col gap-6">
            {PROMISES.map(({ icon: Icon, title, body: text }) => (
              <li key={title} className="flex gap-4">
                <span
                  aria-hidden
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text"
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-cream-bright">{t(title)}</span>
                  <span className="mt-0.5 block text-sm text-cream-dim">{t(text)}</span>
                </span>
              </li>
            ))}
          </ul>
        </FadeRise>

        <FadeRise delay={0.12}>
          <Panel variant="raised" className="p-6 shadow-lift sm:p-8">
            {signedOut ? (
              /* The bank keys every question to an account — that is how one
                 person is kept from flooding a company — so a visitor gets the
                 way in instead of a form whose lists could never load. */
              <div className="flex flex-col items-start gap-5 py-4">
                <span
                  aria-hidden
                  className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent-text"
                >
                  <MessageSquarePlus className="h-6 w-6" />
                </span>
                <p className="max-w-sm text-lg font-semibold leading-snug text-cream-bright">
                  {t("land.contribSignIn")}
                </p>
                <Link to="/signin" state={{ from: "/#contribute" }}>
                  <Action withArrow>{t("land.signIn")}</Action>
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-6">
                {/* The question first. It is the only thing here that cannot
                    be picked from a list, and the reason the form exists. */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="c-question" className="text-sm font-semibold text-cream-bright">
                    {t("land.contribQuestion")}
                  </label>
                  <div className="relative">
                    <textarea
                      id="c-question"
                      required
                      rows={4}
                      maxLength={MAX_QUESTION}
                      value={question}
                      onChange={(event) => setQuestion(event.target.value)}
                      placeholder="Walk me through a time you had to ship with incomplete data."
                      className="field-control resize-none pb-9 text-base leading-relaxed text-cream-bright placeholder:text-cream-faint"
                    />
                    {/* Why the button is waiting, without a sentence: the count
                        turns from grey to green the moment it is long enough. */}
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute bottom-3 right-4 text-xs font-medium tabular-nums transition-colors duration-200 ${
                        length >= MIN_QUESTION ? "text-grow-text" : "text-cream-faint"
                      }`}
                    >
                      {length}/{MAX_QUESTION}
                    </span>
                  </div>
                  <p className="text-xs text-cream-faint">{t("land.contribQuestionHint")}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
                  <SelectField
                    id="c-sector"
                    label={t("land.contribSector")}
                    value={sector}
                    onChange={setSector}
                  >
                    <option value="">{t("land.contribAllSectors")}</option>
                    {sectors.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.label}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    id="c-company"
                    label={t("land.contribCompany")}
                    value={companyId}
                    onChange={setCompanyId}
                  >
                    {visible.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    id="c-stage"
                    label={t("land.contribStage")}
                    value={stage}
                    onChange={setStage}
                  >
                    {STAGES.map((entry) => (
                      <option key={entry.value} value={entry.value}>
                        {t(entry.label)}
                      </option>
                    ))}
                  </SelectField>

                  <SelectField
                    id="c-role"
                    label={t("land.contribRole")}
                    hint={t("land.contribRoleHint")}
                    value={role}
                    onChange={setRole}
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
                  </SelectField>
                </div>

                {notice && (
                  <p
                    role="status"
                    className="flex items-start gap-2.5 rounded-2xl bg-grow-soft px-4 py-3 text-sm text-cream-bright"
                  >
                    <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-grow-text" />
                    {notice}
                  </p>
                )}
                {error && (
                  <p
                    role="alert"
                    className="flex items-start gap-2.5 rounded-2xl bg-step-soft px-4 py-3 text-sm text-cream-bright"
                  >
                    <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-step-text" />
                    {error}
                  </p>
                )}

                <Action type="submit" disabled={state === "sending" || !ready} className="w-full py-3">
                  {state === "sending" ? t("land.contribSending") : t("land.contribSubmit")}
                </Action>
              </form>
            )}
          </Panel>
        </FadeRise>
      </div>
    </Section>
  );
}

/**
 * A select drawn like the rest of the fields: the same well, the same halo,
 * and one chevron in the product's ink instead of each browser's own arrow.
 * Still a native <select> underneath, so a phone opens its own wheel.
 */
function SelectField({
  id,
  label,
  hint,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-medium text-cream">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="field-control cursor-pointer appearance-none truncate pr-10 text-sm text-cream-bright"
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-dim"
        />
      </div>
      {hint && <p className="text-xs text-cream-faint">{hint}</p>}
    </div>
  );
}
