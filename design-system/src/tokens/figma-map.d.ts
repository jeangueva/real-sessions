/** Types for figma-map.js, which stays plain JavaScript so the token build can import it. */

export declare const FIGMA_FILE: { key: string; url: string };

export interface ColorPairing {
  figma: string;
  css: string;
  alpha?: string | number;
  tailwind: string;
  scopes: string[];
}
export declare const COLORS: ColorPairing[];

export declare const RADII: { figma: string; px?: number; preset?: string; tailwind: string }[];
export declare const SPACING: { figma: string; px: number; tailwind: string }[];

export interface TextStylePairing {
  figma: string;
  preset?: string;
  px?: number;
  lineHeight?: string;
  letterSpacing?: string;
  weight?: number;
  uppercase?: boolean;
  family: "sans" | "mono";
  tailwind: string;
}
export declare const TEXT_STYLES: TextStylePairing[];

export declare const COMPONENTS: Record<string, { figma: string; properties: string[] } | { figma: null; reason: string }>;

export declare const SHADOWS: { figma: string; css: string; tailwind: string }[];
