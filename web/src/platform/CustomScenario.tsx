import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RotateCcw, Sparkles } from "lucide-react";
import { Action, Field, Notice, Panel } from "@/design-system";
import { useLocale } from "@/hooks/useLocale";
import { PageBody, PageHeader } from "./AppShell";

/**
 * A rehearsal built from the learner's own words.
 *
 * Two steps: describe it, then read and edit what the model made of it. The
 * edit step is the safeguard — the partner plays exactly what is on this
 * screen when "Start" is pressed, so nothing the model invented reaches the
 * roleplay unseen. Starting hands the confirmed scenario to the conversation
 * screen, which runs it like any other.
 */

export interface CustomScenarioDraft {
  domain: "education" | "professional";
  title: string;
  role: string;
  brief: string;
  goal: string;
}

const COPY = {
  es: { title: "Crear a tu medida", meta: "Describe la conversación que tienes por delante. La armamos, la revisas y la ensayas.", describe: "¿Qué conversación quieres practicar?", describeHint: "Una o dos frases. Ej.: pedirle a mi asesor más tiempo para el capítulo 3.", prepare: "Preparar escenario", preparing: "Preparando…", review: "Revisa y ajusta antes de empezar", fTitle: "Nombre", fRole: "Con quién hablas", fBrief: "La situación", fGoal: "Qué quieres lograr", domain: "Espacio", edu: "Educación", pro: "Profesional", start: "Empezar ensayo", again: "Describir otra", failed: "No se pudo preparar el escenario. Intenta de nuevo.", placeholder: "Pedirle un aumento a mi jefa después de dos años en el puesto" },
  en: { title: "Make one for you", meta: "Describe the conversation ahead of you. We build it, you review it, then rehearse.", describe: "What conversation do you want to practise?", describeHint: "One or two sentences. E.g.: asking my advisor for more time on chapter 3.", prepare: "Prepare scenario", preparing: "Preparing…", review: "Review and adjust before you start", fTitle: "Name", fRole: "Who you are talking to", fBrief: "The situation", fGoal: "What you want to achieve", domain: "Space", edu: "Education", pro: "Professional", start: "Start rehearsal", again: "Describe another", failed: "The scenario could not be prepared. Please try again.", placeholder: "Asking my manager for a raise after two years in the role" },
  pt: { title: "Criar sob medida", meta: "Descreva a conversa que você tem pela frente. Montamos, você revisa e ensaia.", describe: "Que conversa você quer praticar?", describeHint: "Uma ou duas frases. Ex.: pedir ao meu orientador mais tempo para o capítulo 3.", prepare: "Preparar cenário", preparing: "Preparando…", review: "Revise e ajuste antes de começar", fTitle: "Nome", fRole: "Com quem você fala", fBrief: "A situação", fGoal: "O que você quer alcançar", domain: "Espaço", edu: "Educação", pro: "Profissional", start: "Começar ensaio", again: "Descrever outra", failed: "Não foi possível preparar o cenário. Tente de novo.", placeholder: "Pedir um aumento à minha chefe depois de dois anos no cargo" },
  fr: { title: "Créer sur mesure", meta: "Décrivez la conversation qui vous attend. Nous la préparons, vous la relisez, puis vous la répétez.", describe: "Quelle conversation voulez-vous pratiquer ?", describeHint: "Une ou deux phrases. Ex. : demander plus de temps à mon directeur pour le chapitre 3.", prepare: "Préparer le scénario", preparing: "Préparation…", review: "Relisez et ajustez avant de commencer", fTitle: "Nom", fRole: "Votre interlocuteur", fBrief: "La situation", fGoal: "Ce que vous voulez obtenir", domain: "Espace", edu: "Éducation", pro: "Professionnel", start: "Commencer la répétition", again: "En décrire une autre", failed: "Le scénario n'a pas pu être préparé. Réessayez.", placeholder: "Demander une augmentation à ma responsable après deux ans" },
};

const LIMITS = { title: 90, role: 200, brief: 600, goal: 300 } as const;

