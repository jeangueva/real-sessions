import { Link } from "react-router-dom";
import { WordsPullUp, FadeRise, Action, HeroVideo, InsetFrame } from "@/design-system";
import { scrollToSection } from "@/lib/scroll-to-section";

/**
 * The landing page is one scroll, so the nav is anchors into it — a plain
 * `<a href="#id">` and not a `<Link>`, because React Router does not scroll to
 * a hash on its own. "Sign in" is the one item that leaves the page.
 *
 * Pricing and For teams used to sit here as dead `href="#"`. Pricing now has a
 * section to point at, so it is back; For teams still does not exist and stays
 * out until it does.
 */
const NAV = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Companies", href: "#companies" },
  { label: "Pricing", href: "#pricing" },
  { label: "Contribute", href: "#contribute" },
];

const navLink =
  "focus-ring whitespace-nowrap rounded-lg px-2 py-1.5 text-xs text-cream-dim transition-colors hover:text-cream-bright sm:text-sm";

/**
 * The showreel the reference decks all opened on.
 *
 * Served from this app rather than hotlinked: `public/hero.mp4`, transcoded
 * from the original 16 Mbit/s master down to a tenth of its size. A background
 * loop sits behind a scrim and is never the thing being read, so the bitrate
 * that master was graded at buys nothing and costs 19 MB before anyone reaches
 * the headline.
 *
 * `VITE_HERO_VIDEO` overrides it — for a CDN in production, or an empty string
 * to ship the CSS light field instead. `HeroVideo` also falls back to that
 * field for `prefers-reduced-motion` and for a file that fails to load, so the
 * layout below never depends on the video being there.
 */
const HERO_VIDEO = import.meta.env.VITE_HERO_VIDEO ?? "/hero.mp4";
export function Hero() {
  return (
    <InsetFrame className="bg-surface-base">
      <HeroVideo src={HERO_VIDEO} />

      <nav className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
        <ul className="flex items-center gap-1 rounded-b-2xl bg-black px-3 py-1.5 sm:gap-4 md:gap-10 md:rounded-b-3xl md:px-8">
          {/* The section anchors are hidden on a phone, where the labels at a
              readable size cannot fit across the frame and every one of them
              is reachable by scrolling anyway. Sign in stays: it is the only
              destination scrolling does not reach. */}
          {NAV.map(({ label, href }) => (
            <li key={label} className="hidden sm:block">
              {/* Still a real href, so it opens in a new tab, copies as a
                  link, and works before the JS lands. The handler only takes
                  over when it actually finds the section. */}
              <a
                href={href}
                className={navLink}
                onClick={(event) => {
                  if (scrollToSection(href)) event.preventDefault();
                }}
              >
                {label}
              </a>
            </li>
          ))}
          <li>
            <Link to="/signin" className={navLink}>
              Sign in
            </Link>
          </li>
        </ul>
      </nav>

      <div className="absolute bottom-0 left-0 right-0 z-10 grid grid-cols-1 gap-6 p-6 md:grid-cols-12 md:items-end md:gap-4 md:p-10">
        <h1 className="relative col-span-1 text-display font-medium text-cream-bright md:col-span-8">
          {/* `w-full`, not a max-width in `em`: an em-based cap scales with the
              font size, so at display size it can never constrain the text.
              Full width makes the flex-wrap break inside the h1's columns. */}
          <WordsPullUp className="w-full">Real Sessions</WordsPullUp>
        </h1>

        <div className="col-span-1 flex flex-col gap-5 pb-2 md:col-span-4">
          <FadeRise delay={0.5}>
            <p className="text-xs leading-tight text-cream-dim sm:text-sm md:text-base">
              Practice the interview in English before it counts. Real hiring
              managers from Stripe, Amazon and Airbnb — simulated, patient, and
              honest with you afterwards.
            </p>
          </FadeRise>
          <FadeRise delay={0.7}>
            <Link to="/app" className="self-start">
              <Action withArrow>Start an interview</Action>
            </Link>
          </FadeRise>
        </div>
      </div>
    </InsetFrame>
  );
}
