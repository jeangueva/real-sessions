import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ScreenBoundary } from "./ScreenBoundary";
import {
  BookOpenCheck,
  Briefcase,
  ClipboardCheck,
  FileSearch,
  FileUser,
  GraduationCap,
  LogIn,
  Mic,
  Play,
  Presentation,
  Route,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ReactNode } from "react";
import { fetchPlan, fetchPreferences, fetchSession, linkAdvisor, signOut } from "@/lib/api";
import type { Session } from "@/lib/api";
import { useT } from "@/hooks/useLocale";
import { useThesisT } from "@/lib/thesis-copy";
import { Mark, PremiumMark, Wordmark } from "@/design-system";
import ShinyText from "@/components/bits/ShinyText";
import { useTokenColor } from "@/hooks/useTokenColor";
import {
  SPACE_HOME,
  rememberSpace,
  spaceOf,
  storedSpace,
  thesisPath,
  type Space,
} from "@/lib/spaces";

/**
 * The signed-in shell, in two workspaces.
 *
 * Sustentación and Profesional sit as two tabs across the top — the way a
 * bank puts Personas and Empresas above everything else — and the navigation
 * under them belongs to whichever is open. One rail of seven entries made the
 * thesis one screen among many; now it is a workspace with its own sections,
 * and interview practice is the other one, a tab away.
 *
 * Three layouts, not one squeezed three ways. Below `md` the sections are a
 * bottom bar and the account is the avatar in the top bar. At `md` the rail is
 * icons, and at `lg` it opens into labels.
 */

type Icon = typeof Play;

interface Entry {
  to: string;
  label: string;
  short: string;
  icon: Icon;
  end: boolean;
  /** For the tour, which points at entries by name. */
  tour: string;
  /** In the rail only: the phone's tab bar has room for five. */
  wide?: boolean;
}

/** Each workspace's sections, in the order they are worked through. */
function useSpaceEntries(space: Space): Entry[] {
  const t = useT();
  const tt = useThesisT();
  if (space === "defense") {
    return [
      { to: thesisPath("ensayar"), label: tt("tabRehearse"), short: tt("shortRehearse"), icon: Mic, end: true, tour: "ensayar" },
      { to: thesisPath("diagnostico"), label: tt("tabDiagnosis"), short: tt("shortDiagnosis"), icon: FileSearch, end: false, tour: "diagnostico" },
      { to: thesisPath("repaso"), label: tt("tabStudy"), short: tt("shortStudy"), icon: BookOpenCheck, end: false, tour: "repaso" },
      { to: thesisPath("diapositivas"), label: tt("tabSlides"), short: tt("shortSlides"), icon: Presentation, end: false, tour: "diapositivas" },
      { to: thesisPath("observaciones"), label: tt("tabObservations"), short: tt("shortObservations"), icon: ClipboardCheck, end: false, tour: "observaciones", wide: true },
      { to: thesisPath("mas"), label: tt("railMore"), short: tt("shortMore"), icon: Sparkles, end: false, tour: "mas" },
    ];
  }
  return [
    { to: "/app/practice", label: t("nav.interviews"), short: t("nav.interviewsShort"), icon: Play, end: false, tour: "practice" },
    { to: "/app/progress", label: t("nav.progress"), short: t("nav.progressShort"), icon: Route, end: false, tour: "progress" },
    { to: "/app/applications", label: t("nav.applications"), short: t("nav.applicationsShort"), icon: Briefcase, end: false, tour: "applications" },
    { to: "/app/profile", label: t("nav.context"), short: t("nav.contextShort"), icon: FileUser, end: false, tour: "profile" },
  ];
}

/**
 * The open workspace. A path that belongs to one decides it; the screens both
 * share — settings, the review queue — stay under the one that was open.
 */
function useSpace(): Space {
  const { pathname, state } = useLocation();
  // The call screen is shared: a thesis defence runs on it too, and then it
  // is Sustentación's, not Profesional's.
  const defenseCall = Boolean((state as { defense?: unknown } | null)?.defense);
  const owned = defenseCall ? "defense" : spaceOf(pathname);
  const [last, setLast] = useState<Space>(() => owned ?? storedSpace());
  useEffect(() => {
    if (owned && owned !== last) setLast(owned);
    if (owned) rememberSpace(owned);
  }, [owned, last]);
  return owned ?? last;
}

