/**
 * The dashboard instruments: the pieces the trail-dashboard look is made of,
 * shared by the public page and the signed-in product so both draw the same
 * gauge, the same chart and the same map.
 *
 * Every one is plain SVG with no library: they are small, they have to look
 * the same on a phone and a laptop, and each has one entrance — an arc or a
 * line drawing itself on — that respects reduced motion.
 */
import { useEffect, useId, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";

/* ------------------------------------------------------------------------- */
/* Labels and tiles                                                           */
/* ------------------------------------------------------------------------- */

/** "::LABEL" — mono, uppercase, a tight double colon in front. */
export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-xs font-medium uppercase tracking-[0.06em] text-cream-dim ${className}`}>
      <span aria-hidden className="tracking-[-0.1em]">::</span>
      {children}
    </p>
  );
}

/**
 * A cream widget: the card everything on a dashboard sits in. No shadow, a
 * hairline at most, a mono label on top and an optional action at its right.
 */
export function Widget({
  label,
  action,
  children,
  className = "",
  as: Tag = "section",
}: {
  label?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag className={`flex min-w-0 flex-col gap-3 rounded-[1.375rem] bg-surface-card p-4 ring-1 ring-[color:var(--line)] sm:p-5 ${className}`}>
      {(label || action) && (
        <div className="flex min-h-[1.5rem] items-center justify-between gap-3">
          {label ? <Label>{label}</Label> : <span />}
          {action}
        </div>
      )}
      {children}
    </Tag>
  );
}

/** The darker panel inside a widget. */
export function Well({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-surface-lift p-3 sm:p-4 ${className}`}>{children}</div>;
}

/** One figure: an amber-tint icon square, a big value, a mono caption. */
export function StatTile({
  icon,
  value,
  caption,
  className = "",
}: {
  icon: ReactNode;
  value: ReactNode;
  caption: ReactNode;
  className?: string;
}) {
  return (
    <Well className={`flex items-center gap-4 ${className}`}>
      <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[1.75rem] font-light leading-none tracking-[-0.04em] tabular-nums text-cream-bright">{value}</span>
        <span className="mt-1.5 block font-mono text-xs font-medium uppercase tracking-[0.06em] text-cream-dim">{caption}</span>
      </span>
    </Well>
  );
}

