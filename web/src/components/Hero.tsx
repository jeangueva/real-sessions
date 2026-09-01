import { Link } from "react-router-dom";
import { WordsPullUp, FadeRise, Action, HeroVideo, InsetFrame } from "@/design-system";

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
 * `VITE_HERO_VIDEO` is the source. It is configuration rather than a constant
 * because the footage is the one asset in this build that is not generated from
 * tokens: it can be replaced, it can 404, and it is exactly the thing someone
 * on a metered connection or `prefers-reduced-motion` should not be served.
 * `HeroVideo` falls back to the CSS light field in all three cases, so the
 * layout below never changes.
 */
export function Hero() {
  return (
    <InsetFrame className="bg-surface-base">
      <HeroVideo src={import.meta.env.VITE_HERO_VIDEO} />

      <nav className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
        <ul className="flex items-center gap-1 rounded-b-2xl bg-black px-3 py-1.5 sm:gap-4 md:gap-10 md:rounded-b-3xl md:px-8">
          {/* The section anchors are hidden on a phone, where the labels at a
              readable size cannot fit across the frame and every one of them
              is reachable by scrolling anyway. Sign in stays: it is the only
              destination scrolling does not reach. */}
          {NAV.map(({ label, href }) => (
            <li key={label} className="hidden sm:block">
              <a href={href} className={navLink}>
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
