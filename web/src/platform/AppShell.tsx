import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import {
  FileUser,
  History,
  LineChart,
  LogIn,
  Mic,
  Play,
  Settings,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { fetchPlan, fetchSession, signOut } from "@/lib/api";
import type { Session } from "@/lib/api";

/**
 * The signed-in shell. It sits on `surface-deep` rather than pure black so the
 * app reads as a workspace, while the marketing pages keep the black field.
 * Same tokens, different weight — no second theme.
 *
 * Three layouts, not one squeezed three ways. Below `md` the navigation is a
 * bottom bar, because a 64px side rail on a 390px screen spends a sixth of the
 * width on chrome and puts every target at the top of the reach. At `md` it is
 * an icon rail, and at `lg` it opens into labels.
 */
const NAV = [
  { to: "/app", label: "New session", icon: Play, end: true },
  { to: "/app/profile", label: "Your context", icon: FileUser, end: false },
  { to: "/app/progress", label: "Progress", icon: LineChart, end: false },
  { to: "/app/history", label: "History", icon: History, end: false },
  { to: "/app/settings", label: "Settings", icon: Settings, end: false },
];

export function AppShell() {
  const [session, setSession] = useState<Session | null>(null);
  /**
   * Whether to show the review entry point. The server decides — this only
   * hides a link, and the route itself is 404 for anyone not on the allowlist.
   */
  const [reviewer, setReviewer] = useState(false);

  useEffect(() => {
    fetchPlan()
      .then((result) => setReviewer(result.reviewer))
      .catch(() => setReviewer(false));
  }, []);

  useEffect(() => {
    // A failure here is not worth blocking the app: the shell just shows the
    // signed-out state, and every screen still works as a guest.
    fetchSession()
      .then(setSession)
      .catch(() => setSession({ kind: null, email: null }));
  }, []);

  return (
    <div className="flex min-h-screen bg-surface-deep">
      <aside className="sticky top-0 hidden h-screen w-16 shrink-0 flex-col items-center gap-2 border-r border-line py-6 md:flex lg:w-56 lg:items-stretch lg:px-4">
        <div className="mb-6 flex items-center gap-2 px-2">
          <Mic className="h-5 w-5 text-cream" aria-hidden />
          <span className="hidden text-sm font-bold text-cream-bright lg:inline">
            Real Sessions
          </span>
        </div>

        <nav className="flex flex-col gap-1">
          {[
            ...NAV,
            ...(reviewer
              ? [
                  {
                    to: "/app/review",
                    label: "Review",
                    icon: ShieldCheck,
                    end: false,
                  },
                ]
              : []),
          ].map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              // The tour points at Progress; marking every item keeps that
              // selector honest if the list is ever reordered.
              data-tour={to.split("/").pop()}
              className={({ isActive }) =>
                `focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors duration-300 ${
                  isActive
                    ? "bg-surface-lift text-cream-bright"
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
                title="Sign out"
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
                title="Save my progress"
                className="focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-cream-dim transition-colors hover:text-cream-bright"
              >
                <LogIn className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden lg:inline">Save my progress</span>
              </Link>
            </>
          )}
        </div>
      </aside>

      {/* `pb-20 md:pb-0` reserves the height of the mobile bar, which is fixed
          and would otherwise sit on top of the last element on the page. */}
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        <Outlet />
      </div>

      <MobileNav signedIn={session?.kind === "user"} />
    </div>
  );
}

/**
 * Bottom bar, below `md` only.
 *
 * Four destinations plus the account, because five 78px targets is already the
 * limit on a 390px screen. Settings is the one that drops: it is reached from
 * the account tab, and it is not somewhere anyone goes mid-session.
 */
const MOBILE_NAV = NAV.filter(({ to }) => to !== "/app/settings");

function MobileNav({ signedIn }: { signedIn: boolean }) {
  return (
    <nav
      aria-label="Sections"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface-deep/95 backdrop-blur md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {MOBILE_NAV.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              // The rail is still in the DOM at this width, collapsed to a
              // zero-sized box. Marking this one too means the tour has a
              // real target to point at rather than the rail's empty rect.
              data-tour={to.split("/").pop()}
              className={({ isActive }) =>
                `focus-ring flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] transition-colors ${
                  isActive ? "text-cream-bright" : "text-cream-dim"
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              {/* The rail's labels are longer than a fifth of a phone screen. */}
              {label === "New session" ? "New" : label === "Your context" ? "You" : label}
            </NavLink>
          </li>
        ))}
        <li className="flex-1">
          <Link
            to={signedIn ? "/app/settings" : "/signin"}
            className="focus-ring flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] text-cream-dim"
          >
            <LogIn className={`h-5 w-5 ${signedIn ? "rotate-180" : ""}`} aria-hidden />
            {signedIn ? "Account" : "Save"}
          </Link>
        </li>
      </ul>
    </nav>
  );
}

/**
 * The one container every app screen sits in.
 *
 * Width and gutters live here rather than in each screen. They used to be
 * hand-tuned per file — `max-w-2xl` here, `max-w-4xl` there — which pinned
 * every screen to the left edge and left half of a desktop window empty. A
 * ceiling still exists, because a table of text at 2000px is unreadable, but
 * it is one number in one place.
 */
export function PageBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`w-full px-4 py-8 sm:px-6 lg:px-10 lg:py-10 ${className}`}>
      <div className="mx-auto w-full max-w-[110rem]">{children}</div>
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
    <header className="border-b border-line px-4 py-5 sm:px-6 lg:px-10">
      {/* Same container as PageBody, so the title lines up with the content
          under it at every width. */}
      <div className="mx-auto flex w-full max-w-[110rem] flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-title font-normal text-cream-bright">{title}</h1>
          {meta && <p className="mt-1 text-xs text-cream-dim">{meta}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}
