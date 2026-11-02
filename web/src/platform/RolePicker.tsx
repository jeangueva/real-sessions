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
  return locale === "pt" ? "Ou ajuste a entrevista" : locale === "en" ? "Or tune the interview" : "O ajusta la entrevista";
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
  const c = locale === "pt" ? COPY.pt : locale === "en" ? COPY.en : COPY.es;
  const areaName = (area: Area) =>
    (locale === "pt" ? AREA_PT[area.id] : locale === "en" ? undefined : AREA_ES[area.id]) ?? area.label;
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
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {grouped.map(({ area, roles: inArea }) => (
            <li key={area.id}>
              <button
                type="button"
                onClick={() => setOpen(area.id)}
                className="focus-ring group flex h-full w-full flex-col items-start gap-4 rounded-[1.375rem] bg-surface-card p-4 text-left ring-1 ring-[color:var(--line)] transition-[transform,box-shadow] duration-150 ease-press hover:ring-[color:var(--line-strong)] active:scale-[0.98] sm:p-5"
              >
                <span className="flex w-full items-start justify-between gap-2">
                  <AreaIcon id={area.id} />
                  <span className="rounded-full bg-surface-lift px-2.5 py-1 font-mono text-xs font-medium uppercase tracking-[0.04em] text-cream-dim">
                    {inArea.length}
                  </span>
                </span>
                <span className="text-lg font-medium leading-tight tracking-[-0.01em] text-cream-bright">{areaName(area)}</span>
                <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-accent-text">
                  {c.see}
                  <ArrowRight aria-hidden className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                </span>
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
      className={`grid shrink-0 place-items-center rounded-2xl bg-accent-soft text-accent-text ${large ? "h-14 w-14" : "h-11 w-11"}`}
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
