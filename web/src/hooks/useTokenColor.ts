import { useEffect, useState } from "react";

/**
 * A design token as a plain colour string, kept in step with the theme.
 *
 * The tokens are channel triples (`--accent-text: 125 122 255`) consumed as
 * `rgb(var(--accent-text))` by CSS. Some components draw with a canvas or
 * interpolate colours in JavaScript, and neither understands `var()` — so
 * they get the resolved `rgb(...)`, re-read whenever the theme flips.
 */
export function useTokenColor(token: string, fallback = "rgb(128 128 128)"): string {
  const read = () => {
    if (typeof document === "undefined") return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();
    return value ? `rgb(${value})` : fallback;
  };
  const [color, setColor] = useState(read);

  useEffect(() => {
    const update = () => setColor(read());
    update();
    // The theme is a `data-theme` on <html>, or the system's preference.
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener?.("change", update);
    return () => {
      observer.disconnect();
      media?.removeEventListener?.("change", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return color;
}
