import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  readChoice,
  resolveTheme,
  saveChoice,
  systemPrefersLight,
  type Theme,
  type ThemeChoice,
} from "@/lib/theme";

/**
 * The theme, and the one place allowed to change it.
 *
 * Watches `prefers-color-scheme` while the choice is "system", so a laptop
 * that switches at dusk takes the app with it rather than waiting for a
 * reload. Stops watching the moment someone picks a side — that is what
 * picking a side means.
 */
export function useTheme(): {
  choice: ThemeChoice;
  theme: Theme;
  setChoice: (next: ThemeChoice) => void;
} {
  const [choice, setStored] = useState<ThemeChoice>(() => readChoice());
  const [prefersLight, setPrefersLight] = useState(() => systemPrefersLight());

  useEffect(() => {
    if (choice !== "system" || typeof matchMedia !== "function") return;
    const query = matchMedia("(prefers-color-scheme: light)");
    const onChange = (event: MediaQueryListEvent) => setPrefersLight(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [choice]);

  const theme = resolveTheme(choice, prefersLight);

  useEffect(() => {
    applyTheme(theme, document.documentElement);
  }, [theme]);

  const setChoice = useCallback((next: ThemeChoice) => {
    saveChoice(next);
    setStored(next);
    // Re-read rather than trust the last known value: the system may have
    // changed while a fixed choice was in force.
    setPrefersLight(systemPrefersLight());
  }, []);

  return { choice, theme, setChoice };
}
