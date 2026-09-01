/**
 * The moving field behind the marketing pages.
 *
 * The reference directions all opened on a full-bleed showreel, and the note in
 * this design system's README has said since the first build that the hero
 * "swaps for real footage without touching layout". There is still no footage,
 * and this is the honest substitute rather than a placeholder: slow drifting
 * light built from the same two tokens the rest of the page uses, plus the
 * grain that keeps large flat blacks from banding.
 *
 * Everything is CSS. No video, no canvas, no external asset — the system
 * forbids the last one outright, and the first two cost battery on a page
 * someone reads for thirty seconds. Blurred gradients composite on the GPU and
 * animate `transform` only, so this stays off the layout and paint path.
 *
 * Motion is opt-out at two levels: `prefers-reduced-motion` freezes the drift
 * through `index.css`, and `still` renders the same composition without any
 * animation for contexts that should not move at all.
 */
export function Backdrop({
  variant = "hero",
  still = false,
}: {
  /** `hero` is the full field; `section` is a quieter version for mid-page. */
  variant?: "hero" | "section";
  still?: boolean;
}) {
  const hero = variant === "hero";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* The warm lift from below — the one that makes the wordmark sit in
          light rather than on flat black. */}
      <div
        className={`absolute left-1/2 h-[120vmax] w-[120vmax] -translate-x-1/2 rounded-full blur-3xl ${
          still ? "" : "animate-drift-slow"
        }`}
        style={{
          bottom: hero ? "-70vmax" : "-85vmax",
          background:
            "radial-gradient(circle, rgba(222,219,200,0.26) 0%, rgba(222,219,200,0.08) 38%, transparent 70%)",
        }}
      />

      {/* Velorah's navy, drifting across the top-left. Cool against the warm
          lift, which is what stops the field reading as one flat wash. */}
      <div
        className={`absolute h-[80vmax] w-[80vmax] rounded-full blur-3xl ${
          still ? "" : "animate-drift-wide"
        }`}
        style={{
          top: hero ? "-30vmax" : "-45vmax",
          left: "-20vmax",
          background:
            "radial-gradient(circle, rgba(4,33,46,0.95) 0%, rgba(4,33,46,0.35) 45%, transparent 70%)",
        }}
      />

      {hero && (
        <div
          className={`absolute right-[-25vmax] top-[10vmax] h-[70vmax] w-[70vmax] rounded-full blur-3xl ${
            still ? "" : "animate-drift-counter"
          }`}
          style={{
            background:
              "radial-gradient(circle, rgba(222,219,200,0.07) 0%, transparent 65%)",
          }}
        />
      )}

      {/* Grain over the gradients, not under them: it is there to break up the
          banding the blurs themselves produce. */}
      <div className="noise-overlay absolute inset-0 opacity-[0.5] mix-blend-overlay" />

      {/* Scrim, so text contrast does not depend on where the light happens to
          have drifted to. Without it a headline passes contrast in one frame
          and fails two minutes later.
          Weighted to the top, where the nav sits over the navy. The bottom is
          deliberately light: the warm lift lives down there, and an earlier
          75% black scrim erased the one thing that makes the wordmark sit in
          light rather than on flat black. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/35" />
    </div>
  );
}
