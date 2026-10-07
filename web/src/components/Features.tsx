import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Section,
  Panel,
  FadeRise,
  WordsPullUp,
  SpotlightBorder,
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
    <Section id="features" className="relative bg-surface-base">
      <div
        aria-hidden
        className="bg-noise pointer-events-none absolute inset-0 opacity-[0.15]"
      />

      <div className="relative">
        <h2 className="max-w-3xl text-title">
          <WordsPullUp className="text-cream-bright">
            {t("land.featuresTitle")}
          </WordsPullUp>
          <WordsPullUp className="text-cream-faint" delay={0.3}>
            {t("land.featuresSub")}
          </WordsPullUp>
        </h2>

        {/* 5-Card Bento Grid Mosaic */}
        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* CARD 1: Hero Simulation Stage (Col Span 2) */}
          <FadeRise className="md:col-span-2">
            <SpotlightBorder borderRadius="1.5rem" className="h-full">
              <Panel
                variant="raised"
                className="relative flex h-full min-h-[22rem] flex-col justify-between overflow-hidden p-6 sm:p-8"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(80% 60% at 50% 0%, rgba(168,151,255,0.12) 0%, transparent 70%)",
                  }}
                />

                <div className="relative flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-line bg-surface-deep/80 px-3 py-1.5 backdrop-blur">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-grow" />
                    <span className="text-xs font-medium text-cream-bright">
                      Live Turn Simulation
                    </span>
                  </div>
                  <span className="text-xs text-cream-faint">01 · Real Stage</span>
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
                    className="flex items-center gap-1 text-cream-bright hover:underline"
                  >
                    Try interactive stage <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Panel>
            </SpotlightBorder>
          </FadeRise>

          {/* CARD 2: Real-time Evaluation Toast */}
          <FadeRise delay={0.1}>
            <SpotlightBorder borderRadius="1.5rem" className="h-full">
              <Panel className="flex h-full min-h-[22rem] flex-col justify-between p-6 sm:p-7">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-step" />
                    <h3 className="text-sm font-bold text-cream-bright sm:text-base">
                      {t("land.card1Title")}
                    </h3>
                  </div>
                  <span className="text-xs text-cream-faint">02</span>
                </div>

                <div className="my-auto flex flex-col gap-3">
                  <div className="rounded-2xl border border-line bg-surface-deep/90 p-4 shadow-lg">
                    <div className="flex items-center justify-between text-xs text-cream-faint">
                      <span>Detected mistake</span>
                      <span className="font-mono text-step">Grammar & Syntax</span>
                    </div>
                    <p className="mt-2 text-sm text-cream-bright line-through opacity-70">
                      “It depends of the traffic volume...”
                    </p>
                    <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-grow/10 p-2.5 text-xs text-grow">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Natural: “It depends <strong>on</strong> the traffic volume”</span>
                    </div>
                  </div>
                </div>

                <ul className="flex flex-col gap-2 border-t border-line pt-4 text-xs text-cream-dim">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {t("land.card1b")}
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {t("land.card1c")}
                  </li>
                </ul>
              </Panel>
            </SpotlightBorder>
          </FadeRise>

          {/* CARD 3: Company & Persona Culture Matrix */}
          <FadeRise delay={0.15}>
            <SpotlightBorder borderRadius="1.5rem" className="h-full">
              <Panel className="flex h-full min-h-[20rem] flex-col justify-between p-6 sm:p-7">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-accent" />
                    <h3 className="text-sm font-bold text-cream-bright sm:text-base">
                      Culture DNA Matching
                    </h3>
                  </div>
                  <span className="text-xs text-cream-faint">03</span>
                </div>

                <div className="my-auto flex flex-col gap-3.5">
                  <div className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-deep p-1">
                    {(["stripe", "airbnb", "amazon"] as const).map((company) => (
                      <button
                        key={company}
                        type="button"
                        onClick={() => setActiveTab(company)}
                        className={`flex-1 rounded-lg py-1.5 text-xs capitalize transition-colors ${
                          activeTab === company
                            ? "bg-cream text-surface-base font-semibold"
                            : "text-cream-dim hover:text-cream-bright"
                        }`}
                      >
                        {company}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-line bg-surface-deep/60 p-4">
                    <p className="text-xs font-medium text-accent">
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
            </SpotlightBorder>
          </FadeRise>

          {/* CARD 4: Performance Telemetry Analytics */}
          <FadeRise delay={0.2}>
            <SpotlightBorder borderRadius="1.5rem" className="h-full">
              <Panel className="flex h-full min-h-[20rem] flex-col justify-between p-6 sm:p-7">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-grow" />
                    <h3 className="text-sm font-bold text-cream-bright sm:text-base">
                      {t("land.card3Title")}
                    </h3>
                  </div>
                  <span className="text-xs text-cream-faint">04</span>
                </div>

                <div className="my-auto flex flex-col gap-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-cream-dim">STAR Answer Structure</span>
                      <span className="font-mono text-grow">92%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-deep">
                      <div className="h-full w-[92%] rounded-full bg-grow transition-all" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-cream-dim">Pace & Speaking Cadence</span>
                      <span className="font-mono text-accent">138 wpm</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-deep">
                      <div className="h-full w-[85%] rounded-full bg-accent transition-all" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-cream-dim">Filler Words Rate</span>
                      <span className="font-mono text-cream-bright">1.2%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-deep">
                      <div className="h-full w-[20%] rounded-full bg-cream transition-all" />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-cream-faint">
                  {t("land.card3b")}
                </p>
              </Panel>
            </SpotlightBorder>
          </FadeRise>

          {/* CARD 5: Contextual Role Setup */}
          <FadeRise delay={0.25}>
            <SpotlightBorder borderRadius="1.5rem" className="h-full">
              <Panel className="flex h-full min-h-[20rem] flex-col justify-between p-6 sm:p-7">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <h3 className="text-sm font-bold text-cream-bright sm:text-base">
                      {t("land.card2Title")}
                    </h3>
                  </div>
                  <span className="text-xs text-cream-faint">05</span>
                </div>

                <div className="my-auto flex flex-col gap-3">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-faint" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Role or target company..."
                      className="w-full rounded-xl border border-line-strong bg-surface-deep py-2.5 pl-10 pr-3 text-xs text-cream-bright placeholder:text-cream-faint focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {["Distributed Systems", "Frontend Lead", "Product Manager", "ML Engineer"].map(
                      (role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setSearchQuery(role)}
                          className="rounded-full border border-line bg-surface-deep/80 px-2.5 py-1 text-xs text-cream-dim transition-colors hover:border-accent/40 hover:text-cream-bright"
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
            </SpotlightBorder>
          </FadeRise>
        </div>
      </div>
    </Section>
  );
}
