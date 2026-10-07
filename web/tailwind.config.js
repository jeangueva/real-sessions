/**
 * Mockio design tokens.
 *
 * Set by two references, each for what it is best at:
 *   Apple   → type and motion. The system face, per-size tracking, one accent,
 *             white space doing the work borders used to do, feedback on press.
 *   Airbnb  → surfaces. White ground, near-black ink, soft-shadowed cards with
 *             generous radii, pill controls, and nothing decorative that a
 *             nervous first-time user has to look past.
 *
 * Tokens are named by role, never by shade, and every value lives in
 * index.css as a variable — the theme is a swap, not a rewrite.
 */
const SANS = [
  "-apple-system",
  "BlinkMacSystemFont",
  '"SF Pro Text"',
  '"Inter"',
  '"Almarai"',
  "system-ui",
  "sans-serif",
];

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        /**
         * The ink. Warm cream on the dark theme, near-black on the light one
         * — the token is the role, not the colour, which is why the whole app
         * themes without a single class changing.
         */
        cream: {
          DEFAULT: "rgb(var(--cream) / <alpha-value>)",
          bright: "rgb(var(--cream-bright) / <alpha-value>)",
          /**
           * The alpha steps are set by contrast, not by taste. 0.85 and 0.65
           * are the lowest values that still clear WCAG AA (4.5:1) against
           * every surface in both themes — `surface-lift` on the light theme
           * is the tightest of them, and it decides these two numbers.
           *
           * They used to be 0.7 and 0.45, which put `cream-faint` at 2.7:1 on
           * a light card. That is below the floor for body text, and every
           * hint, caption and placeholder in the product wears it.
           */
          dim: "rgb(var(--cream) / 0.85)",
          faint: "rgb(var(--cream) / 0.65)",
        },
        // Surfaces, named by role rather than by shade for the same reason.
        surface: {
          base: "rgb(var(--surface-base) / <alpha-value>)",
          raised: "rgb(var(--surface-raised) / <alpha-value>)",
          card: "rgb(var(--surface-card) / <alpha-value>)",
          deep: "rgb(var(--surface-deep) / <alpha-value>)",
          sunken: "rgb(var(--surface-sunken) / var(--surface-sunken-alpha))",
          lift: "rgb(var(--surface-lift) / var(--surface-lift-alpha))",
        },
        line: "var(--line)",
        /**
         * The border of a control, as opposed to a divider between blocks.
         *
         * WCAG 1.4.11 asks for 3:1 on anything that identifies an interactive
         * element, and on the light theme an input's fill is within 1.05:1 of
         * the page — so the border is the only thing saying "this is a field".
         * `line` stays soft, because a decorative rule carries no information
         * and a hard grey line through every panel is a worse page.
         */
        "line-strong": "var(--line-strong)",
        // The dim behind a spotlight or a modal. Softer on a light ground.
        scrim: "var(--scrim)",
        /**
         * The three colours that carry meaning — see the block in index.css.
         * `accent` is the way forward, `grow` is what improved, `step` is
         * what to work on next. None of them is red: nothing in this product
         * marks a person wrong.
         */
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          ink: "rgb(var(--accent-ink) / <alpha-value>)",
          text: "rgb(var(--accent-text) / <alpha-value>)",
          soft: "rgb(var(--accent-soft) / <alpha-value>)",
        },
        grow: {
          DEFAULT: "rgb(var(--grow) / <alpha-value>)",
          text: "rgb(var(--grow-text) / <alpha-value>)",
          soft: "rgb(var(--grow-soft) / <alpha-value>)",
        },
        step: {
          DEFAULT: "rgb(var(--step) / <alpha-value>)",
          text: "rgb(var(--step-text) / <alpha-value>)",
          soft: "rgb(var(--step-soft) / <alpha-value>)",
        },
        /**
         * Premium. Only ever the crown that marks a paid option, the way Canva
         * marks one: gold reads as "more is behind this" in every market, and
         * keeping it off everything else keeps that reading.
         */
        premium: {
          DEFAULT: "rgb(var(--premium) / <alpha-value>)",
          soft: "rgb(var(--premium-soft) / <alpha-value>)",
        },
      },
      /**
       * One family, Apple's rule: the platform's own face first.
       *
       * On a Mac or an iPhone that is SF, which already ships optical sizing
       * and per-size tracking tables. Everywhere else it is Inter, the closest
       * open face to it. Almarai stays in the stack only as the Arabic
       * fallback — neither SF Text on the web nor Inter carries that script.
       *
       * `serif` is gone as a voice: an italic serif accent inside a sans
       * headline is the editorial-magazine move, and this is a tool. The key
       * is kept and pointed at the same stack so nothing that still names it
       * falls back to Times.
       */
      fontFamily: {
        sans: SANS,
        serif: SANS,
        /* The wordmark. Same family, display cut — a logo that is the product's
           own type set tight, the way Apple and Airbnb set theirs. */
        mark: SANS,
      },
      fontSize: {
        // The small end of the scale, lifted one step off Tailwind's defaults
        // (12/14/16). Those are fine for dense dashboards and wrong for this:
        // most of the small text here is either a control you have to hit or
        // copy someone reads while nervous, and 12px was failing both. Set as
        // tokens rather than edited at each call site, so the whole product
        // moves together and nothing drifts back down.
        xs: ["0.875rem", { lineHeight: "1.5" }],
        sm: ["1rem", { lineHeight: "1.55" }],
        base: ["1.0625rem", { lineHeight: "1.6" }],

        // Viewport-relative so the wordmark fills its column at any width.
        // Sized for the two-line "Real Sessions" stack: 20vw was tuned for a
        // single word and overflowed the column once the name wrapped.
        // Tracking is per size, never one value: large type tightens as it
        // grows, the small end stays at zero. Leading runs the other way.
        display: ["clamp(3rem, 9vw, 8rem)", { lineHeight: "0.95", letterSpacing: "-0.045em" }],
        headline: ["clamp(2rem, 4.6vw, 4rem)", { lineHeight: "1.04", letterSpacing: "-0.032em" }],
        title: ["clamp(1.25rem, 2vw, 1.75rem)", { lineHeight: "1.18", letterSpacing: "-0.018em" }],
      },
      borderRadius: { inset: "1.75rem", card: "1.25rem" },
      /**
       * Elevation, Airbnb's way: a hairline plus a soft, wide shadow, so a card
       * sits on the page instead of being drawn onto it. Three steps — resting,
       * hovered, floating — and nothing in between.
       */
      boxShadow: {
        card: "var(--shadow-card)",
        lift: "var(--shadow-lift)",
        float: "var(--shadow-float)",
      },
      transitionTimingFunction: {
        // One easing curve for the whole product. Decelerating, cinematic.
        cinematic: "cubic-bezier(0.16, 1, 0.3, 1)",
        settle: "cubic-bezier(0.22, 1, 0.36, 1)",
        // Every UI response — a press, a popover, a field's halo, a screen
        // change. One strong ease-out (Emil Kowalski's), so nothing in the
        // product answers at a slightly different speed from the rest.
        press: "cubic-bezier(0.23, 1, 0.32, 1)",
        // iOS's sheet curve, for things that slide up from the bottom edge.
        drawer: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      keyframes: {
        fadeRise: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0" } },
        // "Live": a breath rather than a blink. A hard on/off every second
        // beside text someone is reading is the one motion that cannot be
        // ignored, which is the opposite of what a status dot is for.
        livePulse: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.35" } },
        /**
         * The backdrop drift. Deliberately enormous periods — a minute is fast
         * enough to notice and slow enough that nothing on top of it appears
         * to move. Only `transform` and `opacity` change, so these composite
         * on the GPU and never trigger layout.
         */
        driftSlow: {
          "0%,100%": { transform: "translate(-50%, 0) scale(1)", opacity: "1" },
          "50%": { transform: "translate(-46%, -4vmax) scale(1.08)", opacity: "0.85" },
        },
        driftWide: {
          "0%,100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(8vmax, 5vmax) scale(1.12)" },
        },
        driftCounter: {
          "0%,100%": { transform: "translate(0, 0) scale(1.05)", opacity: "0.9" },
          "50%": { transform: "translate(-6vmax, 4vmax) scale(1)", opacity: "0.6" },
        },
      },
      animation: {
        "fade-rise": "fadeRise 0.8s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fadeIn 0.5s ease both",
        blink: "blink 1s step-end infinite",
        live: "livePulse 2s cubic-bezier(0.45, 0, 0.55, 1) infinite",
        "drift-slow": "driftSlow 34s cubic-bezier(0.45,0,0.55,1) infinite",
        "drift-wide": "driftWide 46s cubic-bezier(0.45,0,0.55,1) infinite",
        "drift-counter": "driftCounter 58s cubic-bezier(0.45,0,0.55,1) infinite",
      },
    },
  },
  plugins: [],
  /**
   * Every `hover:` utility only on a device that can hover. On a phone a tap
   * fires hover and leaves it stuck on — a card stays lifted, a button stays
   * tinted — after the finger has gone.
   */
  future: { hoverOnlyWhenSupported: true },
};
