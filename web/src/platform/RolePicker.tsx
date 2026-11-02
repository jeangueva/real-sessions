/**
 * Picking the interview the way a candidate thinks about it: first the field,
 * then the job, then go.
 *
 * The filter bar asks someone to assemble an interview out of six settings
 * before they have seen what there is. This shows what there is — twelve
 * fields, the jobs in each, what each job gets asked — and starts the
 * interview from the job itself. The bar stays below it for anyone who wants
 * to change the round, the language or the level first.
 */
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Briefcase,
  Code2,
  Handshake,
  HeartHandshake,
  Landmark,
  LayoutGrid,
  Megaphone,
  Palette,
  Rocket,
  Scale,
  Search,
  Settings2,
  Users,
} from "lucide-react";
import type { Area, Role } from "@/lib/api";
import { useLocale } from "@/hooks/useLocale";

const ICON: Record<string, typeof Code2> = {
  engineering: Code2,
  product: LayoutGrid,
  design: Palette,
  data: BarChart3,
  growth: Rocket,
  marketing: Megaphone,
  finance: Landmark,
  legal: Scale,
  people: Users,
  sales: Handshake,
  "customer-success": HeartHandshake,
  operations: Settings2,
};

const AREA_ES: Record<string, string> = {
  engineering: "Ingeniería",
  product: "Producto",
  design: "Diseño",
  data: "Datos",
  growth: "Growth",
  marketing: "Marketing",
  finance: "Finanzas",
  legal: "Legal",
  people: "Personas",
  sales: "Ventas",
  "customer-success": "Éxito del cliente",
  operations: "Operaciones",
};
const AREA_PT: Record<string, string> = {
  ...AREA_ES,
  engineering: "Engenharia",
  product: "Produto",
  design: "Design",
  data: "Dados",
  finance: "Finanças",
  people: "Pessoas",
  sales: "Vendas",
  "customer-success": "Sucesso do cliente",
  operations: "Operações",
};

const AREA_FR: Record<string, string> = {
  engineering: "Ingénierie",
  product: "Produit",
  design: "Design",
  data: "Données",
  growth: "Growth",
  marketing: "Marketing",
  finance: "Finance",
  legal: "Juridique",
  people: "RH",
  sales: "Ventes",
  "customer-success": "Succès client",
  operations: "Opérations",
};

const COPY = {
  es: {
    search: "Busca un puesto: backend, ventas, analista…",
    areas: "{count} áreas",
    jobs: "{count} puestos",
    see: "Ver puestos",
    back: "Todas las áreas",
    areaTitle: "Entrevistas de {area}",
    areaSub: "{count} puestos para practicar",
    meta: "≈ 10 min",
    turns: "7 preguntas",
    start: "Empezar entrevista",
    none: "No encontramos «{query}». Prueba con otra palabra.",
  },
  pt: {
    search: "Busque uma vaga: backend, vendas, analista…",
    areas: "{count} áreas",
    jobs: "{count} vagas",
    see: "Ver vagas",
    back: "Todas as áreas",
    areaTitle: "Entrevistas de {area}",
    areaSub: "{count} vagas para praticar",
    meta: "≈ 10 min",
    turns: "7 perguntas",
    start: "Começar entrevista",
    none: "Não encontramos «{query}». Tente outra palavra.",
  },
  fr: {
    search: "Cherchez un poste : backend, ventes, analyste…",
    areas: "{count} domaines",
    jobs: "{count} postes",
    see: "Voir les postes",
    back: "Tous les domaines",
    areaTitle: "Entretiens en {area}",
    areaSub: "{count} postes à pratiquer",
    meta: "≈ 10 min",
    turns: "7 questions",
    start: "Commencer l’entretien",
    none: "Rien ne correspond à « {query} ». Essayez un autre mot.",
  },
  en: {
    search: "Search a job: backend, sales, analyst…",
    areas: "{count} fields",
    jobs: "{count} jobs",
    see: "See jobs",
    back: "All fields",
    areaTitle: "{area} interviews",
    areaSub: "{count} jobs to practise",
    meta: "≈ 10 min",
    turns: "7 questions",
    start: "Start interview",
    none: "Nothing matches “{query}”. Try another word.",
  },
};

/** The label over the settings bar, under the picker. */
export function useTuneLabel(): string {
  const { locale } = useLocale();
  return locale === "pt" ? "Ou ajuste a entrevista" : locale === "es" ? "O ajusta la entrevista" : locale === "fr" ? "Ou réglez l’entretien" : "Or tune the interview";
}

const fill = (text: string, values: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));

/** "systems, data modelling, and scale" → "Systems, data modelling, and scale." */
const sentence = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return "";
  return trimmed[0]!.toUpperCase() + trimmed.slice(1) + (/[.!?]$/.test(trimmed) ? "" : ".");
};