/** A peach chip: a fact, never a control. */
export function Chip({ children, icon, className = "" }: { children: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-[0.5625rem] bg-[#F8E8CD] px-2.5 py-1.5 font-mono text-xs font-medium uppercase tracking-[0.06em] text-[#2E2D2A] ${className}`}
    >
      {icon && (
        <span aria-hidden className="grid h-4 w-4 place-items-center rounded-full bg-[#F59E0B] text-white [&>svg]:h-2.5 [&>svg]:w-2.5">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

/**
 * A row of tabs in a well, the active one in light amber. Real tabs: arrow
 * keys move between them and the panel they control is named.
 */
export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  label,
  className = "",
}: {
  tabs: { value: T; label: string; icon?: ReactNode }[];
  value: T;
  onChange: (next: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={`flex gap-1 overflow-x-auto rounded-2xl bg-surface-lift p-1 [scrollbar-width:none] ${className}`}>
      {tabs.map((tab, index) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
              const step = event.key === "ArrowRight" ? 1 : -1;
              const next = tabs[(index + step + tabs.length) % tabs.length]!;
              onChange(next.value);
              (event.currentTarget.parentElement?.children[(index + step + tabs.length) % tabs.length] as HTMLElement | undefined)?.focus();
            }}
            className={`focus-ring inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 font-mono text-xs font-medium uppercase tracking-[0.06em] transition-colors duration-150 [&>svg]:h-3.5 [&>svg]:w-3.5 ${
              active ? "bg-[#FBD06A] text-[#2E2D2A]" : "text-cream-dim hover:text-cream-bright"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Gauge                                                                      */
/* ------------------------------------------------------------------------- */

/** True once mounted, so an SVG stroke can transition from empty to its value. */
function useDrawn(): boolean {
  const reduced = useReducedMotion();
  const [drawn, setDrawn] = useState(Boolean(reduced));
  useEffect(() => {
    if (reduced) return;
    const frame = requestAnimationFrame(() => setDrawn(true));
    return () => cancelAnimationFrame(frame);
  }, [reduced]);
  return drawn;
}

/**
 * A thick semicircle from sand to amber, white knobs at both ends, a thin
 * white arc inside it for the value, and the figure in the middle.
 */
export function Gauge({
  value,
  max = 100,
  center,
  caption,
  left,
  right,
  pill,
  className = "",
}: {
  /** 0..max. */
  value: number;
  max?: number;
  /** The big figure in the middle. */
  center: ReactNode;
  /** One word under it. */
  caption?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  /** A small pill above the arc. */
  pill?: ReactNode;
  className?: string;
}) {
  const id = useId().replace(/:/g, "");
  const drawn = useDrawn();
  const share = Math.max(0, Math.min(1, value / max));
  // The arc: a half circle of radius 100 centred at (120, 120).
  const arc = "M 20 120 A 100 100 0 0 1 220 120";
  const length = Math.PI * 100;
  return (
    <div className={`relative flex flex-col items-center rounded-2xl bg-surface-lift px-4 pb-4 pt-3 ${className}`}>
      {pill && (
        <span className="rounded-full bg-surface-card px-3 py-1 font-mono text-xs font-medium uppercase tracking-[0.06em] text-cream-dim">
          {pill}
        </span>
      )}
      <div className="relative mt-2 w-full max-w-[17rem] [container-type:inline-size]">
        <svg viewBox="0 0 240 132" className="w-full" aria-hidden>
          <defs>
            <linearGradient id={`g${id}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#E7E1D3" />
              <stop offset="0.55" stopColor="#F8C44C" />
              <stop offset="1" stopColor="#F6B12A" />
            </linearGradient>
          </defs>
          <path d={arc} fill="none" stroke={`url(#g${id})`} strokeWidth="26" strokeLinecap="round" />
          <path
            d={arc}
            fill="none"
            stroke="#fff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={length}
            strokeDashoffset={drawn ? length * (1 - share) : length}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.23, 1, 0.32, 1)" }}
          />
          <circle cx="20" cy="120" r="7" fill="#fff" />
          <circle cx="220" cy="120" r="7" fill="#fff" />
        </svg>
        {/* The figure sits inside the bowl of the arc, scaled with it. */}
        <span className="absolute inset-x-0 bottom-0 text-center text-[clamp(2.5rem,22cqw,3.75rem)] font-light leading-none tracking-[-0.05em] tabular-nums text-cream-bright">
          {center}
        </span>
      </div>
      <div className="mt-2 grid w-full max-w-[17rem] grid-cols-3 items-baseline font-mono text-xs font-medium uppercase tracking-[0.06em] text-cream-dim">
        <span className="text-left">{left}</span>
        <span className="text-center text-cream-bright">{caption}</span>
        <span className="text-right">{right}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Line chart                                                                 */
/* ------------------------------------------------------------------------- */

/**
 * A line over a baseline: the part already walked as a thick dark line, what
 * is ahead as a grey dotted one, amber dots on its waypoints. Used for grades
 * over rehearsals, with the pass mark as a dashed rule.
 */
export function TrailChart({
  values,
  ahead = [],
  min,
  max,
  mark,
  labels,
  className = "",
  ariaLabel,
}: {
  values: number[];
  /** Where it is expected to go next, drawn dotted after the last value. */
  ahead?: number[];
  min: number;
  max: number;
  /** A horizontal reference, such as the pass mark. */
  mark?: { value: number; label: string };
  /** Mono labels under the baseline: start, middle, end. */
  labels?: [string, string, string];
  className?: string;
  ariaLabel: string;
}) {
  const drawn = useDrawn();
  const W = 320;
  const H = 120;
  const pad = 8;
  const all = [...values, ...ahead];
  const n = Math.max(2, all.length);
  const x = (i: number) => pad + (i * (W - pad * 2)) / (n - 1);
  const y = (v: number) => H - pad - ((Math.max(min, Math.min(max, v)) - min) / (max - min || 1)) * (H - pad * 2);
  const walked = values.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const last = values.length - 1;
  const aheadPath =
    ahead.length > 0 && last >= 0
      ? [`M ${x(last).toFixed(1)} ${y(values[last]!).toFixed(1)}`, ...ahead.map((v, i) => `L ${x(last + 1 + i).toFixed(1)} ${y(v).toFixed(1)}`)].join(" ")
      : "";
  return (
    <figure className={className} aria-label={ariaLabel} role="img">
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" aria-hidden>
        <line x1={pad} x2={W - pad} y1={H - pad} y2={H - pad} stroke="currentColor" className="text-cream-faint" strokeOpacity="0.4" />
        {mark && (
          <>
            <line x1={pad} x2={W - pad} y1={y(mark.value)} y2={y(mark.value)} stroke="#F6B733" strokeDasharray="3 4" />
            <text x={pad} y={y(mark.value) - 4} className="fill-cream-dim font-mono" fontSize="9">
              {mark.label}
            </text>
          </>
        )}
        {aheadPath && <path d={aheadPath} fill="none" stroke="#A8A49B" strokeWidth="2" strokeDasharray="1 5" strokeLinecap="round" />}
        {values.length > 1 && (
          <path
            d={walked}
            fill="none"
            stroke="currentColor"
            className="text-cream-bright"
            strokeWidth="3.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={drawn ? 0 : 1}
            style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.23, 1, 0.32, 1)" }}
          />
        )}
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={i === last ? 5 : 3.5} fill={i === last ? "#F6B733" : "currentColor"} className="text-cream-bright" stroke="#fff" strokeWidth={i === last ? 2 : 0} />
        ))}
        {ahead.map((v, i) => (
          <circle key={`a${i}`} cx={x(last + 1 + i)} cy={y(v)} r="3" fill="#F6B733" />
        ))}
        {labels && (
          <g className="fill-cream-dim font-mono" fontSize="9">
            <text x={pad} y={H + 12}>{labels[0]}</text>
            <text x={W / 2} y={H + 12} textAnchor="middle">{labels[1]}</text>
            <text x={W - pad} y={H + 12} textAnchor="end">{labels[2]}</text>
          </g>
        )}
      </svg>
    </figure>
  );
}

/* ------------------------------------------------------------------------- */
/* Topographic map                                                            */
/* ------------------------------------------------------------------------- */

export interface MapPin {
  /** 0..1 across the map. */
  x: number;
  /** 0..1 down the map. */
  y: number;
  tone: "violet" | "orange" | "ink";
  label?: string;
}

/**
 * Thin wavy contours, a dark route climbing to a peak, and pins on it.
 * The route is drawn through the pins in order, so the map reads as a path
 * from the first to the last — a thesis read page by page, its weak points
 * on the way.
 */
export function TopoMap({
  pins,
  onPin,
  className = "",
  ariaLabel,
}: {
  pins: MapPin[];
  onPin?: (index: number) => void;
  className?: string;
  ariaLabel: string;
}) {
  const drawn = useDrawn();
  const W = 340;
  const H = 150;
  const contours = Array.from({ length: 16 }, (_, i) => {
    const base = 8 + i * 9;
    const amp = 6 + (i % 4) * 2;
    const phase = i * 0.7;
    const pts = Array.from({ length: 18 }, (_, k) => {
      const px = (k / 17) * W;
      const py = base + Math.sin(k * 0.6 + phase) * amp + Math.cos(k * 0.27 + i) * 3;
      return `${k === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`;
    });
    return pts.join(" ");
  });
  const pts = pins.map((pin) => ({ x: 14 + pin.x * (W - 28), y: 14 + pin.y * (H - 28) }));
  const route = pts
    .map((p, i) => {
      if (i === 0) return `M ${p.x} ${p.y}`;
      const prev = pts[i - 1]!;
      const mx = (prev.x + p.x) / 2;
      return `C ${mx} ${prev.y} ${mx} ${p.y} ${p.x} ${p.y}`;
    })
    .join(" ");
  const fill = { violet: "#7C6CF2", orange: "#F59E0B", ink: "#2E2D2A" } as const;
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-surface-lift ${className}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={ariaLabel}>
        {contours.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="#c9c5bc" strokeWidth="0.8" opacity="0.75" />
        ))}
        {pts.length > 1 && (
          <path
            d={route}
            fill="none"
            stroke="#2E2D2A"
            strokeWidth="2.4"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={drawn ? 0 : 1}
            style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.23, 1, 0.32, 1)" }}
          />
        )}
        {pts.map((p, i) => (
          <g key={i} transform={`translate(${p.x} ${p.y})`}>
            <path d="M0 0 C -8 -9 -8 -20 0 -20 C 8 -20 8 -9 0 0 Z" fill={fill[pins[i]!.tone]} />
            <circle cx="0" cy="-13" r="3.4" fill="#fff" />
          </g>
        ))}
      </svg>
      {onPin && (
        <div className="absolute inset-0">
          {pins.map((pin, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onPin(i)}
              aria-label={pin.label ?? String(i + 1)}
              className="focus-ring absolute h-8 w-8 -translate-x-1/2 -translate-y-full rounded-full"
              style={{ left: `${((14 + pin.x * (W - 28)) / W) * 100}%`, top: `${((14 + pin.y * (H - 28)) / H) * 100}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
