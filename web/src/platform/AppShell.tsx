import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { History, LogIn, Mic, Play, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { fetchSession, signOut } from "@/lib/api";
import type { Session } from "@/lib/api";

/**
 * The signed-in shell. It sits on `surface-deep` rather than pure black so the
 * app reads as a workspace, while the marketing pages keep the black field.
 * Same tokens, different weight — no second theme.
 */
const NAV = [
  { to: "/app", label: "New session", icon: Play, end: true },
  { to: "/app/history", label: "History", icon: History, end: false },
  { to: "/app/settings", label: "Settings", icon: Settings, end: false },
];

export function AppShell() {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // A failure here is not worth blocking the app: the shell just shows the
    // signed-out state, and every screen still works as a guest.
    fetchSession()
      .then(setSession)
      .catch(() => setSession({ kind: null, email: null }));
  }, []);

  return (
    <div className="flex min-h-screen bg-surface-deep">
      <aside className="sticky top-0 flex h-screen w-16 shrink-0 flex-col items-center gap-2 border-r border-line py-6 lg:w-56 lg:items-stretch lg:px-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Mic className="h-5 w-5 text-cream" aria-hidden />
          <span className="hidden text-sm font-bold text-cream-bright lg:inline">
            Real Sessions
          </span>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-300 ${
                  isActive
                    ? "bg-white/5 text-cream-bright"
                    : "text-cream-dim hover:text-cream-bright"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="hidden lg:inline">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-line pt-4">
          {session?.kind === "user" ? (
            <>
              <p
                className="hidden truncate px-3 text-xs text-cream-dim lg:block"
                title={session.email ?? undefined}
              >
                {session.email}
              </p>
              <button
                onClick={() => {
                  void signOut().then(() => window.location.assign("/"));
                }}
                className="focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-cream-dim transition-colors hover:text-cream-bright"
              >
                <LogIn className="h-4 w-4 shrink-0 rotate-180" aria-hidden />
                <span className="hidden lg:inline">Sign out</span>
              </button>
            </>
          ) : (
            <>
              <p className="hidden px-3 text-xs text-cream-faint lg:block">
                Practising as a guest
              </p>
              <Link
                to="/signin"
                className="focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-cream-dim transition-colors hover:text-cream-bright"
              >
                <LogIn className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden lg:inline">Save my progress</span>
              </Link>
            </>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}

/** Standard page header inside the shell. Every app screen uses it. */
export function PageHeader({
  title,
  meta,
  actions,
}: {
  title: string;
  meta?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-6 py-6 lg:px-10">
      <div>
        <h1 className="text-title font-normal text-cream-bright">{title}</h1>
        {meta && <p className="mt-1 text-xs text-cream-dim">{meta}</p>}
      </div>
      {actions}
    </header>
  );
}