export function RolePicker({
  areas,
  roles,
  onStart,
  disabled = false,
}: {
  areas: Area[];
  roles: Role[];
  /** Starts the interview for this role, with the current settings. */
  onStart: (role: Role) => void;
  disabled?: boolean;
}) {
  const { locale } = useLocale();
  const c = locale === "pt" ? COPY.pt : locale === "es" ? COPY.es : locale === "fr" ? COPY.fr : COPY.en;
  const areaName = (area: Area) =>
    (locale === "pt" ? AREA_PT[area.id] : locale === "es" ? AREA_ES[area.id] : locale === "fr" ? AREA_FR[area.id] : undefined) ?? area.label;
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const grouped = useMemo(
    () =>
      areas
        .map((area) => ({ area, roles: roles.filter((role) => role.area === area.id) }))
        .filter((group) => group.roles.length > 0),
    [areas, roles],
  );
  const needle = query.trim().toLowerCase();
  const found = needle
    ? roles.filter((role) => {
        const area = areas.find((entry) => entry.id === role.area);
        return [role.label, role.focus, area ? areaName(area) : ""].some((text) => text.toLowerCase().includes(needle));
      })
    : null;
  const current = grouped.find((group) => group.area.id === open) ?? null;

  if (grouped.length === 0) return null;

  return (
    <section className="flex flex-col gap-5">
      <label className="relative block">
        <span className="sr-only">{c.search}</span>
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-dim" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={c.search}
          className="focus-ring w-full rounded-2xl bg-surface-card py-3.5 pl-11 pr-4 text-base text-cream-bright ring-1 ring-[color:var(--line)] placeholder:text-cream-faint"
        />
      </label>

      {found ? (
        found.length > 0 ? (
          <RoleGrid roles={found} c={c} onStart={onStart} disabled={disabled} />
        ) : (
          <p className="text-base text-cream-dim">{fill(c.none, { query: query.trim() })}</p>
        )
      ) : current ? (
        <div className="flex flex-col gap-5">
          <button
            type="button"
            onClick={() => setOpen(null)}
            className="focus-ring inline-flex items-center gap-2 self-start rounded-full py-1 text-sm font-semibold text-cream-bright"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            {c.back}
          </button>
          <div className="flex items-center gap-4">
            <AreaIcon id={current.area.id} large />
            <div>
              <h2 className="text-2xl font-light tracking-[-0.03em] text-cream-bright sm:text-3xl">
                {fill(c.areaTitle, { area: areaName(current.area) })}
              </h2>
              <p className="mt-0.5 text-sm text-cream-dim">{fill(c.areaSub, { count: current.roles.length })}</p>
            </div>
          </div>
          <RoleGrid roles={current.roles} c={c} onStart={onStart} disabled={disabled} />
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
          {grouped.map(({ area, roles: inArea }) => (
            <li key={area.id}>
              <button
                type="button"
                onClick={() => setOpen(area.id)}
                className="focus-ring group flex h-full w-full items-center gap-3 rounded-2xl bg-surface-card p-3 text-left ring-1 ring-[color:var(--line)] transition-[transform,box-shadow] duration-150 ease-press hover:ring-[color:var(--line-strong)] active:scale-[0.98] sm:p-4"
              >
                <AreaIcon id={area.id} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium leading-tight text-cream-bright">{areaName(area)}</span>
                  <span className="block text-xs text-cream-dim">{fill(c.jobs, { count: inArea.length })}</span>
                </span>
                <ArrowRight aria-hidden className="hidden h-4 w-4 shrink-0 text-cream-dim transition-transform duration-150 group-hover:translate-x-0.5 sm:block" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function AreaIcon({ id, large = false }: { id: string; large?: boolean }) {
  const Icon = ICON[id] ?? Briefcase;
  return (
    <span
      aria-hidden
      className={`grid shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text ${large ? "h-14 w-14" : "h-9 w-9 sm:h-11 sm:w-11"}`}
    >
      <Icon className={large ? "h-6 w-6" : "h-5 w-5"} />
    </span>
  );
}

function RoleGrid({
  roles,
  c,
  onStart,
  disabled,
}: {
  roles: Role[];
  c: (typeof COPY)["es"];
  onStart: (role: Role) => void;
  disabled: boolean;
}) {
  return (
    <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {roles.map((role) => (
        <li key={role.id} className="flex flex-col gap-4 rounded-[1.375rem] bg-surface-card p-5 ring-1 ring-[color:var(--line)]">
          <div>
            <h3 className="text-lg font-medium tracking-[-0.01em] text-cream-bright">{role.label}</h3>
            {/* The interview runs in English, and so does what it covers. */}
            <p lang="en" className="mt-1.5 text-sm leading-relaxed text-cream-dim">
              {sentence(role.focus)}
            </p>
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
            <span className="flex gap-2 font-mono text-xs uppercase tracking-[0.04em] text-cream-dim">
              <span className="rounded-full bg-surface-lift px-2.5 py-1">{c.meta}</span>
              <span className="rounded-full bg-surface-lift px-2.5 py-1">{c.turns}</span>
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onStart(role)}
              className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition-transform duration-150 ease-press active:scale-[0.97] disabled:opacity-50"
            >
              {c.start}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
