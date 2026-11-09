import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ScreenBoundary } from "./ScreenBoundary";
import { WorkspaceNav } from "./WorkspaceNav";
import { OmniSearch } from "./OmniSearch";
import { useHomeCatalogue } from "./useHomeCatalogue";
import {
  Home,
  MessagesSquare,
  Compass,
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
  Search,
  ShieldCheck,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import type { ReactNode } from "react";
import { fetchPlan, fetchPreferences, fetchSession, linkAdvisor, signOut } from "@/lib/api";
import type { Session } from "@/lib/api";
import { useLocale, useT } from "@/hooks/useLocale";
import { useThesisT } from "@/lib/thesis-copy";
import { Mark, Wordmark } from "@/design-system";
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
 * Education and Professional have equal entry points and contextual navigation.
 *
 * One bar across the top, a streaming app's way, and the whole width below it
 * for the content. At `lg` the open workspace's sections are words in the bar;
 * between `md` and `lg` they fold into one "Browse" menu; below `md` they are a
 * bar along the bottom. The search (also Ctrl+K), the workspace switch and the
 * account menu sit on the right at every width.
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
      { to: SPACE_HOME.defense, label: t("nav.home"), short: t("nav.home"), icon: Home, end: true, tour: "education" },
      { to: "/app/training/education", label: t("nav.academicScenarios"), short: t("nav.scenariosShort"), icon: GraduationCap, end: false, tour: "academic" },
      { to: thesisPath("ensayar"), label: tt("tabRehearse"), short: tt("shortRehearse"), icon: Mic, end: true, tour: "ensayar" },
      { to: thesisPath("diagnostico"), label: tt("tabDiagnosis"), short: tt("shortDiagnosis"), icon: FileSearch, end: false, tour: "diagnostico" },
      { to: thesisPath("repaso"), label: tt("tabStudy"), short: tt("shortStudy"), icon: BookOpenCheck, end: false, tour: "repaso", wide: true },
      { to: thesisPath("diapositivas"), label: tt("tabSlides"), short: tt("shortSlides"), icon: Presentation, end: false, tour: "diapositivas", wide: true },
      { to: thesisPath("observaciones"), label: tt("tabObservations"), short: tt("shortObservations"), icon: ClipboardCheck, end: false, tour: "observaciones", wide: true },
      { to: thesisPath("mas"), label: tt("railMore"), short: tt("shortMore"), icon: Sparkles, end: false, tour: "mas" },
    ];
  }
  return [
    { to: SPACE_HOME.career, label: t("nav.home"), short: t("nav.home"), icon: Home, end: true, tour: "professional" },
    { to: "/app/training/professional", label: t("nav.conversations"), short: t("nav.conversationsShort"), icon: MessagesSquare, end: false, tour: "conversations" },
    { to: "/app/intuition", label: t("nav.intuition"), short: t("nav.intuition"), icon: Compass, end: false, tour: "intuition" },
    { to: "/app/practice", label: t("nav.interviews"), short: t("nav.interviewsShort"), icon: Play, end: false, tour: "practice" },
    { to: "/app/progress", label: t("nav.progress"), short: t("nav.progressShort"), icon: Route, end: false, tour: "progress" },
    { to: "/app/applications", label: t("nav.applications"), short: t("nav.applicationsShort"), icon: Briefcase, end: false, tour: "applications", wide: true },
    { to: "/app/profile", label: t("nav.context"), short: t("nav.contextShort"), icon: FileUser, end: false, tour: "profile", wide: true },
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
  useEffect(() => {
    const onSpace = (event: Event) => {
      const next = (event as CustomEvent<Space>).detail;
      if (next === "defense" || next === "career") setLast(next);
    };
    window.addEventListener("mockio:space", onSpace);
    return () => window.removeEventListener("mockio:space", onSpace);
  }, []);
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
  /** The name from Settings → Account, shown instead of the email. */
  const [name, setName] = useState("");
  const [searching, setSearching] = useState(false);

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
      })
      .catch(() => setReviewer(false));
  }, []);

  // Ctrl+K / ⌘K opens the search from anywhere, the way it does in most apps
  // people already use. Not during a call, where typing is answering.
  useEffect(() => {
    if (inCall) return;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearching(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inCall]);

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
      <TopBar
        space={space}
        entries={entries}
        account={account}
        isPremium={isPremium}
        who={who}
        email={session.email}
        onSearch={() => setSearching(true)}
      />

      {/* `pb-20 md:pb-0` reserves the height of the mobile bar, which is
          fixed and would otherwise sit on top of the last element. */}
      <div className={`flex min-w-0 flex-1 flex-col md:pb-0 ${inCall ? "" : "pb-[calc(5rem+env(safe-area-inset-bottom,0px))]"}`}>
        {/* No transition between screens: switching sections happens dozens
            of times a session, and an exit that never finishes (a tab in
            the background, a quick second click) once left the content
            area empty. */}
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

      {/* Not during a call: on a phone the call's own controls are the bar
          along the bottom, and the sections' tabs sat on top of them and over
          the defence clock. Leaving goes through the call's red button. */}
      {!inCall && <MobileNav entries={entries} space={space} />}
      {searching && <SearchDialog onClose={() => setSearching(false)} />}
    </div>
  );
}

