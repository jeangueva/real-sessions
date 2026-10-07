import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Section,
  Panel,
  FadeRise,
  WordsPullUp,
  Waveform,
  InterviewerPresence,
} from "@/design-system";
import { useT } from "@/hooks/useLocale";
import {
  Sparkles,
  Search,
  CheckCircle2,
  TrendingUp,
  Bot,
  Zap,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

export function Features() {
  const t = useT();
  const [activeTab, setActiveTab] = useState<"stripe" | "airbnb" | "amazon">("stripe");
  const [searchQuery, setSearchQuery] = useState("Staff Backend Engineer");

  return (
    <Section id="features" className="relative bg-surface-deep">
      <div className="relative">
        {/* Two weights of one sentence, Apple's two-tone headline: the claim
            in ink, the qualifier in grey, no second typeface needed. */}
        <h2 className="mx-auto max-w-3xl text-balance text-center text-headline font-semibold">
          <WordsPullUp align="center" className="text-cream-bright">
            {t("land.featuresTitle")}
          </WordsPullUp>{" "}
          <WordsPullUp align="center" className="text-cream-faint" delay={0.3}>
            {t("land.featuresSub")}
          </WordsPullUp>
        </h2>

        {/* 5-Card Bento Grid Mosaic */}
        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {/* CARD 1: Hero Simulation Stage (Col Span 2) */}
          <FadeRise className="md:col-span-2">
              <Panel
                variant="raised"
                className="relative flex h-full min-h-[22rem] flex-col justify-between overflow-hidden p-6 sm:p-8"
              >

                <div className="relative flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 rounded-full bg-surface-lift px-3 py-1.5">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-grow" />
                    <span className="text-xs font-medium text-cream-bright">
                      Live Turn Simulation
                    </span>
                  </div>
                </div>

                <div className="relative my-6 flex flex-col items-center justify-center gap-4 text-center">
                  <InterviewerPresence
                    initials="MR"
                    speaking={true}
                    size={72}
                    className="scale-100"
                  />
                  <div className="max-w-md">
                    <p className="text-sm font-medium text-cream-bright sm:text-base">
                      “How did you handle the database failover during the Black Friday peak?”
                    </p>
                    <p className="mt-1 text-xs text-cream-dim">
                      Marcus · Lead Infrastructure Architect @ Stripe
                    </p>
                  </div>
                  <Waveform
                    active={true}
                    level={() => 0.65}
                    label="Marcus is speaking"
                    className="text-accent"
                  />
                </div>

                <div className="relative flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs text-cream-dim">
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-accent" />
                    Real voice synthesis & dynamic speech cadence
                  </span>
                  <Link
                    to="/app"
                    className="flex items-center gap-1 font-medium text-accent-text hover:opacity-80"
                  >
                    Try interactive stage <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Panel>
          </FadeRise>

          {/* CARD 2: Real-time Evaluation Toast */}
          <FadeRise delay={0.1}>
              <Panel className="flex h-full min-h-[22rem] flex-col justify-between p-6 sm:p-7">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-step" />
                    <h3 className="text-base font-semibold text-cream-bright sm:text-lg">
                      {t("land.card1Title")}
                    </h3>
                  </div>
                </div>

                <div className="my-auto flex flex-col gap-3">
                  <div className="rounded-2xl bg-surface-card p-4 shadow-card">
                    <div className="flex items-center justify-between text-xs text-cream-faint">
                      <span>Detected mistake</span>
                      <span className="tabular-nums font-semibold text-step">Grammar & Syntax</span>
                    </div>
                    <p className="mt-2 text-sm text-cream-bright line-through opacity-70">
                      “It depends of the traffic volume...”
                    </p>
                    <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-grow-soft p-2.5 text-xs text-grow-text">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Natural: “It depends <strong>on</strong> the traffic volume”</span>
                    </div>
                  </div>
                </div>

                <ul className="flex flex-col gap-2 border-t border-line pt-4 text-xs text-cream-dim">
                  <li className="flex items-center gap-2">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {t("land.card1b")}
                  </li>
                  <li className="flex items-center gap-2">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {t("land.card1c")}
                  </li>
                </ul>
              </Panel>
          </FadeRise>

          {/* CARD 3: Company & Persona Culture Matrix */}
          <FadeRise delay={0.15}>
              <Panel className="flex h-full min-h-[20rem] flex-col justify-between p-6 sm:p-7">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-accent" />
                    <h3 className="text-base font-semibold text-cream-bright sm:text-lg">
                      Culture DNA Matching
                    </h3>
                  </div>
                </div>

                <div className="my-auto flex flex-col gap-3.5">
                  <div className="flex items-center gap-1 rounded-full bg-surface-lift p-1">
                    {(["stripe", "airbnb", "amazon"] as const).map((company) => (
                      <button
                        key={company}
                        type="button"
                        onClick={() => setActiveTab(company)}
                        className={`focus-ring flex-1 rounded-full py-1.5 text-xs font-medium capitalize transition-[background-color,color,box-shadow] duration-200 ease-press ${
                          activeTab === company
                            ? "bg-surface-card text-cream-bright shadow-card"
                            : "text-cream-dim hover:text-cream-bright"
                        }`}
                      >
                        {company}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-2xl bg-surface-lift p-4">
                    <p className="text-xs font-semibold text-accent-text">
                      {activeTab === "stripe" && "Craft · User Obsession · Technical Rigor"}
                      {activeTab === "airbnb" && "Belonging · Design-Led · High Taste"}
                      {activeTab === "amazon" && "Customer Obsession · STAR Framework"}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-cream-dim">
                      {activeTab === "stripe" && t("land.stripeBlurb")}
                      {activeTab === "airbnb" && t("land.airbnbBlurb")}
                      {activeTab === "amazon" && t("land.amazonBlurb")}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-cream-faint">
                  Adapts questioning style to real engineering bar.
                </p>
              </Panel>
          </FadeRise>

          {/* CARD 4: Performance Telemetry Analytics */}
          <FadeRise delay={0.2}>
              <Panel className="flex h-full min-h-[20rem] flex-col justify-between p-6 sm:p-7">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-grow" />
                    <h3 className="text-base font-semibold text-cream-bright sm:text-lg">
                      {t("land.card3Title")}
                    </h3>
                  </div>
                </div>

                <div className="my-auto flex flex-col gap-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-cream-dim">STAR Answer Structure</span>
                      <span className="tabular-nums font-semibold text-grow">92%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-lift">
                      <div className="h-full w-[92%] rounded-full bg-grow transition-all" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-cream-dim">Pace & Speaking Cadence</span>
                      <span className="tabular-nums font-semibold text-accent">138 wpm</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-lift">
                      <div className="h-full w-[85%] rounded-full bg-accent transition-all" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-cream-dim">Filler Words Rate</span>
                      <span className="tabular-nums font-semibold text-cream-bright">1.2%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-lift">
                      <div className="h-full w-[20%] rounded-full bg-cream transition-all" />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-cream-faint">
                  {t("land.card3b")}
                </p>
              </Panel>
          </FadeRise>

          {/* CARD 5: Contextual Role Setup */}
          <FadeRise delay={0.25}>
              <Panel className="flex h-full min-h-[20rem] flex-col justify-between p-6 sm:p-7">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <h3 className="text-base font-semibold text-cream-bright sm:text-lg">
                      {t("land.card2Title")}
                    </h3>
                  </div>
                </div>

                <div className="my-auto flex flex-col gap-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-faint" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Role or target company..."
                      className="w-full rounded-full border border-line-strong bg-surface-card py-2.5 pl-10 pr-4 text-sm text-cream-bright placeholder:text-cream-faint focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {["Distributed Systems", "Frontend Lead", "Product Manager", "ML Engineer"].map(
                      (role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setSearchQuery(role)}
                          className="focus-ring rounded-full bg-surface-lift px-3 py-1 text-xs font-medium text-cream-dim transition-colors hover:text-cream-bright"
                        >
                          {role}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <p className="text-xs text-cream-faint">
                  {t("land.card2a")}
                </p>
              </Panel>
          </FadeRise>
        </div>
      </div>
    </Section>
  );
}
