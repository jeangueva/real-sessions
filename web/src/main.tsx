import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";

/**
 * A tab opened before a deploy still holds the old build's list of chunks.
 * The first screen it lazy-loads after the deploy asks for a file that is
 * gone, and without this the screen simply stays empty. Vite raises
 * `vite:preloadError` for exactly that; reloading fetches the new build.
 * Once per minute at most, so a chunk that is genuinely broken cannot put
 * the page in a reload loop.
 */
window.addEventListener("vite:preloadError", (event) => {
  const KEY = "mockio.reloadedForChunk";
  try {
    const last = Number(sessionStorage.getItem(KEY) ?? 0);
    if (Date.now() - last < 60_000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* no storage: reload anyway, the guard is a convenience */
  }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
