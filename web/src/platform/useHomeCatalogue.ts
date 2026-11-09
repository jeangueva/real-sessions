import { useEffect, useMemo, useState } from "react";
import { fetchCatalogue } from "@/lib/api";
import type { CatalogueCompany, Role } from "@/lib/api";
import { useLocale, useT } from "@/hooks/useLocale";
import { useThesisT } from "@/lib/thesis-copy";
import { thesisPath, type Space } from "@/lib/spaces";
import type { SearchItem } from "@/lib/search";
import { CASE_ES, CASE_FR, CASE_PT, SCENARIO_ES, SCENARIO_FR, SCENARIO_PT } from "@/lib/training-copy";
import type { ScenarioItem } from "./TrainingConversations";
import type { IntuitionCaseItem } from "./IntuitionTrainer";

/**
 * What the home screen shows and searches: the rehearsal catalogue, the
 * product cases and the companies and roles to interview for, in the reader's
 * language.
 *
 * Fetched once per visit to the home screen. Each half fails on its own: a
 * home without the interview catalogue still has every rehearsal to show.
 */

type Lang = "es" | "en" | "pt" | "fr";

const KIND: Record<Lang, Record<IntuitionCaseItem["kind"] | "academic" | "work" | "personal" | "interview" | "section", string>> = {
  es: { prioritization: "Priorización", tradeoffs: "Trade-offs", hypotheses: "Hipótesis", academic: "Académico", work: "Trabajo", personal: "Personal y familiar", interview: "Entrevista", section: "Ir a" },
  en: { prioritization: "Prioritisation", tradeoffs: "Trade-offs", hypotheses: "Hypotheses", academic: "Academic", work: "Work", personal: "Personal and family", interview: "Interview", section: "Go to" },
  pt: { prioritization: "Priorização", tradeoffs: "Trade-offs", hypotheses: "Hipóteses", academic: "Acadêmico", work: "Trabalho", personal: "Pessoal e familiar", interview: "Entrevista", section: "Ir para" },
  fr: { prioritization: "Priorisation", tradeoffs: "Arbitrages", hypotheses: "Hypothèses", academic: "Académique", work: "Travail", personal: "Personnel et familial", interview: "Entretien", section: "Aller à" },
};

export interface HomeScenario extends ScenarioItem {
  /** "Académico", "Trabajo" or "Personal y familiar", already localised. */
  category: string;
}

export interface HomeCase extends IntuitionCaseItem {
  category: string;
}

export interface HomeCatalogue {
  loaded: boolean;
  scenarios: HomeScenario[];
  cases: HomeCase[];
  companies: CatalogueCompany[];
  roles: Role[];
  index: SearchItem[];
  kindLabel: (kind: keyof (typeof KIND)["es"]) => string;
}

