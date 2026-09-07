import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { scrollToSection } from "@/lib/scroll-to-section";
import { useT } from "@/hooks/useLocale";
import type { MessageKey } from "@/lib/i18n";

/**
 * The landing nav, fixed to the top of the page.
 *
 * It used to hang off the top edge of the hero frame and scroll away with it,
 * which meant the only way back to a section was to scroll all the way up. It
 * also sat flush against that edge — square-cornered against a rounded frame,
 * with no room above it — so on a laptop it read as clipped rather than as
 * placed.
 *
 * Fixed solves the first problem and creates a second one: a bar pinned over
 * the hero would cover the footage it is sitting on. So it carries no surface
 * while the hero is behind it, and takes one only once there is text
 * underneath — where a transparent bar would be unreadable instead.
 */

const NAV: { label: MessageKey; href: string }[] = [
  { label: "land.navEarly", href: "#early-access" },
  { label: "land.navHow", href: "#how-it-works" },
  { label: "land.navCompanies", href: "#companies" },
  { label: "land.navPricing", href: "#pricing" },
  { label: "land.navContribute", href: "#contribute" },
];

/**
 * How far down the page the bar stops being over the hero.
 *
 * The hero is one viewport tall inside its own padding, so most of a screen
 * height is the honest boundary. Read from `innerHeight` at scroll time rather
 * than captured once, because a phone's viewport changes when the URL bar
 * retracts and a value measured at mount is wrong by then.
 */
function pastHero(scrollY: number, viewportHeight: number): boolean {
  return scrollY > viewportHeight * 0.75;
}

export function LandingNav() {
  const t = useT();
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const onScroll = () => setLifted(pastHero(window.scrollY, window.innerHeight));
    onScroll(); // A reload partway down the page starts in the right state.
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const link =
    "focus-ring whitespace-nowrap rounded-lg px-2.5 py-2 text-xs transition-colors sm:text-sm";

  return (
    <div
      /* `on-media` while it floats over the footage, so the labels stay light
         whatever the page theme is. Once lifted it drops the island and takes
         the page's own ink, which is what makes it readable on a light page. */
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color] duration-300 ${
        lifted ? "nav-lifted" : "on-media"
      }`}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-center px-4 py-3 md:px-8 md:py-4">
        <ul className="flex items-center gap-1 sm:gap-4 md:gap-8">
          {/* Hidden on a phone, where five labels at a readable size do not fit
              across the screen and every one of them is reachable by
              scrolling. Sign in stays: scrolling does not reach it. */}
          {NAV.map(({ label, href }) => (
            <li key={label} className="hidden sm:block">
              {/* A real href, so it opens in a new tab, copies as a link, and
                  works before the JS lands. The handler only takes over when
                  it actually finds the section. */}
              <a
                href={href}
                className={`${link} text-cream-dim hover:text-cream-bright`}
                onClick={(event) => {
                  if (scrollToSection(href)) event.preventDefault();
                }}
              >
                {t(label)}
              </a>
            </li>
          ))}
          <li>
            <Link to="/signin" className={`${link} text-cream-dim hover:text-cream-bright`}>
              {t("land.signIn")}
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
