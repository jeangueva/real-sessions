import { MotionConfig } from "framer-motion";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Hero } from "@/components/Hero";
import { InterviewPreview } from "@/components/InterviewPreview";
import { CompanyPicker } from "@/components/CompanyPicker";
import { Features } from "@/components/Features";
import { Pricing } from "@/components/Pricing";
import { EarlyAccess } from "@/components/EarlyAccess";
import { Contribute } from "@/components/Contribute";
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
import { ConfirmEmail } from "@/platform/ConfirmEmail";

function Landing() {
  return (
    <main className="bg-surface-base">
      <Hero />
      <InterviewPreview />
      <CompanyPicker />
      <Features />
      <Pricing />
      <EarlyAccess />
      <Contribute />
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<SignIn />} />
        {/* One route for both halves: request a link, or use one. */}
        <Route path="/reset" element={<ResetPassword />} />
        <Route path="/verify" element={<ConfirmEmail />} />
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
    </MotionConfig>
  );
}
