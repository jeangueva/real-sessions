import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

/**
 * What a screen shows when it fails, instead of nothing.
 *
 * Without a boundary, an error while drawing one screen — or a screen's code
 * that could not be downloaded — left the content area blank under a
 * sidebar that still worked, with no hint of what to do. Now it says so and
 * offers the one thing that fixes nearly every case: loading the page again.
 *
 * Reset by `resetKey` (the path), so moving to another section clears it.
 * The copy arrives as props because a class component cannot use the
 * translation hook.
 */
export class ScreenBoundary extends Component<
  { resetKey: string; title: string; body: string; action: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[mockio] screen failed:", error, info.componentStack);
  }

  componentDidUpdate(previous: { resetKey: string }) {
    if (previous.resetKey !== this.props.resetKey && this.state.failed) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
        <img src="/avatars/level-3.png" alt="" width={96} height={96} className="h-24 w-24" />
        <p className="text-title font-semibold text-cream-bright">{this.props.title}</p>
        <p className="text-sm text-cream-dim">{this.props.body}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="focus-ring rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-ink transition-transform duration-150 active:scale-[0.97]"
        >
          {this.props.action}
        </button>
      </div>
    );
  }
}
