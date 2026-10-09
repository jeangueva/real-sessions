import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Panel, PopIn, Wordmark } from "@/design-system";
import { useT } from "@/hooks/useLocale";

/**
 * Shell for the three screens that sit outside both the landing page and the
 * app: sign in, password reset, email confirmation.
 *
 * They are reachable directly from an emailed link, so each one is somebody's
 * entry point to the product and each one needs its own way back out. Before
 * this, all three were dead ends — the only exit was the browser's back button,
 * which does nothing for a person who arrived from their inbox.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-surface-deep px-6 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="focus-ring inline-flex items-center gap-1.5 rounded-full text-sm text-accent-text transition-opacity hover:opacity-80"
        >
          <ArrowLeft className="h-3.5 w-3.5 rtl:-scale-x-100" aria-hidden />
          {t("auth.backHome")}
        </Link>
      </div>
      {/* The name above the card, the way Apple ID and Airbnb open their own
          sign-in: you know whose door this is before you read the form. */}
      {/* Mocki, peeking over the name: the first face of the product is
          its character, so even a password reset feels like Mockio. */}
      <PopIn delay={0.1}>
        <img src="/avatars/level-3.png" alt="" width={72} height={72} className="-mb-3 h-[72px] w-[72px] drop-shadow-[0_6px_10px_rgb(0_0_0/0.12)]" />
      </PopIn>
      <Wordmark className="text-2xl font-semibold text-cream-bright" />
      <Panel variant="raised" className="w-full max-w-md p-8 shadow-float sm:p-10">
        {children}
      </Panel>
    </main>
  );
}
