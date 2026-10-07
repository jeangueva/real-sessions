/**
 * Dark, light, or whatever the machine says.
 *
 * Three states rather than two, because "follow the system" is a real answer
 * and collapsing it into a boolean means a candidate who switches their laptop
 * to light at dusk has to come back and switch this too.
 *
 * The choice lives in `localStorage` and nowhere else. It is per-device by
 * nature — the same person on a bright office monitor and a phone in bed does
 * not want one answer — and it is not worth a round trip before the first
 * paint.
 */

export type ThemeChoice = "dark" | "light" | "system";
export type Theme = "dark" | "light";

export const THEME_KEY = "realsessions.theme";

/**
 * Reads the stored choice. Nothing stored means light.
 *
 * It used to mean "follow the system", which on most laptops after dark meant
 * black — and the product is designed in light now: warm paper, the room you
 * rehearse in with the lights on. Following the machine is still on offer,
 * but as something a person picks, so it is stored like the other two.
 */
export function storedChoice(raw: string | null): ThemeChoice {
  return raw === "dark" || raw === "light" || raw === "system" ? raw : "light";
}

/** What a choice actually renders as, given what the machine prefers. */
export function resolveTheme(choice: ThemeChoice, prefersLight: boolean): Theme {
  if (choice === "system") return prefersLight ? "light" : "dark";
  return choice;
}

export function readChoice(): ThemeChoice {
  try {
    return storedChoice(localStorage.getItem(THEME_KEY));
  } catch {
    // Private windows and blocked site data both throw here.
    return "light";
  }
}

export function saveChoice(choice: ThemeChoice): void {
  try {
    if (choice === "light") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // The theme still applies for this visit; it just will not be remembered.
  }
}

export function systemPrefersLight(): boolean {
  return (
    typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: light)").matches
  );
}

/**
 * Puts the theme on the document.
 *
 * `data-theme` is only ever set to "light": the dark palette is what `:root`
 * declares, so the attribute is an override rather than a switch, and a page
 * that fails to run this JavaScript at all still renders the theme the product
 * was designed in.
 */
export function applyTheme(theme: Theme, root: HTMLElement): void {
  if (theme === "light") root.setAttribute("data-theme", "light");
  else root.removeAttribute("data-theme");
  // Native controls — scrollbars, form widgets, the caret — read this rather
  // than our variables, and a dark scrollbar on a white page is a giveaway.
  root.style.colorScheme = theme;
  // The phone's status bar, which follows `theme-color` rather than the page.
  // Both tags get the chosen theme's colour: a theme picked in the app
  // overrides the OS scheme the tags were written for.
  const bar = theme === "light" ? "#ffffff" : "#000000";
  root.ownerDocument
    ?.querySelectorAll('meta[name="theme-color"]')
    .forEach((tag) => tag.setAttribute("content", bar));
}
