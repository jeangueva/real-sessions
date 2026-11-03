import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { components, foundations, guides } from "./content";
import type { Theme } from "./theme";

/**
 * The shell: the navigation and the theme switch.
 *
 * The site is a reader's tool, so the navigation is a column that stays and
 * a page that scrolls. On a phone the column becomes a drawer, because a
 * 27-component list does not fit beside a phone screen.
 */

const LEVELS = ["atom", "molecule", "organism", "template", "utility"] as const;

/** The components of each level, in the order of the levels. */
const byLevel = LEVELS.map((level) => ({
  level,
  entries: components.filter((entry) => entry.contract.level === level),
})).filter((group) => group.entries.length > 0);

function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="focus-ring inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-cream-dim transition-colors duration-150 hover:border-line-strong hover:text-cream-bright"
    >
      {theme === "dark" ? <Moon className="h-3.5 w-3.5" aria-hidden /> : <Sun className="h-3.5 w-3.5" aria-hidden />}
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}

function NavGroups() {
  return (
    <>
      <div>
        <p className="mb-2 px-2 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-cream-faint">Start</p>
        <ul className="space-y-0.5">
          <li>
            <NavLink
              to="/"
              end
              className="nav-link block rounded-lg px-2 py-1.5 text-sm transition-colors duration-150"
            >
              Overview
            </NavLink>
          </li>
        </ul>
      </div>

      <div>
        <p className="mb-2 px-2 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-cream-faint">Foundations</p>
        <ul className="space-y-0.5">
          {foundations.map((doc) => (
            <li key={doc.slug}>
              <NavLink
                to={`/foundations/${doc.slug}`}
                className="nav-link block rounded-lg px-2 py-1.5 text-sm transition-colors duration-150"
              >
                {doc.title}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="mb-2 px-2 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-cream-faint">
          Components · {components.length}
        </p>
        {byLevel.map((group) => (
          <div key={group.level} className="mb-3">
            <p className="mb-1 px-2 font-mono text-[0.625rem] uppercase tracking-[0.08em] text-cream-faint/70">
              {group.level}
            </p>
            <ul className="space-y-0.5">
              {group.entries.map((entry) => (
                <li key={entry.name}>
                  <NavLink
                    to={`/component/${entry.name}`}
                    className="nav-link block rounded-lg px-2 py-1.5 text-sm transition-colors duration-150"
                  >
                    {entry.name}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 px-2 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-cream-faint">Guides</p>
        <ul className="space-y-0.5">
          {guides.map((doc) => (
            <li key={doc.slug}>
              <NavLink
                to={`/guides/${doc.slug}`}
                className="nav-link block rounded-lg px-2 py-1.5 text-sm transition-colors duration-150"
              >
                {doc.title}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = typeof localStorage === "undefined" ? null : localStorage.getItem("ds-theme");
    return stored === "light" ? "light" : "dark";
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("ds-theme", theme);
    } catch {
      // A browser that refuses to store the theme is a browser that will
      // also read it as dark; the site still works.
    }
  }, [theme]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-surface-base text-cream">
      {/* The phone's bar: the navigation is a drawer there. */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-surface-base/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link to="/" className="focus-ring rounded-lg text-sm font-semibold text-cream-bright">
          Mockio <span className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-cream-faint">design system</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="The navigation"
            className="focus-ring rounded-lg border border-line px-2.5 py-1.5 text-xs text-cream-dim"
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-b border-line bg-surface-base px-4 py-4 lg:hidden">
          <div className="space-y-5">
            <NavGroups />
          </div>
        </div>
      )}

      <div className="flex">
        <aside className="quiet-scroll sticky top-0 hidden h-screen w-[17.5rem] shrink-0 overflow-y-auto border-r border-line px-5 py-7 lg:block">
          <Link to="/" className="focus-ring mb-8 block rounded-lg">
            <p className="text-lg font-semibold tracking-[-0.02em] text-cream-bright">Mockio</p>
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-cream-faint">design system</p>
          </Link>

          <nav className="space-y-6">
            <NavGroups />
          </nav>

          <div className="mt-8 border-t border-line pt-4">
            <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[68rem] px-5 py-10 sm:px-8 sm:py-14">{children}</div>
        </main>
      </div>
    </div>
  );
}