export function CustomScenario() {
  const { locale } = useLocale();
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const language = locale === "es" || locale === "pt" || locale === "fr" ? locale : "en";
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initial = (params.get("q") ?? "").slice(0, 300);
  // The workspace it was asked from keeps the rehearsal in that world.
  const askedDomain = params.get("domain");
  const domain = askedDomain === "education" || askedDomain === "professional" ? askedDomain : undefined;
  const [request, setRequest] = useState(initial);
  const [draft, setDraft] = useState<CustomScenarioDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const asked = useRef(false);

  const prepare = async (text: string) => {
    if (text.trim().length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/training/custom/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: text.trim(), language, ...(domain ? { domain } : {}) }),
      });
      const body = (await res.json().catch(() => ({}))) as { scenario?: CustomScenarioDraft; error?: string };
      if (!res.ok || !body.scenario) throw new Error(body.error || copy.failed);
      setDraft(body.scenario);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : copy.failed);
    } finally {
      setBusy(false);
    }
  };

  // Arriving from the search with text already typed: start preparing at once,
  // once — the person already said what they want.
  useEffect(() => {
    if (asked.current || initial.trim().length < 3) return;
    asked.current = true;
    void prepare(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready =
    draft !== null &&
    draft.title.trim().length >= 3 &&
    draft.role.trim().length >= 3 &&
    draft.brief.trim().length >= 10 &&
    draft.goal.trim().length >= 10;

  const field = (key: "title" | "role" | "brief" | "goal", label: string, rows = 0) => (
    <Field label={label} htmlFor={`custom-${key}`}>
      {rows ? (
        <textarea
          id={`custom-${key}`}
          rows={rows}
          maxLength={LIMITS[key]}
          value={draft?.[key] ?? ""}
          onChange={(event) => setDraft((value) => (value ? { ...value, [key]: event.target.value } : value))}
          className="field-control resize-none text-sm leading-relaxed text-cream-bright"
        />
      ) : (
        <input
          id={`custom-${key}`}
          maxLength={LIMITS[key]}
          value={draft?.[key] ?? ""}
          onChange={(event) => setDraft((value) => (value ? { ...value, [key]: event.target.value } : value))}
          className="field-control text-sm text-cream-bright"
        />
      )}
    </Field>
  );

  return (
    <main>
      <PageHeader title={copy.title} meta={copy.meta} />
      <PageBody className="max-w-3xl space-y-6 pt-2">
        {error && <Notice tone="error">{error}</Notice>}

        {!draft ? (
          <Panel variant="raised" className="p-6 sm:p-8">
            <form
              className="flex flex-col gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                void prepare(request);
              }}
            >
              <Field label={copy.describe} htmlFor="custom-request">
                <textarea
                  id="custom-request"
                  rows={3}
                  maxLength={300}
                  value={request}
                  placeholder={copy.placeholder}
                  onChange={(event) => setRequest(event.target.value)}
                  className="field-control resize-none text-base leading-relaxed text-cream-bright placeholder:text-cream-faint"
                />
              </Field>
              <p className="text-xs text-cream-faint">{copy.describeHint}</p>
              <Action type="submit" disabled={busy || request.trim().length < 3} className="self-start">
                <Sparkles className="h-4 w-4" aria-hidden />
                {busy ? copy.preparing : copy.prepare}
              </Action>
            </form>
          </Panel>
        ) : (
          <Panel variant="raised" className="space-y-5 p-6 sm:p-8">
            <h2 className="text-lg font-semibold text-cream-bright">{copy.review}</h2>
            {field("title", copy.fTitle)}
            {field("role", copy.fRole)}
            {field("brief", copy.fBrief, 4)}
            {field("goal", copy.fGoal, 2)}
            {!domain && (<fieldset>
              <legend className="mb-2 text-sm font-medium text-cream-bright">{copy.domain}</legend>
              <div className="flex gap-2">
                {(["education", "professional"] as const).map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    aria-pressed={draft.domain === domain}
                    onClick={() => setDraft({ ...draft, domain })}
                    className="focus-ring rounded-full border border-line px-4 py-2 text-sm font-medium text-cream-bright aria-pressed:border-accent-border aria-pressed:bg-accent-soft aria-pressed:text-accent-text"
                  >
                    {domain === "education" ? copy.edu : copy.pro}
                  </button>
                ))}
              </div>
            </fieldset>)}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Action
                type="button"
                withArrow
                disabled={!ready}
                onClick={() =>
                  navigate(`/app/training/${draft.domain}`, {
                    state: {
                      custom: {
                        domain: draft.domain,
                        title: draft.title.trim(),
                        role: draft.role.trim(),
                        brief: draft.brief.trim(),
                        goal: draft.goal.trim(),
                      },
                    },
                  })
                }
              >
                {copy.start}
              </Action>
              <Action
                type="button"
                tone="quiet"
                onClick={() => {
                  setDraft(null);
                  setError(null);
                }}
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                {copy.again}
              </Action>
            </div>
          </Panel>
        )}
      </PageBody>
    </main>
  );
}
