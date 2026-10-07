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
 * The hero: one screen, the footage as its ground, the sentence on top.
 *
 * It was the sentence, then the buttons, then the footage in a frame below —
 * three stops, so the picture began below the fold on most laptops and the
 * first scroll was spent reaching it. Now everything sits inside one frame,
 * capped short of the full screen — 38rem on a laptop, about two thirds of a
 * phone — so the next section shows its edge and says "there is more".
 *
 * The copy goes at the top, not over the middle: this clip is near-black in
 * its upper third, so the footage itself gives the contrast and only a soft
 * gradient is needed there, while the subject in the centre keeps its full
 * light. `svh`, not `vh` — on a phone the frame is sized to the screen with
 * the browser's bars showing, so the bottom edge is never under them.
 */
export function Hero() {
  const t = useT();
  return (
    <section className="px-2 pb-2 pt-[calc(3.5rem+env(safe-area-inset-top,0px))] sm:px-3 sm:pb-3">
      <div className="on-media relative isolate flex h-[min(64svh,32rem)] min-h-[24rem] sm:h-[min(calc(100svh-8rem),38rem)] sm:min-h-[28rem] flex-col items-center overflow-hidden rounded-[1.25rem] bg-surface-base text-center sm:rounded-inset">
        {/* Held to the top of the clip: a wide frame crops the footage top
            and bottom, and keeping the top keeps the black above the subject
            — which is where the copy goes — so her face sits below the
            buttons instead of under them. */}
        <HeroVideo bare focus="object-[50%_0%]" src={HERO_VIDEO} poster={HERO_POSTER} />

        {/* Legibility where the words are, and nowhere else. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-3/5 bg-gradient-to-b from-black/75 via-black/35 to-transparent"
        />

        <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pt-[clamp(2rem,6svh,5rem)]">
          <h1 className="text-balance text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.032em] text-cream-bright [text-shadow:0_1px_24px_rgb(0_0_0/0.35)]">
            <WordsPullUp align="center" className="w-full">{t("land.heroBlurb")}</WordsPullUp>
          </h1>
          <FadeRise delay={0.35} className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link to="/app">
              <Action withArrow className="px-6 py-3 text-base">
                {t("cta.startInterview")}
              </Action>
            </Link>
            {/* Not on a phone: a tall frame shows the whole clip with no crop,
                so a second row of buttons lands on her face. One way in is
                enough there, and the page scrolls to the rest. */}
            <a
              href="#how-it-works"
              onClick={(event) => {
                if (scrollToSection("#how-it-works")) event.preventDefault();
              }}
              className="focus-ring group hidden items-center gap-1 rounded-full px-4 py-3 text-base font-medium text-cream-bright/90 transition-colors hover:text-cream-bright sm:inline-flex"
            >
              {t("land.navHow")}
              <ChevronRight
                aria-hidden
                className="h-4 w-4 transition-transform duration-200 ease-press group-hover:translate-x-0.5 rtl:-scale-x-100"
              />
            </a>
          </FadeRise>
        </div>
      </div>
    </section>
  );
}
