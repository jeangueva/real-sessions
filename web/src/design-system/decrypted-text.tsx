import { useEffect, useState, useRef, useMemo } from "react";
import { useInView } from "framer-motion";

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  sequential?: boolean;
  revealDirection?: "start" | "end" | "center";
  useOriginalCharsOnly?: boolean;
  characters?: string;
  className?: string;
  encryptedClassName?: string;
  animateOn?: "view" | "hover";
}

const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+";

/**
 * Text decryption/scramble animation inspired by ReactBits.
 */
export function DecryptedText({
  text,
  speed = 40,
  maxIterations = 10,
  sequential = true,
  revealDirection = "start",
  useOriginalCharsOnly = false,
  characters = CHARACTERS,
  className = "",
  encryptedClassName = "opacity-70 font-mono text-accent",
  animateOn = "view",
}: DecryptedTextProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const [isScrambling, setIsScrambling] = useState(false);
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const [hasAnimated, setHasAnimated] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-10px" });

  const availableChars = useMemo(() => {
    return useOriginalCharsOnly
      ? Array.from(new Set(text.split(""))).filter((char) => char !== " ")
      : characters.split("");
  }, [useOriginalCharsOnly, text, characters]);

  const shuffleText = (originalText: string, currentRevealed: Set<number>) => {
    return originalText
      .split("")
      .map((char, i) => {
        if (char === " ") return " ";
        if (currentRevealed.has(i)) return originalText[i];
        const randomIndex = Math.floor(Math.random() * availableChars.length);
        return availableChars[randomIndex] ?? char;
      })
      .join("");
  };

  const getNextIndex = (revealedSet: Set<number>, length: number): number | null => {
    const unrevealed: number[] = [];
    for (let i = 0; i < length; i++) {
      if (!revealedSet.has(i) && text[i] !== " ") unrevealed.push(i);
    }
    if (unrevealed.length === 0) return null;

    if (revealDirection === "start") return unrevealed[0] ?? null;
    if (revealDirection === "end") return unrevealed[unrevealed.length - 1] ?? null;
    if (revealDirection === "center") {
      const center = length / 2;
      return unrevealed.reduce((prev, curr) =>
        Math.abs(curr - center) < Math.abs(prev - center) ? curr : prev
      );
    }
    const randomIndex = Math.floor(Math.random() * unrevealed.length);
    return unrevealed[randomIndex] ?? null;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let currentIteration = 0;

    const shouldAnimate =
      (animateOn === "view" && isInView && !hasAnimated) ||
      (animateOn === "hover" && isHovering);

    if (shouldAnimate) {
      setIsScrambling(true);
      interval = setInterval(() => {
        setRevealedIndices((prevRevealed) => {
          if (sequential) {
            if (prevRevealed.size < text.length) {
              const nextIndex = getNextIndex(prevRevealed, text.length);
              const newRevealed = new Set(prevRevealed);
              if (nextIndex !== null && nextIndex !== undefined) newRevealed.add(nextIndex);
              setDisplayText(shuffleText(text, newRevealed));
              return newRevealed;
            } else {
              clearInterval(interval);
              setIsScrambling(false);
              setDisplayText(text);
              if (animateOn === "view") setHasAnimated(true);
              return prevRevealed;
            }
          } else {
            setDisplayText(shuffleText(text, prevRevealed));
            currentIteration++;
            if (currentIteration >= maxIterations) {
              clearInterval(interval);
              setIsScrambling(false);
              setDisplayText(text);
              if (animateOn === "view") setHasAnimated(true);
            }
            return prevRevealed;
          }
        });
      }, speed);
    } else if (!isHovering && animateOn === "hover") {
      setDisplayText(text);
      setRevealedIndices(new Set());
      setIsScrambling(false);
    }

    return () => clearInterval(interval);
  }, [
    isInView,
    isHovering,
    hasAnimated,
    animateOn,
    text,
    speed,
    maxIterations,
    sequential,
    revealDirection,
    characters,
    useOriginalCharsOnly,
  ]);

  return (
    <span
      ref={containerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      className={`inline-block ${className}`}
    >
      {displayText.split("").map((char, index) => {
        const isRevealed = revealedIndices.has(index) || !isScrambling;
        return (
          <span
            key={index}
            className={isRevealed ? "" : encryptedClassName}
          >
            {char}
          </span>
        );
      })}
    </span>
  );
}