interface AccountLink {
  to: string;
  label: string;
  icon: Icon;
}

/**
 * The bar across the top, Netflix's way: the mark, the open workspace's
 * sections as plain text links, and on the right the search, the workspace
 * switch and the person.
 *
 * The sections are words, not tabs or pills: the current one is bright and
 * bold, the rest dim, and nothing else marks them — the content under the bar
 * is what should hold the eye. At `lg` every main section is a link and the
 * rest sit under "More"; between `md` and `lg` all of them fold into one
 * "Browse" menu. On a phone the sections are the bar along the bottom.
 */
function TopBar({
  space,
  entries,
  account,
  isPremium,
  who,
  email,
  onSearch,
}: {
  space: Space;
  entries: Entry[];
  account: AccountLink[];
  isPremium: boolean;
  who: string;
  email: string | null;
  onSearch: () => void;
}) {
  const t = useT();
  const copy = useShellCopy();
  const initial = (who.trim()[0] ?? "·").toUpperCase();
  const main = entries.filter((entry) => !entry.wide);
  const more = entries.filter((entry) => entry.wide);
  return (
    <header className="nav-lifted sticky top-0 z-40 pt-[env(safe-area-inset-top)]">
      <div className="flex h-16 items-center gap-3 px-3 sm:px-5 lg:gap-6 lg:px-10">
        <Link to={SPACE_HOME[space]} className="focus-ring flex shrink-0 items-center gap-2.5 rounded-[0.6rem]" aria-label="Mockio">
          <Mark size={30} className="rounded-[0.55rem] shadow-card" />
          <Wordmark mark={false} className="hidden text-lg font-semibold text-cream-bright xl:inline-flex" />
        </Link>

        {/* lg and up: the sections as words. */}
        <nav aria-label={t("nav.sections")} className="hidden min-w-0 items-center gap-1 lg:flex">
          {main.map((entry) => (
            <TopLink key={entry.to} entry={entry} />
          ))}
          {more.length > 0 && (
            <Menu label={copy.more} items={more.map(toMenuItem)} />
          )}
        </nav>

        {/* md to lg: one menu holding every section. */}
        <div className="hidden md:block lg:hidden">
          <Menu label={copy.browse} items={entries.map(toMenuItem)} />
        </div>

        <div className="ml-auto flex min-w-0 shrink items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onSearch}
            aria-label={copy.search}
            title={`${copy.search} (Ctrl+K)`}
            data-tour="search-all"
            className="focus-ring grid h-10 w-10 shrink-0 place-items-center rounded-full text-cream-bright transition-colors hover:bg-surface-lift"
          >
            <Search className="h-5 w-5" aria-hidden />
          </button>

          <div className="flex min-w-0">
            <WorkspaceNav space={space} />
          </div>

          {isPremium && (
            <span className="hidden rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-text xl:inline-flex">
              <PremiumShine />
            </span>
          )}

          <Menu
            label={t("nav.settings")}
            align="right"
            header={who || email || undefined}
            trigger={
              <span
                title={email ?? undefined}
                className="relative grid h-9 w-9 place-items-center rounded-full bg-surface-card text-sm font-semibold text-cream-bright shadow-card"
              >
                {initial}
                {isPremium && (
                  <span aria-hidden className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-deep bg-accent" />
                )}
              </span>
            }
            items={[
              ...account.map(({ to, label, icon }) => ({ to, label, icon })),
              {
                label: t("nav.signOut"),
                icon: LogIn,
                onSelect: () => {
                  void signOut().then(() => window.location.assign("/"));
                },
              },
            ]}
          />
        </div>
      </div>
    </header>
  );
}

function toMenuItem(entry: Entry): MenuItem {
  return { to: entry.to, label: entry.label, icon: entry.icon, end: entry.end, tour: entry.tour };
}

/** One section in the top bar: bright and bold when open, dim otherwise. */
function TopLink({ entry }: { entry: Entry }) {
  return (
    <NavLink
      to={entry.to}
      end={entry.end}
      data-tour={entry.tour}
      className={({ isActive }) =>
        `focus-ring whitespace-nowrap rounded-full px-3 py-2 text-sm transition-colors duration-150 ${
          isActive
            ? "bg-surface-card font-semibold text-cream-bright shadow-card"
            : "font-medium text-cream-dim hover:text-cream-bright"
        }`
      }
    >
      {entry.label}
    </NavLink>
  );
}

