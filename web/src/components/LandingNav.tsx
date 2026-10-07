import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { scrollToSection } from "@/lib/scroll-to-section";
import { useT } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n";
import { Wordmark } from "@/design-system";

/**
 * The landing nav: one translucent bar, pinned, the same at every scroll
 * position.
 *
 * It used to be two things — a floating dark pill over the footage and a bar
 * once past it — because the hero was footage edge to edge. The hero is on
 * the page's own ground now, so the bar has one job and one look: Apple's
 * toolbar material, with the content scrolling underneath it. The name on the
 * left goes home, the sections sit in the middle, and the way in is on the
 * right where both references put it.
 */

const NAV: { label: MessageKey; href: string }[] = [
  { label: "land.navHow", href: "#how-it-works" },
  { label: "land.navCompanies", href: "#companies" },
  { label: "land.navPricing", href: "#pricing" },
  { label: "land.navContribute", href: "#contribute" },
];

export function LandingNav() {
  const t = useT();
  /* The hairline under the bar appears only once something has scrolled
     beneath it — a divider with nothing to divide is just a line. */
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const link =
    "focus-ring whitespace-nowrap rounded-full px-3 py-1.5 text-xs text-cream-dim transition-colors duration-200 hover:text-cream-bright";

  return (
    <header
      className={`nav-lifted fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)] transition-[border-color] duration-300 ${
        scrolled ? "" : "!border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <a
          href="#top"
          aria-label="mockio"
          className="focus-ring rounded-md"
          onClick={(event) => {
            event.preventDefault();
            window.scrollTo({ top: 0 });
          }}
        >
          <Wordmark className="text-xl font-semibold text-cream-bright" />
        </a>

        {/* Hidden on a phone: four labels do not fit beside the name and the
            way in, and every one of them is reachable by scrolling. */}
        <ul className="hidden items-center gap-1 md:flex">
          {NAV.map(({ label, href }) => (
            <li key={label}>
              {/* A real href, so it opens in a new tab, copies as a link, and
                  works before the JS lands. */}
              <a
                href={href}
                className={link}
                onClick={(event) => {
                  if (scrollToSection(href)) event.preventDefault();
                }}
              >
                {t(label)}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1">
          <Link to="/signin" className={link}>
            {t("land.signIn")}
          </Link>
          <Link
            to="/app"
            className="focus-ring hidden rounded-full bg-cream-bright px-4 py-1.5 text-xs font-medium text-surface-base transition-[transform,opacity] duration-200 ease-press hover:opacity-85 active:scale-[0.97] sm:inline-flex"
          >
            {t("cta.startInterview")}
          </Link>
        </div>
      </nav>
    </header>
  );
}