export function AppShell() {
  const t = useT();
  const tt = useThesisT();
  // A student who arrived through an advisor's link is linked on their first
  // visit inside the app — linked only: sharing progress is theirs to choose.
  useEffect(() => {
    let code: string | null = null;
    try {
      code = localStorage.getItem("mockio.advisorRef");
    } catch {
      return;
    }
    if (!code) return;
    linkAdvisor(code, false)
      .catch(() => undefined)
      .finally(() => {
        try {
          localStorage.removeItem("mockio.advisorRef");
        } catch {
          // Nothing to clean up in private mode.
        }
      });
  }, []);
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  /** The live call: immersive on a phone, with its own controls at the bottom. */
  const inCall = location.pathname.replace(/\/+$/, "") === "/app/session";
  const space = useSpace();
  const entries = useSpaceEntries(space);
  /**
   * Whether to show the review entry point. The server decides — this only
   * hides a link, and the route itself is 404 for anyone not on the allowlist.
   */
  const [reviewer, setReviewer] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  /**
   * Whether the CV screen is reachable on this plan. The padlock says so
   * before the click, the way the locked fields in the setup bar already do.
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

  const who = name || session.email || "";
  const account = [
    ...(space === "defense"
      ? [{ to: "/app/advisor", label: tt("railForAdvisors"), icon: GraduationCap }]
      : []),
    { to: "/app/settings", label: t("nav.settings"), icon: Settings },
    ...(reviewer ? [{ to: "/app/review", label: t("nav.review"), icon: ShieldCheck }] : []),
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-surface-deep">
      <TopBar space={space} isPremium={isPremium} who={who} email={session.email} />

      <div className="flex min-w-0 flex-1">
        {/* Apple's sidebar: on the shell's own grey, a hairline where it meets
            the content. It holds only the open workspace's sections, so it
            changes when the tab above it does. */}
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-[4.5rem] shrink-0 flex-col items-center gap-2 border-r border-line py-5 md:flex lg:w-60 lg:items-stretch lg:px-3">
          <p className="hidden px-3 pb-1.5 text-xs font-semibold text-cream-faint lg:block">
            {space === "defense" ? t("nav.spaceDefense") : t("nav.spaceCareer")}
          </p>
          {/* Keyed by space so the new list arrives as a list, not as the old
              one's rows relabelled in place. */}
          <motion.nav
            key={space}
            aria-label={t("nav.sections")}
            className="flex flex-col gap-0.5"
            initial={{ opacity: 0, transform: "translateX(-4px)" }}
            animate={{ opacity: 1, transform: "translateX(0px)", transitionEnd: { transform: "none" } }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            {entries.map(({ to, label, icon, end, tour }) => (
              <RailLink
                key={to}
                to={to}
                end={end}
                label={label}
                icon={icon}
                tour={tour}
                locked={locked.includes(to) ? t("nav.onPaidPlan") : undefined}
              />
            ))}
          </motion.nav>

          <div className="mt-auto flex flex-col gap-0.5 border-t border-line pt-4">
            <nav aria-label={t("nav.you")} className="flex flex-col gap-0.5">
              {account.map(({ to, label, icon }) => (
                <RailLink key={to} to={to} end={false} label={label} icon={icon} quiet />
              ))}
            </nav>
            <button
              onClick={() => {
                void signOut().then(() => window.location.assign("/"));
              }}
              title={t("nav.signOut")}
              className="focus-ring flex items-center gap-3 rounded-[0.625rem] px-3 py-2 text-sm text-cream-dim transition-[background-color,color,transform] duration-150 ease-press hover:bg-surface-lift hover:text-cream-bright active:scale-[0.98]"
            >
              <LogIn className="h-4 w-4 shrink-0 rotate-180" aria-hidden />
              <span className="hidden lg:inline">{t("nav.signOut")}</span>
            </button>
          </div>
        </aside>

        {/* `pb-20 md:pb-0` reserves the height of the mobile bar, which is
            fixed and would otherwise sit on top of the last element. */}
        <div className={`flex min-w-0 flex-1 flex-col md:pb-0 ${inCall ? "" : "pb-[calc(5rem+env(safe-area-inset-bottom,0px))]"}`}>
          {/* No transition between screens: switching sections happens dozens
              of times a session, and an exit that never finishes (a tab in
              the background, a quick second click) once left the content
              area empty under a working sidebar. */}
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
      </div>

      {/* Not during a call: on a phone the call's own controls are the bar
          along the bottom, and the sections' tabs sat on top of them and over
          the defence clock. Leaving goes through the call's red button. */}
      {!inCall && <MobileNav entries={entries} space={space} />}
    </div>
  );
}

