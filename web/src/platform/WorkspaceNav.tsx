import { Link, useLocation } from "react-router-dom";
import { Briefcase, GraduationCap } from "lucide-react";
import { useT } from "@/hooks/useLocale";
import { rememberSpace, SPACE_HOME, spaceOf, type Space } from "@/lib/spaces";

/** Both workspaces stay visible, including at narrow mobile widths. */
export function WorkspaceNav({ space }: { space: Space }) {
  const t = useT();
  const location = useLocation();
  const shared = spaceOf(location.pathname) === null;
  return (
    <nav aria-label={t("nav.spaces")} className="flex min-w-0 flex-1 items-center gap-1">
      {(["defense", "career"] as const).map((next) => {
        const Icon = next === "defense" ? GraduationCap : Briefcase;
        return (
          <Link key={next} to={shared ? location.pathname + location.search + location.hash : SPACE_HOME[next]}
            onClick={() => rememberSpace(next)} aria-current={space === next ? "page" : undefined}
            className={`focus-ring flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-2 text-xs font-semibold sm:px-3 sm:text-sm ${space === next ? "bg-accent-soft text-accent-text" : "text-cream-dim hover:bg-surface-lift"}`}>
            <Icon className="hidden h-4 w-4 shrink-0 sm:block" aria-hidden />
            <span>{t(next === "defense" ? "nav.education" : "nav.spaceCareer")}</span>
          </Link>
        );
      })}
    </nav>
  );
}
