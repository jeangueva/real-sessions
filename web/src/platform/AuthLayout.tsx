import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Panel } from "@/design-system";

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
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-surface-deep px-6 py-10">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="focus-ring inline-flex items-center gap-2 rounded text-xs text-cream-dim transition-colors hover:text-cream-bright"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to Real Sessions
        </Link>
      </div>
      <Panel variant="raised" className="w-full max-w-md p-8">
        {children}
      </Panel>
    </main>
  );
}
