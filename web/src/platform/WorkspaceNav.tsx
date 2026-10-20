import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Briefcase, ChevronDown, GraduationCap } from "lucide-react";
import { useT } from "@/hooks/useLocale";
import { rememberSpace, SPACE_HOME, spaceOf, type Space } from "@/lib/spaces";

/** Thesis is the main product; career tools remain in the workspace menu. */
export function WorkspaceNav({ space }: { space: Space }) {
  const t = useT();
  const location = useLocation();
  const shared = spaceOf(location.pathname) === null;
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const other: Space = space === "defense" ? "career" : "defense";
  const CurrentIcon = space === "defense" ? GraduationCap : Briefcase;
  const OtherIcon = space === "defense" ? Briefcase : GraduationCap;

  useEffect(() => setOpen(false), [location.key, space]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const destination = (next: Space) => shared ? location.pathname : SPACE_HOME[next];
  const choose = (next: Space) => {
    rememberSpace(next);
    setOpen(false);
  };

  return (
    <nav
      ref={root}
      aria-label={t("nav.spaces")}
      className="relative flex min-w-0 flex-1 items-center gap-1"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Link
        to={destination(space)}
        onClick={() => choose(space)}
        aria-current="page"
        className={`focus-ring flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-2 text-sm font-semibold transition-[color,transform] duration-150 ease-press active:scale-[0.97] sm:px-3 sm:text-base ${
          space === "defense" ? "text-cream-bright" : "text-cream-dim hover:text-cream-bright"
        }`}
      >
        <CurrentIcon className="hidden h-5 w-5 shrink-0 text-accent-text sm:block" aria-hidden />
        <span className="truncate">{t(space === "defense" ? "nav.spaceDefense" : "nav.spaceCareer")}</span>
      </Link>
      <button
        ref={trigger}
        type="button"
        aria-label={t("nav.spaces")}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
        className="focus-ring flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-lg px-2 text-sm text-cream-dim transition-[background-color,transform] duration-150 ease-press hover:bg-surface-lift active:scale-[0.97]"
      >
        <ChevronDown className="h-4 w-4" aria-hidden />
      </button>
      {open && (
        <div id={id} className="absolute start-0 top-full z-50 mt-2 w-56 max-w-[calc(100vw-5rem)] rounded-xl border border-line bg-surface-card p-1.5 shadow-lift">
          <Link
            to={destination(other)}
            onClick={() => choose(other)}
            className="focus-ring flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-cream-dim transition-[background-color,transform] duration-150 ease-press hover:bg-surface-lift hover:text-cream-bright active:scale-[0.98]"
          >
            <OtherIcon className="h-4 w-4 shrink-0" aria-hidden />
            {t(other === "career" ? "nav.spaceCareer" : "nav.spaceDefense")}
          </Link>
        </div>
      )}
    </nav>
  );
}