interface MenuItem {
  label: string;
  icon: Icon;
  to?: string;
  end?: boolean;
  tour?: string;
  onSelect?: () => void;
}

/**
 * A small disclosure menu: a button, and under it a list of links.
 *
 * Closes on a choice, on Escape (returning focus to the button) and on a click
 * anywhere else. The items are ordinary links, so the browser's own keyboard
 * handling — Tab, Enter, opening in a new tab — keeps working.
 */
function Menu({
  label,
  items,
  trigger,
  header,
  align = "left",
}: {
  label: string;
  items: MenuItem[];
  trigger?: ReactNode;
  header?: string;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const row =
    "focus-ring flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-cream-dim transition-colors hover:bg-surface-lift hover:text-cream-bright";

  return (
    <div ref={box} className="relative shrink-0">
      <button
        ref={button}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={id}
        aria-label={trigger ? label : undefined}
        onClick={() => setOpen((value) => !value)}
        className={`focus-ring flex items-center gap-1 rounded-full ${trigger ? "" : "px-3 py-2 text-sm font-medium text-cream-dim hover:text-cream-bright"}`}
      >
        {trigger ?? label}
        <ChevronDown className={`h-4 w-4 text-cream-dim transition-transform duration-150 ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div
          id={id}
          className={`absolute top-full z-50 mt-2 w-64 rounded-2xl bg-surface-card p-2 shadow-float ring-1 ring-[color:var(--line)] ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {header && (
            <p className="truncate border-b border-line px-3 pb-2 pt-1 text-xs font-medium text-cream-faint">{header}</p>
          )}
          <ul className="mt-1 flex flex-col gap-0.5">
            {items.map(({ label: itemLabel, icon: ItemIcon, to, end, tour, onSelect }) => (
              <li key={to ?? itemLabel}>
                {to ? (
                  <NavLink
                    to={to}
                    end={end}
                    data-tour={tour}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) => `${row} ${isActive ? "bg-surface-lift font-semibold text-cream-bright" : ""}`}
                  >
                    <ItemIcon className="h-4 w-4 shrink-0" aria-hidden />
                    {itemLabel}
                  </NavLink>
                ) : (
                  <button
                    type="button"
                    className={row}
                    onClick={() => {
                      setOpen(false);
                      onSelect?.();
                    }}
                  >
                    <ItemIcon className="h-4 w-4 shrink-0" aria-hidden />
                    {itemLabel}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * The search, from anywhere: the same field as on the home screen, in a
 * dialog over the current page. The catalogue is fetched when it opens.
 */
function SearchDialog({ onClose }: { onClose: () => void }) {
  const copy = useShellCopy();
  const catalogue = useHomeCatalogue();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.search}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl">
        <OmniSearch
          items={catalogue.index}
          suggested={catalogue.index.filter((item) => item.kind === "scenario").slice(0, 4)}
          autoFocus
          onDone={onClose}
        />
      </div>
    </div>
  );
}

const SHELL_COPY = {
  es: { more: "Más", browse: "Explorar", search: "Buscar" },
  en: { more: "More", browse: "Browse", search: "Search" },
  pt: { more: "Mais", browse: "Explorar", search: "Buscar" },
  fr: { more: "Plus", browse: "Parcourir", search: "Rechercher" },
};

function useShellCopy() {
  const { locale } = useLocale();
  return SHELL_COPY[locale as keyof typeof SHELL_COPY] ?? SHELL_COPY.en;
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
  dense = false,
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
  /** Compact workspace header at every viewport, without reducing body text. */
  dense?: boolean;
}) {
  return (
    /* Apple's large title: no rule under it — the size and the space after
       it already end the header, and a line would only box it in. */
    <header className={`px-4 pb-2 sm:px-6 lg:px-10 ${dense ? "pt-4" : `lg:pt-10 ${compact ? "pt-4 sm:pt-8" : "pt-8"}`}`}>
      {/* Same container as PageBody, so the title lines up with the content
          under it at every width. */}
      <div className="mx-auto flex w-full max-w-[110rem] flex-wrap items-end justify-between gap-x-4 gap-y-3">
        {/* The title's own measure is capped even though the container is not.
            A heading that can run the full width of a desktop window stops
            being a heading and becomes a line of text: the eye has no second
            line to return to, and a long one arrives as a single unreadable
            band across the screen. */}
        <div className="min-w-0 max-w-[52rem]">
          <h1
            className={`text-balance font-light leading-[1.05] tracking-[-0.045em] text-cream-bright ${
              dense ? "text-xl sm:text-2xl" : compact ? "line-clamp-2 text-xl sm:text-[2.5rem]" : "text-[2rem] sm:text-[2.5rem]"
            }`}
          >
            {title}
          </h1>
          {meta && <p className="mt-1.5 max-w-[46rem] text-pretty text-sm leading-relaxed text-cream-dim">{meta}</p>}
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
