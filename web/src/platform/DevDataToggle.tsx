import { dataMode, setDataMode, type DataMode } from "@/lib/worst-case";

/**
 * Demo data / Worst case, flipped while looking at the screen.
 *
 * Dev chrome, not product: plain grey track, system font, no motion, pinned
 * bottom-centre above everything. Rendered only in a dev build — App.tsx
 * mounts it behind `import.meta.env.DEV`, so it is not in the bundle a
 * visitor downloads.
 */
const OPTIONS: { mode: DataMode; label: string }[] = [
  { mode: "demo", label: "Demo data" },
  { mode: "worst", label: "Worst case" },
  { mode: "empty", label: "Empty" },
  { mode: "one", label: "One" },
  { mode: "many", label: "1,000" },
];

export function DevDataToggle() {
  const current = dataMode();
  return (
    <div
      role="group"
      aria-label="Dev data"
      style={{ fontFamily: "system-ui, sans-serif" }}
      className="fixed left-1/2 top-2 z-[100] flex -translate-x-1/2 gap-0.5 rounded-full bg-neutral-200 p-0.5 text-xs shadow-lg md:bottom-4 md:top-auto"
    >
      {OPTIONS.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          aria-pressed={current === mode}
          onClick={() => setDataMode(mode)}
          className={`rounded-full px-3 py-1 ${
            current === mode ? "bg-white text-neutral-900 shadow" : "text-neutral-600"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
