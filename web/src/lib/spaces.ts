/**
 * The main thesis workspace and the secondary career tools.
 *
 * Sustentación is the thesis and everything around it; Profesional is what
 * comes after the defence — interviews, the path, applications. They were one
 * rail of seven entries. Each has its own navigation; Sustentación is the
 * default and Profesional is available in the workspace menu.
 */

export type Space = "defense" | "career";

/** The thesis workspace's sections, in the order a student needs them. */
export const THESIS_SECTIONS = ["ensayar", "diagnostico", "repaso", "diapositivas", "observaciones", "mas"] as const;
export type ThesisSection = (typeof THESIS_SECTIONS)[number];

export function isThesisSection(value: string | undefined | null): value is ThesisSection {
  return Boolean(value) && (THESIS_SECTIONS as readonly string[]).includes(value as string);
}

/** The address of a thesis section. Rehearsing is the workspace's front door. */
export function thesisPath(section: ThesisSection): string {
  return section === "ensayar" ? "/app" : `/app/tesis/${section}`;
}

/** Where each space opens. */
export const SPACE_HOME: Record<Space, string> = {
  defense: "/app",
  career: "/app/practice",
};

const DEFENSE_PREFIXES = ["/app/tesis", "/app/thesis", "/app/advisor"];
const CAREER_PREFIXES = [
  "/app/practice",
  "/app/session",
  "/app/feedback",
  "/app/progress",
  "/app/history",
  "/app/applications",
  "/app/profile",
  "/app/share",
  "/app/interviews",
];

/**
 * The space a path belongs to, or null for the screens both share — settings
 * and the review queue — which stay under whichever space was open.
 */
export function spaceOf(pathname: string): Space | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/app") return "defense";
  const within = (prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
  if (DEFENSE_PREFIXES.some(within)) return "defense";
  if (CAREER_PREFIXES.some(within)) return "career";
  return null;
}

export const SPACE_KEY = "mockio.space";

export function storedSpace(): Space {
  try {
    return localStorage.getItem(SPACE_KEY) === "career" ? "career" : "defense";
  } catch {
    return "defense";
  }
}

export function rememberSpace(space: Space): void {
  try {
    localStorage.setItem(SPACE_KEY, space);
    window.dispatchEvent(new CustomEvent("mockio:space", { detail: space }));
  } catch {
    // Private mode: the shared screens fall back to Sustentación.
  }
}
