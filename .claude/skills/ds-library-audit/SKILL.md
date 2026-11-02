---
name: ds-library-audit
description: Audit the Mockio Figma library for agent-readiness and fix it until the audit comes back empty — layer names, resizing, component properties, slots and preferred instances, focused variants, descriptions with aliases, every colour/spacing/radius/text on a variable or style, examples and guidelines. Use after drawing or changing a component, before publishing the library, or when asked to "audit the design system".
---

# Audit the Figma library

The checklist is Figma's own advice for a library an agent can use well. The
audit script encodes it; this skill is the loop around it.

Library: https://www.figma.com/design/jmdQwNqGso3sQoUpcME5g8

## Steps

1. Load the Figma MCP's `figma-use` skill. Run `ds-figma-sync` first if tokens
   or contracts changed — the audit assumes the values are right.
2. `cd design-system && npm run -s figma:audit` prints a read-only script. Run
   it with `use_figma`. It returns `{ total, byRule, findings }`.
3. Fix each rule at its source:

   | Rule | Fix |
   | --- | --- |
   | `layer name` | Rename by role (`Label`, `Title block`, `Icon slot`), never `Frame 12` |
   | `unbound colour` / `unbound radius` / `unbound spacing` | Bind to the variable that already holds the value |
   | `off-scale spacing` | The code uses a value the scale lacks → add it to `SPACING` in `figma-map.js` and push; otherwise snap to the scale |
   | `text style` | Apply the style matching size + weight; if none exists, add it to `TEXT_STYLES` in `figma-map.js` and push |
   | `description` / `doc link` / `preferred` | Edit the contract or `figma-map.js`, `npm run figma:docs`, push — never type it in Figma |
   | `variants` | Over 30 → move the axis that is not style or state into a property or a separate component |
   | `resize` | Use auto layout, or constraints set to scale for drawings |
   | `examples` / `guidelines` | See `docs/guides/figma.md` |

   Brand art (Mark, Mascot, Wordmark) is exempt from the value rules on
   purpose; do not "fix" its fixed colours.
4. **Resize check.** On the Componentes page, the `Resize check` frame holds
   instances with long and translated copy at several widths. Screenshot it
   and look for text that overflows, clips or fails to wrap; compare with the
   code (`line-clamp-*`, `min-w-0`, `flex-wrap`) and match the code.
5. Run the audit again. Repeat until `total` is `0`.

## Output

The before and after `byRule`, each fix with its reason, anything you chose
not to fix and why, and the final audit result.

## Rules

- A finding that reveals the code and Figma disagree is fixed in the code
  first (see `ds-figma-sync`), never by bending Figma to look right.
- Do not loosen the audit to make it pass. If a rule is wrong, change
  `scripts/figma-script.mjs` in the same PR and say why.
