import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, Compass, LayoutGrid, MessagesSquare, Search, Sparkles, X } from "lucide-react";
import { useLocale } from "@/hooks/useLocale";
import { customPath, searchItems, type SearchItem, type SearchKind } from "@/lib/search";

/**
 * The home screen's search: type what you want to practise, get the closest
 * things the app already has, and — always, as the last option — a rehearsal
 * made from exactly what you typed.
 *
 * The last option is never hidden, even when the matches are good: the point
 * is that the catalogue is a shortcut, not a limit. With nothing typed it
 * still offers to build one, so the field is useful before the first key.
 *
 * A combobox in the ARIA sense: focus stays in the field, the arrow keys move
 * the highlighted option, Enter opens it, Escape closes the list.
 */

const COPY = {
  es: { placeholder: "¿Qué quieres practicar? Ej. pedir un aumento, mi sustentación…", label: "Buscar en Mockio", custom: "Crear a tu medida", customEmpty: "Describe cualquier conversación y la armamos para ti", customWith: (q: string) => `Ensayar «${q}»`, clear: "Borrar búsqueda", suggestions: "Sugerencias", none: "Nada parecido todavía, pero puedes crearlo:" },
  en: { placeholder: "What do you want to practise? E.g. asking for a raise, my thesis defence…", label: "Search Mockio", custom: "Make one for you", customEmpty: "Describe any conversation and we'll build it for you", customWith: (q: string) => `Rehearse “${q}”`, clear: "Clear search", suggestions: "Suggestions", none: "Nothing like it yet, but you can make it:" },
  pt: { placeholder: "O que você quer praticar? Ex. pedir um aumento, minha defesa…", label: "Buscar no Mockio", custom: "Criar sob medida", customEmpty: "Descreva qualquer conversa e montamos para você", customWith: (q: string) => `Ensaiar “${q}”`, clear: "Limpar busca", suggestions: "Sugestões", none: "Nada parecido ainda, mas você pode criar:" },
  fr: { placeholder: "Que voulez-vous pratiquer ? Ex. demander une augmentation, ma soutenance…", label: "Rechercher dans Mockio", custom: "Créer sur mesure", customEmpty: "Décrivez une conversation et nous la préparons pour vous", customWith: (q: string) => `Répéter « ${q} »`, clear: "Effacer la recherche", suggestions: "Suggestions", none: "Rien de semblable pour l'instant, mais vous pouvez le créer :" },
};

const ICON: Record<SearchKind, typeof Search> = {
  section: LayoutGrid,
  scenario: MessagesSquare,
  case: Compass,
  interview: Briefcase,
};

export function useSearchCopy() {
  const { locale } = useLocale();
  return COPY[locale as keyof typeof COPY] ?? COPY.en;
}

export function OmniSearch({
  items,
  suggested = [],
  autoFocus = false,
  space,
  onDone,
}: {
  items: SearchItem[];
  /** Shown before anything is typed. */
  suggested?: SearchItem[];
  autoFocus?: boolean;
  /** The workspace it searches from: a rehearsal made here belongs to it. */
  space?: "defense" | "career";
  /** Called after an option is opened, e.g. to close a dialog around it. */
  onDone?: () => void;
}) {
  const copy = useSearchCopy();
  const navigate = useNavigate();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const matches = useMemo(
    () => (query.trim() ? searchItems(items, query) : suggested.slice(0, 5)),
    [items, query, suggested],
  );
  // The custom option is the last entry, always.
  const total = matches.length + 1;

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  // Clicking anywhere else closes the list; the field keeps its text.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const choose = (index: number) => {
    const item = matches[index];
    if (item) navigate(item.to, item.state ? { state: item.state } : undefined);
    else navigate(customPath(query, space));
    setOpen(false);
    onDone?.();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((value) => (value + 1) % total);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((value) => (value - 1 + total) % total);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(active);
    } else if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
    }
  };

  const optionId = (index: number) => `${listId}-option-${index}`;
  const trimmed = query.trim();

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex items-center gap-3 rounded-full bg-surface-card px-5 shadow-card ring-1 ring-[color:var(--line)] transition-shadow focus-within:shadow-lift focus-within:ring-2 focus-within:ring-[color:rgb(var(--accent-text))]">
        <Search className="h-5 w-5 shrink-0 text-cream-dim" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label={copy.label}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? optionId(active) : undefined}
          autoComplete="off"
          enterKeyHint="search"
          maxLength={300}
          value={query}
          placeholder={copy.placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-cream-bright outline-none placeholder:text-cream-faint [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            aria-label={copy.clear}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="focus-ring grid h-8 w-8 shrink-0 place-items-center rounded-full text-cream-dim hover:bg-surface-lift"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={copy.suggestions}
          className="absolute inset-x-0 top-full z-30 mt-2 max-h-[min(70vh,28rem)] overflow-y-auto rounded-2xl bg-surface-card p-2 shadow-float ring-1 ring-[color:var(--line)]"
        >
          {trimmed && matches.length === 0 && (
            <li role="presentation" className="px-3 pb-1 pt-2 text-xs text-cream-faint">
              {copy.none}
            </li>
          )}
          {matches.map((item, index) => {
            const Icon = ICON[item.kind];
            const selected = index === active;
            return (
              <li
                key={item.id}
                id={optionId(index)}
                role="option"
                aria-selected={selected}
                onPointerEnter={() => setActive(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(index)}
                className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 ${selected ? "bg-surface-lift" : ""}`}
              >
                <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface-base text-cream-dim">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-cream-bright">{item.title}</span>
                  <span className="block truncate text-xs text-cream-dim">{item.subtitle}</span>
                </span>
                {selected && <ArrowRight className="h-4 w-4 shrink-0 text-accent-text" aria-hidden />}
              </li>
            );
          })}
          {/* Always last, always there: the catalogue is a shortcut, not a limit. */}
          <li
            id={optionId(matches.length)}
            role="option"
            aria-selected={active === matches.length}
            onPointerEnter={() => setActive(matches.length)}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => choose(matches.length)}
            className={`mt-1 flex cursor-pointer items-center gap-3 rounded-xl border-t border-line px-3 py-2.5 ${
              active === matches.length ? "bg-accent-soft" : ""
            }`}
          >
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-ink">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-cream-bright">
                {trimmed ? copy.customWith(trimmed) : copy.custom}
              </span>
              <span className="block truncate text-xs text-accent-text">
                {trimmed ? copy.custom : copy.customEmpty}
              </span>
            </span>
          </li>
        </ul>
      )}
    </div>
  );
}