export function useHomeCatalogue(): HomeCatalogue {
  const { locale } = useLocale();
  const t = useT();
  const tt = useThesisT();
  const lang: Lang = locale === "es" || locale === "pt" || locale === "fr" ? locale : "en";
  const [raw, setRaw] = useState<{ scenarios: ScenarioItem[]; intuition: IntuitionCaseItem[] } | null>(null);
  const [companies, setCompanies] = useState<CatalogueCompany[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const training = fetch("/api/training/catalogue")
      .then(async (res) => {
        if (!res.ok) throw new Error("catalogue");
        return (await res.json()) as { scenarios?: ScenarioItem[]; intuition?: IntuitionCaseItem[] };
      })
      .then((data) => {
        if (active) setRaw({ scenarios: data.scenarios ?? [], intuition: data.intuition ?? [] });
      })
      .catch(() => undefined);
    const interviews = fetchCatalogue()
      .then((data) => {
        if (!active) return;
        setCompanies(data.companies ?? []);
        setRoles(data.roles ?? []);
      })
      .catch(() => undefined);
    void Promise.allSettled([training, interviews]).then(() => {
      if (active) setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => {
    const kinds = KIND[lang];
    const scenarioCopy = lang === "es" ? SCENARIO_ES : lang === "fr" ? SCENARIO_FR : lang === "pt" ? SCENARIO_PT : null;
    const caseCopy = lang === "es" ? CASE_ES : lang === "fr" ? CASE_FR : lang === "pt" ? CASE_PT : null;

    const scenarios: HomeScenario[] = (raw?.scenarios ?? []).map((item) => ({
      ...item,
      ...(scenarioCopy?.[item.id] ?? {}),
      category: item.domain === "education" ? kinds.academic : item.personal ? kinds.personal : kinds.work,
    }));
    const cases: HomeCase[] = (raw?.intuition ?? []).map((item) => ({
      ...item,
      ...(caseCopy?.[item.id] ?? {}),
      category: kinds[item.kind],
    }));

    const sections: SearchItem[] = [
      { id: "s-rehearse", space: "defense", title: tt("tabRehearse"), to: thesisPath("ensayar"), keywords: "tesis sustentacion jurado thesis defense defesa" },
      { id: "s-diagnosis", space: "defense", title: tt("tabDiagnosis"), to: thesisPath("diagnostico"), keywords: "tesis thesis diagnostico" },
      { id: "s-study", space: "defense", title: tt("tabStudy"), to: thesisPath("repaso"), keywords: "tesis repaso estudio flashcards" },
      { id: "s-slides", space: "defense", title: tt("tabSlides"), to: thesisPath("diapositivas"), keywords: "tesis slides diapositivas presentacion" },
      { id: "s-observations", space: "defense", title: tt("tabObservations"), to: thesisPath("observaciones"), keywords: "tesis observaciones jurado correcciones" },
      { id: "s-academic", space: "defense", title: t("nav.academicScenarios"), to: "/app/training/education", keywords: "examen oral asesor grupo" },
      { id: "s-conversations", space: "career", title: t("nav.conversations"), to: "/app/training/professional", keywords: "conversaciones dificiles negociar feedback limites" },
      { id: "s-intuition", space: "career", title: t("nav.intuition"), to: "/app/intuition", keywords: "producto diseno casos criterio" },
      { id: "s-interviews", space: "career", title: t("nav.interviews"), to: "/app/practice", keywords: "entrevista trabajo empleo interview" },
      { id: "s-progress", space: "career", title: t("nav.progress"), to: "/app/progress", keywords: "progreso historial resultados" },
      { id: "s-applications", space: "career", title: t("nav.applications"), to: "/app/applications", keywords: "postulaciones empleos aplicaciones" },
      { id: "s-profile", space: "career", title: t("nav.context"), to: "/app/profile", keywords: "cv curriculum perfil contexto" },
      { id: "s-settings", title: t("nav.settings"), to: "/app/settings", keywords: "ajustes cuenta idioma configuracion" },
    ].map((entry) => ({ ...entry, kind: "section" as const, subtitle: kinds.section } as SearchItem));

    const index: SearchItem[] = [
      ...sections,
      ...scenarios.map((item) => ({
        id: `scenario-${item.id}`,
        kind: "scenario" as const,
        title: item.title,
        subtitle: item.category,
        keywords: `${item.role} ${item.brief}`,
        space: item.domain === "education" ? ("defense" as const) : ("career" as const),
        to: `/app/training/${item.domain}?id=${encodeURIComponent(item.id)}`,
      })),
      ...cases.map((item) => ({
        id: `case-${item.id}`,
        kind: "case" as const,
        title: item.title,
        subtitle: `${t("nav.intuition")} · ${item.category}`,
        keywords: item.prompt,
        space: "career" as const,
        to: `/app/intuition?id=${encodeURIComponent(item.id)}`,
      })),
      ...companies.map((company) => ({
        id: `company-${company.id}`,
        kind: "interview" as const,
        title: company.name,
        subtitle: kinds.interview,
        keywords: company.description,
        space: "career" as const,
        to: "/app/practice",
        state: { company: company.name },
      })),
      ...roles.map((role) => ({
        id: `role-${role.id}`,
        kind: "interview" as const,
        title: role.label,
        subtitle: kinds.interview,
        keywords: role.focus,
        space: "career" as const,
        to: "/app/practice",
        state: { role: role.label },
      })),
    ];

    return {
      loaded,
      scenarios,
      cases,
      companies,
      roles,
      index,
      kindLabel: (kind) => kinds[kind],
    };
  }, [raw, companies, roles, loaded, lang, t, tt]);
}

/**
 * The index for one workspace: Education searches only the academic world,
 * Professional only the working one. Screens both share, like settings, are
 * in both.
 */
export function indexFor(index: SearchItem[], space: Space): SearchItem[] {
  return index.filter((item) => !item.space || item.space === space);
}