/**
 * The bar across the top: the mark, the two workspaces, the person.
 *
 * The workspaces are underlined tabs rather than pills — the same reading as
 * a bank's Personas / Empresas — and the underline slides between them on a
 * spring with no bounce, so the eye follows the switch instead of finding it
 * again. On a phone the same two tabs sit in the middle and the avatar is the
 * way to the account.
 */
function TopBar({
  space,
  isPremium,
  who,
  email,
}: {
  space: Space;
  isPremium: boolean;
  who: string;
  email: string | null;
}) {
  const t = useT();
  const spaces: { id: Space; label: string; icon: Icon }[] = [
    { id: "defense", label: t("nav.spaceDefense"), icon: GraduationCap },
    { id: "career", label: t("nav.spaceCareer"), icon: Briefcase },
  ];
  const initial = (who.trim()[0] ?? "·").toUpperCase();
  return (
    <header className="nav-lifted sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
      <div className="flex h-16 items-center gap-3 px-3 sm:px-5 lg:gap-8 lg:px-6">
        <Link to={SPACE_HOME[space]} className="focus-ring flex shrink-0 items-center gap-2.5 rounded-[0.6rem]" aria-label="Mockio">
          <Mark size={30} className="rounded-[0.55rem] shadow-card" />
          <Wordmark mark={false} className="hidden text-lg font-semibold text-cream-bright lg:inline-flex" />
        </Link>

        <nav aria-label={t("nav.spaces")} className="flex h-full min-w-0 flex-1 items-stretch justify-center gap-1 md:justify-start sm:gap-2">
          {spaces.map(({ id, label, icon: SpaceIcon }) => {
            const active = id === space;
            return (
              <Link
                key={id}
                to={SPACE_HOME[id]}
                onClick={() => rememberSpace(id)}
                aria-current={active ? "page" : undefined}
                className={`focus-ring group relative flex items-center gap-2 rounded-lg px-2.5 text-sm font-semibold transition-[color,transform] duration-150 ease-press active:scale-[0.97] sm:px-3 sm:text-base ${
                  active ? "text-cream-bright" : "text-cream-dim hover:text-cream-bright"
                }`}
              >
                <SpaceIcon
                  aria-hidden
                  className={`hidden h-[1.125rem] w-[1.125rem] sm:block ${active ? "text-accent-text" : ""}`}
                />
                <span className="whitespace-nowrap">{label}</span>
                {active && (
                  <motion.span
                    layoutId="space-underline"
                    aria-hidden
                    className="absolute inset-x-2 bottom-0 h-[3px] rounded-t-full bg-accent"
                    transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          {isPremium && (
            <span className="hidden rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text sm:inline-flex">
              {/* A slow light across it, every few seconds: the one place the
                  paid plan says so, without a badge that shouts. */}
              <PremiumShine />
            </span>
          )}
          {/* A name, when there is one. An address cut to "ana.quispe@unmsm.e…"
              said less than the avatar beside it, which carries it as a title. */}
          {!who.includes("@") && (
            <span className="hidden max-w-[12rem] truncate text-sm font-medium text-cream-dim lg:block" title={email ?? undefined}>
              {who}
            </span>
          )}
          <NavLink
            to="/app/settings"
            aria-label={t("nav.settings")}
            title={email ?? undefined}
            className={({ isActive }) =>
              `focus-ring relative grid h-9 w-9 place-items-center rounded-full text-sm font-semibold transition-[box-shadow,transform] duration-150 ease-press active:scale-[0.94] ${
                isActive ? "bg-accent text-accent-ink" : "bg-surface-card text-cream-bright shadow-card hover:shadow-lift"
              }`
            }
          >
            {initial}
            {isPremium && (
              <span aria-hidden className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-deep bg-accent sm:hidden" />
            )}
          </NavLink>
        </div>
      </div>
    </header>
  );
}

/**
 * One entry in the rail.
 *
 * The workspace's sections carry weight: the active one lifts to a card with
 * the accent's ink on its icon. Account entries are `quiet` — same shape, no
 * colour — because they are places you visit, not places you work.
 */
function RailLink({
  to,
  end,
  label,
  icon: Icon,
  tour,
  quiet = false,
  locked,
}: {
  to: string;
  end: boolean;
  label: string;
  icon: Icon;
  tour?: string;
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
      data-tour={tour ?? to.split("/").pop()}
      className={({ isActive }) =>
        `focus-ring group/rail flex items-center gap-3 rounded-[0.625rem] px-3 text-sm transition-[background-color,color,box-shadow,transform] duration-200 ease-press active:scale-[0.98] ${
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
          <span className="hidden truncate lg:inline">{label}</span>
          {locked && <PremiumMark label={locked} className="ml-auto hidden lg:inline-grid" />}
        </>
      )}
    </NavLink>
  );
}

/**
 * Bottom bar, below `md` only: the open workspace's sections.
 *
 * The account moved to the avatar in the top bar, so every slot here is a
 * place to work — five for the thesis, four for the career side.
 */
function MobileNav({ entries, space }: { entries: Entry[]; space: Space }) {
  const t = useT();
  const tab = (active: boolean) =>
    `focus-ring flex h-16 flex-col items-center justify-center gap-1 px-0.5 text-xs font-medium transition-[color,transform] duration-150 ease-press active:scale-[0.94] ${
      active ? "text-accent-text" : "text-cream-faint"
    }`;
  return (
    <nav
      aria-label={t("nav.sections")}
      /* Apple's tab bar material: translucent, with the page scrolling under
         it, and the safe-area inset so the labels clear the home indicator. */
      className="nav-lifted fixed inset-x-0 bottom-0 z-30 !border-b-0 border-t border-line pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul key={space} className="mx-auto flex max-w-md items-stretch justify-around">
        {entries.filter((entry) => !entry.wide).map(({ to, short, icon: EntryIcon, end, tour }) => (
          <li key={to} className="min-w-0 flex-1">
            <NavLink
              to={to}
              end={end}
              // The rail is still in the DOM at this width, collapsed to a
              // zero-sized box. Marking this one too means the tour has a
              // real target to point at rather than the rail's empty rect.
              data-tour={tour}
              className={({ isActive }) => tab(isActive)}
            >
              <EntryIcon className="h-5 w-5" aria-hidden />
              <span className="max-w-full truncate">{short}</span>
            </NavLink>
          </li>
        ))}
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
  compact = false,
}: {
  title: string;
  meta?: string;
  actions?: ReactNode;
  /**
   * A screen whose content is the point, like a call: on a phone the large
   * title took a third of the screen above the video. Small there, large
   * from `sm` up as everywhere else.
   */
  compact?: boolean;
}) {
  return (
    /* Apple's large title: no rule under it — the size and the space after
       it already end the header, and a line would only box it in. */
    <header className={`px-4 pb-2 sm:px-6 lg:px-10 lg:pt-10 ${compact ? "pt-4 sm:pt-8" : "pt-8"}`}>
      {/* Same container as PageBody, so the title lines up with the content
          under it at every width. */}
      <div className="mx-auto flex w-full max-w-[110rem] flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1
            className={`font-bold leading-[1.1] tracking-[-0.028em] text-cream-bright sm:text-[2.5rem] ${
              compact ? "line-clamp-2 text-xl" : "text-[2rem]"
            }`}
          >
            {title}
          </h1>
          {meta && <p className="mt-1.5 text-sm text-cream-dim">{meta}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}

/** "Premium" with a slow light across it. */
function PremiumShine() {
  const ink = useTokenColor("accent-text");
  const light = useTokenColor("cream-bright");
  return <ShinyText text="Premium" color={ink} shineColor={light} speed={2.4} delay={4} />;
}
