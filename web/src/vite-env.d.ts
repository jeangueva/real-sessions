/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Hero background footage. Optional — with no value the hero renders the CSS
   * light field instead, which is a supported state rather than a degraded one.
   */
  readonly VITE_HERO_VIDEO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
