import { defineContract } from "../../contract";

export const MascotContract = defineContract({
  name: "Mascot",
  level: "atom",
  status: "beta",
  summary: "Mocki, the parrot of the interview product, in one of six illustrated growth stages — from egg to crowned.",
  source: "src/components/Mascot/Mascot.tsx",
  composes: [],
  dependencies: [],
  props: {
    level: {
      type: "1 | 2 | 3 | 4 | 5 | 6",
      required: true,
      description: "The growth stage to draw. It is the stage, not the XP level: the product maps XP to a stage (lib/avatar.ts tierForLevel) before it reaches this component. Untyped input outside 1–6 is rounded and clamped to the nearest stage; anything that is not a finite number becomes 1.",
      values: {
        "1": "Egg. A brand-new account.",
        "2": "Hatchling, cracking out of the shell.",
        "3": "Young parrot. The everyday face: sign-in, errors.",
        "4": "Headset on: practising interviews in earnest.",
        "5": "On a stage with a microphone and a speech bubble.",
        "6": "Crowned, with a medal. The end of a long curve most accounts do not finish.",
      },
    },
    size: {
      type: "number",
      required: false,
      default: "64",
      description: "Width and height in px, as the <img> attributes. The masters are 200px, so up to 100px stays sharp on a 2x screen.",
    },
    alt: {
      type: "string",
      required: false,
      default: '"Mocki, nivel {level}"',
      description: "The text alternative when the image is not decorative. The default is Spanish, with the stage number in it; pass the whole translated sentence for any other locale. An explicit empty string is respected.",
    },
    decorative: {
      type: "boolean",
      required: false,
      default: "false",
      description: "Renders alt=\"\" so assistive technology skips the image; it wins over alt. For a Mocki beside a heading or a message that already carries the meaning.",
    },
    className: {
      type: "string",
      required: false,
      default: '""',
      description: "Extra classes on the <img>, appended: shrink-0 in a flex row, a negative margin to tuck it over a name. Not for recolouring.",
    },
  },
  slots: [],
  states: [
    { name: "default", description: "The stage's illustration with a soft drop shadow, and a text alternative (\"Mocki, nivel 3\" or the alt passed in).", trigger: "Initial render." },
    { name: "decorative", description: "Looks identical. alt=\"\", so screen readers skip it.", trigger: "decorative={true}" },
  ],
  events: [],
  motion: [
    "None of its own. An entrance belongs to the caller (PopIn on sign-in, a spring on level-up), and that caller handles reduced motion.",
  ],
  accessibility: {
    role: "img (native <img>); presentation when decorative",
    keyboard: [],
    aria: [
      { attribute: "alt", managedBy: "component", note: "Set from alt, or \"Mocki, nivel {level}\" by default, or \"\" when decorative." },
      { attribute: "alt (translation)", managedBy: "consumer", note: "The default alt is Spanish. Any other locale must pass its own alt." },
    ],
    reducedMotion: "Nothing to reduce: the component does not move. Wrappers that animate it (PopIn, the level-up spring) check prefers-reduced-motion themselves.",
    contrast: "An illustration, not text or a control, so WCAG 1.4.3 and 1.4.11 do not apply. The transparent PNG sits on any surface; the saturated indigo body reads on both themes' cards, and the drop shadow (black at 12%) only grounds it.",
    focus: "Never focusable.",
    targetSize: "not interactive",
    screenReader: "Announced as its alt (\"Mocki, nivel 3\", image) unless decorative. Sighted users see which form it is; the default alt gives the stage as a number, not the form's description.",
  },
  content: {
    voice: [
      "The alt names the character and the stage, nothing more: \"Mocki, nivel 3\". No adjectives, no celebration.",
      "Mocki is a name: not translated, never with an article in Spanish (\"Mocki crece contigo\", not \"el Mocki\").",
      "Copy around Mocki follows the product voice: no exclamation marks, even at a level-up.",
      "Beside an XP level (\"Nivel 7\"), pass the form wording as alt (\"Mocki, forma 4 de 6\") so the stage and the level are not two different numbers both called nivel.",
    ],
    limits: ["alt: under 60 characters, one phrase, no full stop."],
    examples: ["Mocki, nivel 3", "Mocki, forma 3 de 6", "Y Mocki crece contigo."],
  },
  usage: {
    when: [
      "The interview product's gamified layer: progress, a level-up, the habit section of the landing.",
      "A first-run moment in the interview space, where a face lowers the stakes (the welcome checklist).",
      "Showing which form a level earns, where the change itself is the reward.",
    ],
    whenNot: [
      { situation: "Any screen of Sustentación, the thesis space: its landing, upload, diagnosis, rehearsal, acta and plan", instead: "No character. The thesis space speaks as a calm person beside the student, not a mascot; use Mark or Wordmark for the brand, and plain copy in a Panel or a Notice for empty and error states." },
      { situation: "The brand logo, in a header, a favicon or a footer", instead: "Mark (the reduced isologo) or Wordmark (the lockup with the name)." },
      { situation: "A number the user needs to read: XP, a score, a level", instead: "The number as text, or Counter; Mocki shows the stage, not the value." },
      { situation: "Waiting while something loads or the jury deliberates", instead: "DotMatrix with a sentence that says what is happening." },
    ],
    do: [
      "Pass decorative when a heading or a message beside it already says what is happening.",
      "Pass a translated alt for every locale other than Spanish.",
      "Keep it at 100px or less where it must look sharp; it is a 200px master.",
    ],
    dont: [
      "Don't use Mocki in Sustentación, or as the logo.",
      "Don't recolour, crop or flip it; it carries its own colour.",
      "Don't pair it with exclamation marks or anglicisms (\"¡Mocki evolucionó! Mira su nuevo look.\" is the product string to fix, not to copy).",
    ],
  },
  tokens: [],
  related: [
    { name: "Mark", difference: "The reduced, fixed logo; Mascot is the full character and changes with progress." },
    { name: "InterviewerPresence", difference: "The interviewer during a call; Mascot is the candidate's own character outside it." },
    { name: "PopIn", difference: "The entrance to wrap Mocki in when it appears as a reward; Mascot itself does not move." },
  ],
  i18n: {
    rtl: "Does not mirror. The six illustrations are drawn once and are never flipped in Arabic or Hebrew: a character is not a direction, and a flipped Mocki is a different drawing.",
    textExpansion: "No visible text. The alt can be any length in any language without changing the layout.",
    formatting: "The only number is the stage, an integer from 1 to 6 written as a plain digit in the default Spanish alt; there is nothing to group or localise, so no Intl. A translated alt is passed whole, numbers included.",
    strings: [{ text: "Mocki, nivel {level}", prop: "alt" }],
  },
  responsive: {
    behaviour: [
      "A fixed square at size px at every width. In a flex row give it shrink-0 so long copy beside it does not squeeze it.",
      "At phone widths keep it at 56px or less beside text; above a heading it can stay at its full size.",
    ],
    minWidth: "40px",
  },
  designTool: {
    registryItem: "mascot",
    importStatement: 'import { Mascot } from "@mockio/design-system";',
    canvasProps: ["level", "size", "decorative", "alt"],
    placement: "On a card or the page ground in the interview space: beside a checklist title, above a level-up heading, at the start of an empty state. Never in the thesis space, never in a header.",
  },
  appCounterpart: {
    file: "design-system/avatar.tsx",
    exportName: "Avatar",
    differences: [
      "Renamed Mascot, and takes the stage (1–6) instead of the XP level: the level-to-stage curve stays in the product's lib/avatar.ts, so the system knows nothing about XP.",
      "The six PNGs ship inside the component (imported as modules) instead of loading from the app's /avatars/ folder.",
      "The alt is a prop with a Spanish default, \"Mocki, nivel {level}\"; the app's is a hard-coded English \"Level {level} avatar, form {n} of 6\".",
      "Adds decorative, so the ten raw <img> copies of the PNGs in the product (most of them alt=\"\", beside Avatar rather than through it) can use the component.",
      "Drops the axis prop, which the app's copy accepted and ignored.",
    ],
  },
  version: "0.1.0",
  changelog: [{ version: "0.1.0", changes: ["First version: Mocki's six stages as a self-contained component, with a localisable alt and a decorative mode."] }],
});
