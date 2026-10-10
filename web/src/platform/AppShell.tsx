import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ScreenBoundary } from "./ScreenBoundary";
import {
  Briefcase,
  FileUser,
  LogIn,
  Play,
  Route,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { fetchPlan, fetchPreferences, fetchSession, signOut } from "@/lib/api";
import type { Session } from "@/lib/api";
import { useT } from "@/hooks/useLocale";
import { Mark, PremiumMark, Wordmark } from "@/design-system";

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
/**
 * `short` is the phone label, and it is a separate string rather than a
 * shortening rule.
 *
 * This used to render `t(key).split(" ")[0]`, which assumes the first word of
 * a label is the part worth keeping. That is true of "New session" and false
 * of "Your context" — the tab read "Your" in English, "Tu" in Spanish, "Seu"
 * in Portuguese, "Votre" in French and "Dein" in German: a bare possessive
 * pronoun in five languages, naming nothing. There is no rule that shortens a
 * phrase correctly across languages; there is only knowing the short word.
 */
const NAV = [
  {
    to: "/app",
    key: "nav.new" as const,
    short: "nav.newShort" as const,
    icon: Play,
    end: true,
  },
  {
    to: "/app/progress",
    key: "nav.progress" as const,
    short: "nav.progressShort" as const,
    icon: Route,
    end: false,
  },
  {
    to: "/app/applications",
    key: "nav.applications" as const,
    short: "nav.applicationsShort" as const,
    icon: Briefcase,
    end: false,
  },
];

/**
 * Three places, in the order the product is for: practise, see that it is
 * working, take it to a real job.
 *
 * The rail used to list eight things side by side — History beside Progress,
 * Share beside both — which made every one of them read as equally important
 * and none of them as the point. History is the bottom half of the path now;
 * sharing is offered on the report and on the path, where there is something
 * worth sharing; context, settings and review are about the account, not
 * about the practice, so they sit with the account at the foot of the rail.
 */
const ACCOUNT = [
  {
    to: "/app/profile",
    key: "nav.context" as const,
    icon: FileUser,
  },
  {
    to: "/app/settings",
    key: "nav.settings" as const,
    icon: Settings,
  },
];

export function AppShell() {
  const t = useT();
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  /**
   * Whether to show the review entry point. The server decides — this only
   * hides a link, and the route itself is 404 for anyone not on the allowlist.
   */
  const [reviewer, setReviewer] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  /**
   * Whether the CV screen is reachable on this plan.
   *
   * The nav listed "Your context" beside four screens that all work, and it
   * opened on a page that only sells. The padlock says which it is before the
   * click, the way the locked fields in the setup bar already do.
   */
  const [locked, setLocked] = useState<string[]>([]);
  /** The name from Settings → Account, shown instead of the email. */
  const [name, setName] = useState("");

  useEffect(() => {
    fetchPreferences()
      .then((result) => setName(result.preferences.candidateName.trim()))
      .catch(() => undefined);
    const onName = (event: Event) =>
      setName(String((event as CustomEvent<string>).detail ?? "").trim());
    window.addEventListener("mockio:name", onName);
    return () => window.removeEventListener("mockio:name", onName);
  }, []);

  useEffect(() => {
    fetchPlan()
      .then((result) => {
        setIsPremium(result.plan === "premium");
        setReviewer(result.reviewer);
        setLocked(result.capabilities.candidateProfile ? [] : ["/app/profile"]);
      })
      .catch(() => setReviewer(false));
  }, []);

  useEffect(() => {
    // The gate. Every screen below this needs an account — there is no
    // anonymous identity to fall back to — so no session means the sign-in
    // page, carrying where they were headed so they land there afterwards.
    //
    // A network failure is treated the same as no session. The alternative is
    // rendering a shell whose every panel then fails its own request, which
    // reads as a broken product rather than as one asking you to sign in.
    fetchSession()
      .then((result) => {
        setSession(result);
        if (result.kind !== "user") {
          navigate("/signin", {
            replace: true,
            state: { from: location.pathname + location.hash },
          });
        }
      })
      .catch(() => {
        setSession({ kind: null, email: null });
        navigate("/signin", {
          replace: true,
          state: { from: location.pathname + location.hash },
        });
      });
  }, [navigate, location.pathname, location.hash]);

  // Nothing is drawn until it is known who is looking: a flash of the shell
  // before the redirect reads as being thrown out of a page you were allowed
  // to see.
  if (session === null || session.kind !== "user") return null;

  return (
    <div className="flex min-h-dvh bg-surface-deep">
      {/* Apple's sidebar: on the shell's own grey, no panel of its own, a
          hairline where it meets the content. Selection is a white tile with
          the card's shadow — the row lifts toward you, the way a selected row
          in Music or Settings does — rather than a coloured wash. */}
      <aside className="sticky top-0 hidden h-dvh w-[4.5rem] shrink-0 flex-col items-center gap-2 border-r border-line py-5 md:flex lg:w-64 lg:items-stretch lg:px-3">
        <div className="mb-7 flex items-center justify-between gap-2 px-2.5">
          <div className="flex items-center gap-2.5">
            {/* The mark alone when the rail is narrow, the full isologo when
                it is wide: the same parrot as the tab icon. */}
            <Mark size={32} className="shadow-card rounded-[0.6rem]" />
            <Wordmark mark={false} className="hidden text-lg font-semibold text-cream-bright lg:inline-flex" />
          </div>
          {isPremium && (
            <span className="hidden rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text lg:inline-flex">
              Premium
            </span>
          )}
        </div>

        <nav aria-label={t("nav.sections")} className="flex flex-col gap-0.5">
          {NAV.map(({ to, key, icon: Icon, end }) => (
            <RailLink key={to} to={to} end={end} label={t(key)} icon={Icon} />
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-4">
          <p className="hidden px-3 pb-1.5 text-xs font-semibold text-cream-faint lg:block">{t("nav.you")}</p>
          <nav aria-label={t("nav.you")} className="flex flex-col gap-0.5">
            {[
              ...ACCOUNT,
              ...(reviewer
                ? [{ to: "/app/review", key: "nav.review" as const, icon: ShieldCheck }]
                : []),
            ].map(({ to, key, icon }) => (
              <RailLink
                key={to}
                to={to}
                end={false}
                label={t(key)}
                icon={icon}
                quiet
                locked={locked.includes(to) ? t("nav.onPaidPlan") : undefined}
              />
            ))}
          </nav>
          {/* A person, not an address: the name when one is set, with the
              email underneath for whoever has two accounts. */}
          <div className="hidden px-3 pt-3 lg:block" title={session.email ?? undefined}>
            <p className="truncate text-sm font-semibold text-cream-bright">
              {name || session.email}
            </p>
            {name && <p className="truncate text-xs text-cream-faint">{session.email}</p>}
          </div>
          <button
            onClick={() => {
              void signOut().then(() => window.location.assign("/"));
            }}
            title={t("nav.signOut")}
            className="focus-ring flex items-center gap-3 rounded-[0.625rem] px-3 py-2 text-sm text-cream-dim transition-colors hover:bg-surface-lift hover:text-cream-bright"
          >
            <LogIn className="h-4 w-4 shrink-0 rotate-180" aria-hidden />
            <span className="hidden lg:inline">{t("nav.signOut")}</span>
          </button>
        </div>
      </aside>

      {/* `pb-20 md:pb-0` reserves the height of the mobile bar, which is fixed
          and would otherwise sit on top of the last element on the page. */}
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0">
        {/* No transition between screens. There used to be one — the old screen
            faded out, then the new one rose in (`AnimatePresence mode="wait"`)
            — and it was the cause of the blank screen after leaving an
            interview or switching sections: the new screen mounts only once the
            old one's exit finishes, and an exit that never finishes (a tab in
            the background, a quick second click, a page tearing down its audio)
            left the content area empty under a working sidebar. Switching
            sections happens dozens of times a session; that is exactly the kind
            of action that should not animate at all. */}
        <div className="flex min-w-0 flex-1 flex-col">
          <ScreenBoundary
            resetKey={location.pathname}
            title={t("screen.failedTitle")}
            body={t("screen.failedBody")}
            action={t("screen.reload")}
          >
            <Outlet />
          </ScreenBoundary>
        </div>
      </div>

      <MobileNav isPremium={isPremium} />
    </div>
  );
}

/**
 * One entry in the rail.
 *
 * The three destinations carry weight: the active one sits on the accent's
 * soft wash with the accent's ink, so where you are is the warmest thing on
 * the left of the screen. Account entries are `quiet` — same shape, no colour
 * — because they are places you visit, not places you work.
 */
function RailLink({
  to,
  end,
  label,
  icon: Icon,
  quiet = false,
  locked,
}: {
  to: string;
  end: boolean;
  label: string;
  icon: typeof Play;
  quiet?: boolean;
  locked?: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      // The tour points at the path; marking every item keeps that selector
      // honest if the list is ever reordered.
      data-tour={to.split("/").pop()}
      className={({ isActive }) =>
        `focus-ring group/rail flex items-center gap-3 rounded-[0.625rem] px-3 text-sm transition-[background-color,color,box-shadow] duration-200 ease-press active:scale-[0.98] ${
          quiet ? "py-2" : "py-2.5 font-medium"
        } ${
          isActive
            ? "bg-surface-card text-cream-bright shadow-card"
            : "text-cream-dim hover:bg-surface-lift hover:text-cream-bright"
        }`
      }
    >
      {({ isActive }) => (
        <>
      <Icon
        className={`${quiet ? "h-4 w-4" : "h-[1.125rem] w-[1.125rem]"} shrink-0 ${
          isActive && !quiet ? "text-accent-text" : ""
        }`}
        aria-hidden
      />
      <span className="hidden lg:inline">{label}</span>
      {locked && (
        <PremiumMark label={locked} className="ml-auto hidden lg:inline-grid" />
      )}
        </>
      )}
    </NavLink>
  );
}

/**
 * Bottom bar, below `md` only.
 *
 * The three destinations and a fourth tab for the account. Four 97px targets
 * on a 390px screen, where the old bar squeezed five and still had to drop
 * settings to fit. "You" opens settings, which links on to context; it lights
 * up on any account screen so a person always knows which tab they are under.
 */
function MobileNav({ isPremium }: { isPremium: boolean }) {
  const t = useT();
  const { pathname } = useLocation();
  const onAccount = ACCOUNT.some(({ to }) => pathname.startsWith(to)) || pathname.startsWith("/app/review");
  const tab = (active: boolean) =>
    `focus-ring flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
      active ? "text-accent-text" : "text-cream-faint"
    }`;
  return (
    <nav
      aria-label={t("nav.sections")}
      /* Apple's tab bar material: translucent, with the page scrolling under
         it, and the safe-area inset so the labels clear the home indicator. */
      className="nav-lifted fixed inset-x-0 bottom-0 z-30 !border-b-0 border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {NAV.map(({ to, short, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              // The rail is still in the DOM at this width, collapsed to a
              // zero-sized box. Marking this one too means the tour has a
              // real target to point at rather than the rail's empty rect.
              data-tour={to.split("/").pop()}
              className={({ isActive }) => tab(isActive)}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {t(short)}
            </NavLink>
          </li>
        ))}
        <li className="flex-1">
          <NavLink to="/app/settings" className={() => tab(onAccount)}>
            <div className="relative inline-flex items-center justify-center">
              <UserRound className="h-5 w-5" aria-hidden />
              {isPremium && (
                <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-accent" />
              )}
            </div>
            {t("nav.youShort")}
          </NavLink>
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
    /* One element, not two. The gutters, the ceiling and whatever layout the
       screen asks for all have to land on the element that actually holds the
       children: with the className on an outer wrapper, a screen asking for
       `lg:grid-cols-2` laid out the wrapper's single child — so the columns
       were the wrapper's, the content stacked inside the first one, and every
       screen that asked for a grid sat squashed against the left edge with
       half the window empty. */
    <div
      className={`mx-auto w-full max-w-[110rem] px-4 py-8 sm:px-6 lg:px-10 lg:py-10 ${className}`}
    >
      {children}
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
    /* Apple's large title: no rule under it — the size and the space after
       it already end the header, and a line would only box it in. */
    <header className="px-4 pb-2 pt-8 sm:px-6 lg:px-10 lg:pt-10">
      {/* Same container as PageBody, so the title lines up with the content
          under it at every width. */}
      <div className="mx-auto flex w-full max-w-[110rem] flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[2rem] font-bold leading-[1.1] tracking-[-0.028em] text-cream-bright sm:text-[2.5rem]">
            {title}
          </h1>
          {meta && <p className="mt-1.5 text-sm text-cream-dim">{meta}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}
