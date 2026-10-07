import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { WordsPullUp, FadeRise, Action, HeroVideo } from "@/design-system";
import { useT } from "@/hooks/useLocale";
import { scrollToSection } from "@/lib/scroll-to-section";

/**
 * The showreel the reference decks all opened on.
 *
 * Served from this app rather than hotlinked: `public/hero-2.mp4`, transcoded
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
const HERO_VIDEO = import.meta.env.VITE_HERO_VIDEO ?? "/hero-2.mp4";

/**
 * A still from the video itself, three seconds in.
 *
 * Shown whenever the video is not playing — most often because iOS refuses
 * autoplay in Low Power Mode, which is how a large share of phones spend
 * their day. Those readers were getting a dark gradient where the one
 * picture of what this product is should be. 49 KB against the video's two
 * megabytes, and it is the first thing painted either way.
 */
const HERO_POSTER = "/hero-2.jpg";
/**
 * The hero, the way Apple opens a product page: the sentence first, centred,
 * set large and tight; the two ways forward under it; then the picture, framed
 * and given the width of the page.
 *
 * It used to be the reverse — footage edge to edge with the name in the corner
 * — which is a film's title card. A visitor here has one question, "what is
 * this and is it for me", and the answer belongs where the eye lands first.
 */
export function Hero() {
  const t = useT();
  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-36 lg:px-10">
      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <h1 className="text-balance text-headline font-semibold text-cream-bright">
          <WordsPullUp align="center" className="w-full">{t("land.heroBlurb")}</WordsPullUp>
        </h1>
        <FadeRise delay={0.35} className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link to="/app">
            <Action withArrow className="px-6 py-3 text-base">
              {t("cta.startInterview")}
            </Action>
          </Link>
          <a
            href="#how-it-works"
            onClick={(event) => {
              if (scrollToSection("#how-it-works")) event.preventDefault();
            }}
            className="focus-ring group inline-flex items-center gap-1 rounded-full px-4 py-3 text-base font-medium text-accent-text transition-opacity hover:opacity-80"
          >
            {t("land.navHow")}
            <ChevronRight
              aria-hidden
              className="h-4 w-4 transition-transform duration-200 ease-press group-hover:translate-x-0.5 rtl:-scale-x-100"
            />
          </a>
        </FadeRise>
      </div>

      {/* The picture, framed. Dark footage stays on a dark island in both
          themes, so the pinned `on-media` ink keeps anything laid over it
          legible whatever the page around it is doing. */}
      <FadeRise delay={0.5} className="mx-auto mt-14 max-w-6xl sm:mt-20">
        <div className="on-media relative aspect-[4/5] overflow-hidden rounded-inset bg-surface-base shadow-float sm:aspect-video">
          <HeroVideo bare src={HERO_VIDEO} poster={HERO_POSTER} />
        </div>
      </FadeRise>
    </section>
  );
}
