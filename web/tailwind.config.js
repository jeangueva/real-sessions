/**
 * TechShadow 360 design tokens.
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
        // Warm cream. Primary text and accents on every dark surface.
        cream: {
          DEFAULT: "#DEDBC8",
          bright: "#E1E0CC",
          dim: "rgba(222, 219, 200, 0.7)",
          faint: "rgba(222, 219, 200, 0.45)",
        },
        // Surfaces, darkest to lightest. Named by role, not by shade.
        surface: {
          base: "#000000",
          raised: "#101010",
          card: "#212121",
          deep: "#04212E", // Velorah navy, for focus states and the app shell
        },
        line: "rgba(222, 219, 200, 0.14)",
      },
      fontFamily: {
        sans: ['"Almarai"', "system-ui", "sans-serif"],
        serif: ['"Instrument Serif"', "Georgia", "serif"],
      },
      fontSize: {
        // Display sizes are viewport-relative: the hero word must fill the
        // screen edge to edge at any width.
        display: ["clamp(3rem, 20vw, 18rem)", { lineHeight: "0.85", letterSpacing: "-0.07em" }],
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
      },
      animation: {
        "fade-rise": "fadeRise 0.8s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fadeIn 0.5s ease both",
        blink: "blink 1s step-end infinite",
      },
    },
  },
  plugins: [],
};
