import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import { Wordmark } from "@/design-system";
import { useLocale, useT } from "@/hooks/useLocale";
import { LOCALES, type Locale } from "@/lib/i18n";
import { privacyFor, termsFor, legalLocale } from "@/legal/content";

/**
 * The landing's footer.
 *
 * It exists for one reason: the terms and the privacy policy have to be
 * reachable from the public page without an account, and a payment provider
 * checks for exactly that before approving a production account.
 *
 * Deliberately small. Nothing else belongs here yet — a footer full of links
 * to pages that do not exist is worse than a thin one.
 */
export function SiteFooter() {
  const { locale, setLocale } = useLocale();
  const t = useT();
  const year = new Date().getFullYear();

  const link =
    "focus-ring rounded text-xs text-cream-dim transition-colors hover:text-cream-bright";

  return (
    <footer className="border-t border-line bg-surface-base">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-3 text-xs text-cream-faint">
          <Wordmark className="text-sm font-semibold text-cream-bright" />
          <span>© {year}</span>
        </p>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link to="/terms" className={link}>
            {termsFor(legalLocale(locale)).title}
          </Link>
          <Link to="/privacy" className={link}>
            {privacyFor(legalLocale(locale)).title}
          </Link>

          {/* The interface language, reachable before signing up.
              It lived only in Settings, which is behind the app — so the one
              visitor most likely to need another language, the one deciding
              whether to sign up at all, was the one who could not change it.

              A select rather than a row of links: the list is about to be
              long enough that laying it out flat would take over the footer,
              and a native select is what a phone renders best anyway. */}
          <label className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5 text-cream-faint" aria-hidden />
            <span className="sr-only">{t("settings.interfaceLanguage")}</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
              className="focus-ring cursor-pointer rounded border border-line-strong bg-transparent px-2 py-1 text-xs text-cream-dim transition-colors hover:text-cream-bright"
            >
              {LOCALES.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
        </nav>
      </div>
    </footer>
  );
}
