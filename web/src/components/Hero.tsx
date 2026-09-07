import { Link } from "react-router-dom";
import { WordsPullUp, FadeRise, Action, HeroVideo, InsetFrame } from "@/design-system";
import { useT } from "@/hooks/useLocale";

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
  const t = useT();
  return (
    <InsetFrame className="on-media bg-surface-base">
      <HeroVideo src={HERO_VIDEO} />

      {/* The hero dissolves into the page rather than stopping at a line.
          Sits under the copy (z-10) so it fades the footage, not the words. */}
      <div
        aria-hidden
        className="hero-seam pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-16 md:h-20"
      />

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
              {t("land.heroBlurb")}
            </p>
          </FadeRise>
          <FadeRise delay={0.7}>
            <Link to="/app" className="self-start">
              <Action withArrow>{t("cta.startInterview")}</Action>
            </Link>
          </FadeRise>
        </div>
      </div>
    </InsetFrame>
  );
}
