import { WordsPullUp, FadeRise, Action, InsetFrame } from "@/design-system";

const NAV = ["How it works", "Companies", "Pricing", "For teams", "Sign in"];

/**
 * The reference decks all opened on a full-bleed showreel. There is no
 * showreel here yet, so the frame is built from tokens: a warm radial lift off
 * a black field, plus grain. It reads as intentional rather than as a video
 * that failed to load, and it swaps for real footage without touching layout.
 */
export function Hero() {
  return (
    <InsetFrame className="bg-surface-base">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 80% at 50% 110%, rgba(222,219,200,0.16) 0%, rgba(222,219,200,0.04) 35%, transparent 70%), radial-gradient(60% 50% at 15% 10%, rgba(4,33,46,0.9) 0%, transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.5] mix-blend-overlay"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70"
      />

      <nav className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
        <ul className="flex items-center gap-3 rounded-b-2xl bg-black px-4 py-2 sm:gap-6 md:gap-12 md:rounded-b-3xl md:px-8">
          {NAV.map((item) => (
            <li key={item}>
              <a
                href="#"
                className="focus-ring rounded text-[10px] text-cream-dim transition-colors hover:text-cream-bright sm:text-xs md:text-sm"
              >
                {item}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="absolute bottom-0 left-0 right-0 z-10 grid grid-cols-1 gap-6 p-6 md:grid-cols-12 md:items-end md:gap-4 md:p-10">
        <h1 className="relative col-span-1 text-display font-medium text-cream-bright md:col-span-8">
          <WordsPullUp>TechShadow</WordsPullUp>
          <span className="absolute -right-[0.15em] top-[0.1em] text-[0.18em] text-cream-dim">
            360
          </span>
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
            <Action withArrow>Start an interview</Action>
          </FadeRise>
        </div>
      </div>
    </InsetFrame>
  );
}
