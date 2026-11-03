import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Link, Route, Routes } from "react-router-dom";
import "@ds/styles.css";
import "./site.css";
import { Shell } from "./Shell";
import Home from "./pages/Home";
import ComponentPage from "./pages/ComponentPage";
import GuidePage from "./pages/GuidePage";

/**
 * The documentation site.
 *
 * A plain Vite SPA that reads the system where the system lives: the
 * components and their contracts from `src/`, the Markdown from `docs/`.
 * Nothing is copied into the site, so nothing in it can go stale.
 *
 * The router is a hash router because the site is published as a static
 * folder that may be served from anywhere — including a path with no
 * rewrite rules — and a hash needs no server to understand it.
 */

function NotFound() {
  return (
    <div className="max-w-[46rem]">
      <h1 className="text-title font-semibold text-cream-bright">Nothing here</h1>
      <p className="mt-3 text-cream-dim">
        That address is not part of the system.{" "}
        <Link to="/" className="text-accent-text underline underline-offset-2">
          Back to the overview
        </Link>
        .
      </p>
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("The site needs a #root to mount into.");

createRoot(root).render(
  <StrictMode>
    <HashRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/component/:name" element={<ComponentPage />} />
          <Route path="/foundations/:slug" element={<GuidePage group="Foundations" />} />
          <Route path="/guides/:slug" element={<GuidePage group="Guides" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Shell>
    </HashRouter>
  </StrictMode>,
);
