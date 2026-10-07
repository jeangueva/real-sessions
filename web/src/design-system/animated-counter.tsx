import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

/**
 * Animated number counter with smooth easing curve.
 */
export function AnimatedCounter({
  value,
  duration = 1.2,
  className = "",
  prefix = "",
  suffix = "",
  decimals = 0,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-20px" });
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let startTime: number | null = null;
    let animationFrameId: number;

    const easeOutExpo = (x: number): number => {
      return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    };

    const animate = (currentTime: number) => {
      if (startTime === null) startTime = currentTime;
      const elapsed = (currentTime - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);

      const currentVal = easedProgress * value;
      setDisplayValue(currentVal);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isInView, value, duration]);

  const formatted =
    decimals > 0
      ? displayValue.toFixed(decimals)
      : Math.round(displayValue).toLocaleString();

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
