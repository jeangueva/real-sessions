import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
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

  // Screen readers and the browser's own spellcheck read this, and it is what
  // tells Safari not to offer to translate a page that is already in the
  // reader's language.
  useEffect(() => {
    document.documentElement.lang = locale;
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
    [locale, setLocale],
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
