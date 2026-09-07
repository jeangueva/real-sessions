import { Link } from "react-router-dom";
import { Wordmark } from "@/design-system";
import { useLocale } from "@/hooks/useLocale";
import { privacyFor, termsFor } from "@/legal/content";

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
  const { locale } = useLocale();
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
        <nav className="flex items-center gap-5">
          <Link to="/terms" className={link}>
            {termsFor(locale).title}
          </Link>
          <Link to="/privacy" className={link}>
            {privacyFor(locale).title}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
