import { useEffect } from "react";
import { MotionConfig } from "framer-motion";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Hero } from "@/components/Hero";
import { LandingNav } from "@/components/LandingNav";
import { Privacy, Terms } from "@/legal/LegalPage";
import { InterviewPreview } from "@/components/InterviewPreview";
import { CompanyPicker } from "@/components/CompanyPicker";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { Contribute } from "@/components/Contribute";
import { SiteFooter } from "@/components/SiteFooter";
import { AppShell } from "@/platform/AppShell";
import { SessionSetup } from "@/platform/SessionSetup";
import { LiveInterview } from "@/platform/LiveInterview";
import { FeedbackReport } from "@/platform/FeedbackReport";
import { SessionHistory } from "@/platform/SessionHistory";
import { Progress } from "@/platform/Progress";
import { Profile } from "@/platform/Profile";
import { Review } from "@/platform/Review";
import { Settings } from "@/platform/Settings";
import { SignIn } from "@/platform/SignIn";
import { ResetPassword } from "@/platform/ResetPassword";
import { Unsubscribe } from "@/platform/Unsubscribe";
import { ConfirmEmail } from "@/platform/ConfirmEmail";
import { LocaleProvider } from "@/hooks/useLocale";
import { pageView, startAnalytics } from "@/lib/analytics";

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
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<SignIn />} />
        {/* One route for both halves: request a link, or use one. */}
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/verify" element={<ConfirmEmail />} />
        {/* Outside the shell: reachable without an account, and linked from
            the footer, the sign-up screen and the payment provider. */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        {/* Everything signed-in lives under the shell, so a new screen is one
            route plus one component — no layout wiring. */}
        <Route path="/app" element={<AppShell />}>
          <Route index element={<SessionSetup />} />
          <Route path="session" element={<LiveInterview />} />
          <Route path="feedback" element={<FeedbackReport />} />
          <Route path="history" element={<SessionHistory />} />
          <Route path="progress" element={<Progress />} />
          <Route path="profile" element={<Profile />} />
          <Route path="review" element={<Review />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </LocaleProvider>
    </MotionConfig>
  );
}
