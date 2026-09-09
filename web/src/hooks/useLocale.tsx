import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  directionOf,
  loadDictionary,
  readLocale,
  saveLocale,
  translate,
  type Locale,
  type MessageKey,
} from "@/lib/i18n";

/**
 * The interface language, and the `t` every screen reads from.
 *
 * Context rather than a module-level variable so that changing it re-renders
 * the app — a language setting that needs a reload is one people assume did
 * not work.
 */

interface LocaleValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setStored] = useState<Locale>(() => readLocale());
  /**
   * Bumped when a dictionary finishes loading.
   *
   * Dictionaries are fetched rather than bundled, so the first render after a
   * language change still has the old one — English on a first visit. Nothing
   * in the returned value changes when the fetch resolves, so without this the
   * screen would keep the previous language until some other state happened to
   * re-render it.
   */
  const [loadedAt, setLoadedAt] = useState(0);

  useEffect(() => {
    let live = true;
    void loadDictionary(locale).then(() => {
      if (live) setLoadedAt((n) => n + 1);
    });
    return () => {
      live = false;
    };
  }, [locale]);

  // Screen readers and the browser's own spellcheck read this, and it is what
  // tells Safari not to offer to translate a page that is already in the
  // reader's language.
  useEffect(() => {
    document.documentElement.lang = locale;
    // Arabic and Hebrew read right to left. Setting it on the root is what
    // flips the whole layout, including anything using logical properties.
    document.documentElement.dir = directionOf(locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    saveLocale(next);
    setStored(next);
  }, []);

  const value = useMemo<LocaleValue>(
    () => ({
      locale,
      setLocale,
      t: (key, values) => translate(locale, key, values),
    }),
    // `loadedAt` is not read here, and that is the point: it changes identity
    // so every consumer re-runs `t` against the dictionary that just arrived.
    [locale, setLocale, loadedAt],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * Falls back to English rather than throwing outside a provider.
 *
 * A missing provider is a wiring mistake, and one that should surface as a
 * screen in the wrong language during development — not as a blank page in
 * front of a candidate.
 */
export function useLocale(): LocaleValue {
  return (
    useContext(LocaleContext) ?? {
      locale: "en",
      setLocale: () => undefined,
      t: (key, values) => translate("en", key, values),
    }
  );
}

/** The common case: just the lookup. */
export function useT() {
  return useLocale().t;
}
