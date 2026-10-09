import { lazy, Suspense, useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Hero } from "@/components/Hero";
import { LandingNav } from "@/components/LandingNav";
import { Privacy, Terms } from "@/legal/LegalPage";
import { InterviewPreview } from "@/components/InterviewPreview";
import { Habit } from "@/components/Habit";
import { CompanyPicker } from "@/components/CompanyPicker";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { Contribute } from "@/components/Contribute";
import { SiteFooter } from "@/components/SiteFooter";
import { SignIn } from "@/platform/SignIn";
import { ResetPassword } from "@/platform/ResetPassword";
import { Unsubscribe } from "@/platform/Unsubscribe";
import { ConfirmEmail } from "@/platform/ConfirmEmail";
import { LocaleProvider } from "@/hooks/useLocale";
import { pageView, startAnalytics } from "@/lib/analytics";
import { DevDataToggle } from "@/platform/DevDataToggle";

/**
 * The signed-in half, fetched when someone goes there.
 *
 * A visitor who reads the landing page and leaves — most of them — was
 * downloading the interview screen, the charts, the settings and the review
 * queue along with it. None of that can be reached without an account, so
 * none of it belongs in the first request.
 *
 * The landing page, the legal pages and the sign-in screen stay eager: they
 * are the first thing a stranger sees, and a spinner in front of them would
 * trade a smaller download for a slower page.
 */
const AppShell = lazy(() => import("@/platform/AppShell").then((m) => ({ default: m.AppShell })));
const SessionSetup = lazy(() => import("@/platform/SessionSetup").then((m) => ({ default: m.SessionSetup })));
const LiveInterview = lazy(() => import("@/platform/LiveInterview").then((m) => ({ default: m.LiveInterview })));
const FeedbackReport = lazy(() => import("@/platform/FeedbackReport").then((m) => ({ default: m.FeedbackReport })));
const Progress = lazy(() => import("@/platform/Progress").then((m) => ({ default: m.Progress })));
const Profile = lazy(() => import("@/platform/Profile").then((m) => ({ default: m.Profile })));
const Review = lazy(() => import("@/platform/Review").then((m) => ({ default: m.Review })));
const Settings = lazy(() => import("@/platform/Settings").then((m) => ({ default: m.Settings })));
const ShareCard = lazy(() => import("@/platform/ShareCard").then((m) => ({ default: m.ShareCard })));
const Applications = lazy(() => import("@/platform/Applications").then((m) => ({ default: m.Applications })));
/**
 * Lazy although it is public, which is the opposite of the rule above.
 *
 * A shared report is a page a stranger lands on directly from a link, so it is
 * never the second request — nothing is saved by having it in the first
 * bundle, and everyone who only reads the landing page would carry it.
 */
const SharedReport = lazy(() => import("@/platform/SharedReport").then((m) => ({ default: m.SharedReport })));

/**
 * One page view per route change.
 *
 * Inside the router because that is the only place that knows a route actually
 * changed: PostHog's own listener fires on the history events this app uses
 * for its own state too — the settings tabs and the `#plan` anchor among
 * them — and would count those as visits.
 */
function RouteViews() {
  const { pathname } = useLocation();
  useEffect(() => {
    startAnalytics();
    pageView(pathname);
  }, [pathname]);
  return null;
}

function Landing() {
  return (
    <main className="bg-surface-base">
      <LandingNav />
      <Hero />
      {/* Pricing sits second, directly under the hero, where early access
          used to be. The people this is for decide in the first screen or
          leave, so the ask goes where they are — and the ask is now the plan
          itself rather than a list to join. What it costs is the argument
          being made before the offer; that argument is the rest of the page,
          and it is still there for anyone who wants it before deciding.

          `EarlyAccess` is not gone, only unmounted: the endpoint, the grants
          and the countdown all still work, so putting the section back is one
          line. */}
      <Pricing />
      <InterviewPreview />
      <Habit />
      <CompanyPicker />
      <Features />
      {/* The question bank closes the page: it asks for something rather than
          offering something, so it belongs after the case has been made. */}
      <Contribute />
      <SiteFooter />
    </main>
  );
}

export function App() {
  return (
    /**
     * `reducedMotion="user"` makes Framer Motion respect the OS setting the
     * way the CSS in index.css already did. Without it that rule covered only
     * CSS animations, so every JS-driven entrance still moved — and since
     * those entrances are what make content visible, a reader who asked for
     * less motion could be left looking at an empty panel.
     */
    <MotionConfig reducedMotion="user">
    <LocaleProvider>
    <BrowserRouter>
      <RouteViews />
      {/* Worst-case data for break-ui — a dev build only. */}
      {import.meta.env.DEV && <DevDataToggle />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<SignIn />} />
        {/* One route for both halves: request a link, or use one. */}
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        {/* Public, and outside the shell below: the reader was sent this link
            and has no account. `/r/` rather than `/report/` because the link
            gets pasted into chat windows that break long URLs. */}
        <Route
          path="/r/:token"
          element={
            <Suspense fallback={null}>
              <SharedReport />
            </Suspense>
          }
        />
        <Route path="/verify" element={<ConfirmEmail />} />
        {/* Outside the shell: reachable without an account, and linked from
            the footer, the sign-up screen and the payment provider. */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        {/* Everything signed-in lives under the shell, so a new screen is one
            route plus one component — no layout wiring. */}
        <Route
          path="/app"
          element={
            /* No fallback markup: the shell resolves in a few milliseconds
               from cache, and a spinner that flashes for one frame reads as
               a glitch rather than as loading. */
            <Suspense fallback={null}>
              <AppShell />
            </Suspense>
          }
        >
          <Route index element={<Suspense fallback={null}><SessionSetup /></Suspense>} />
          <Route path="session" element={<Suspense fallback={null}><LiveInterview /></Suspense>} />
          <Route path="feedback" element={<Suspense fallback={null}><FeedbackReport /></Suspense>} />
          {/* History is the bottom half of the path now. Kept as a route so
              old links and bookmarks still land somewhere true. */}
          <Route path="history" element={<Navigate to="/app/progress#sessions" replace />} />
          <Route path="progress" element={<Suspense fallback={null}><Progress /></Suspense>} />
          <Route path="profile" element={<Suspense fallback={null}><Profile /></Suspense>} />
          <Route path="review" element={<Suspense fallback={null}><Review /></Suspense>} />
          <Route path="settings" element={<Suspense fallback={null}><Settings /></Suspense>} />
          <Route path="share" element={<Suspense fallback={null}><ShareCard /></Suspense>} />
          <Route path="applications" element={<Suspense fallback={null}><Applications /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
    </LocaleProvider>
    </MotionConfig>
  );
}
