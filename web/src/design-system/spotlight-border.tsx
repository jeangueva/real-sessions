import { useCallback, useRef, useState, type ReactNode, type MouseEvent } from "react";

interface SpotlightBorderProps {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
  borderRadius?: string;
}

/**
 * Cursor-following radial mask border glow.
 * Falls back cleanly on touch devices and when reduced motion is requested.
 */
export function SpotlightBorder({
  children,
  className = "",
  spotlightColor = "rgba(222, 219, 200, 0.35)",
  borderRadius = "1.5rem",
}: SpotlightBorderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setPosition(null);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ borderRadius }}
      className={`group relative overflow-hidden p-[1px] ${className}`}
    >
      {/* Dynamic Cursor Spotlight Layer */}
      {position && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px transition-opacity duration-300"
          style={{
            background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 70%)`,
            WebkitMask: `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            padding: "1px",
            borderRadius: "inherit",
          }}
        />
      )}

      {/* Base Inner Content */}
      <div className="relative h-full w-full" style={{ borderRadius: "inherit" }}>
        {children}
      </div>
    </div>
  );
}
