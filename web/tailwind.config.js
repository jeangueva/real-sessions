/**
 * Real Sessions design tokens.
 *
 * Distilled from five reference directions. What survived and why:
 *   Prisma      → warm cream on black. The only palette of the five that reads
 *                 as human rather than corporate, which matters for a product
 *                 people use while nervous.
 *   Velorah     → deep navy as the second surface, so screens can have depth
 *                 without a second hue.
 *   Asme        → liquid glass for anything floating over video.
 *   Mainframe   → typewriter reveal; here it is literal, since the interviewer
 *                 actually is speaking to you in real time.
 *   Kollektiva  → portrait picker, repurposed as the company/role selector.
 *
 * Everything else from those references (their brand names, their CDN assets,
 * their nav copy) was dropped — it belonged to other products.
 */
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
          dim: "rgb(var(--cream) / 0.7)",
          faint: "rgb(var(--cream) / 0.45)",
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
        // The dim behind a spotlight or a modal. Softer on a light ground.
        scrim: "var(--scrim)",
      },
      fontFamily: {
        sans: ['"Almarai"', "system-ui", "sans-serif"],
        serif: ['"Instrument Serif"', "Georgia", "serif"],
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
        display: ["clamp(2.5rem, 11vw, 10rem)", { lineHeight: "0.88", letterSpacing: "-0.05em" }],
        headline: ["clamp(1.75rem, 5vw, 4.5rem)", { lineHeight: "0.95", letterSpacing: "-0.03em" }],
        title: ["clamp(1.25rem, 2.5vw, 2.25rem)", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
      },
      borderRadius: { inset: "2rem" },
      transitionTimingFunction: {
        // One easing curve for the whole product. Decelerating, cinematic.
        cinematic: "cubic-bezier(0.16, 1, 0.3, 1)",
        settle: "cubic-bezier(0.22, 1, 0.36, 1)",
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
        "drift-slow": "driftSlow 34s cubic-bezier(0.45,0,0.55,1) infinite",
        "drift-wide": "driftWide 46s cubic-bezier(0.45,0,0.55,1) infinite",
        "drift-counter": "driftCounter 58s cubic-bezier(0.45,0,0.55,1) infinite",
      },
    },
  },
  plugins: [],
};
