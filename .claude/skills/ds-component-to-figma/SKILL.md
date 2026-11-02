---
name: ds-component-to-figma
description: Draw a design-system component in the Mockio Figma library from its code contract — variants from its unions and states, properties from its canvasProps, slots for free content, everything bound to variables — and register it so the tests and the audit track it. Use when a component folder exists in design-system/src/components but figma-map.js lists it as `figma: null`, or after a contract gains or loses a prop.
---

# Bring a component from code to Figma

Library: https://www.figma.com/design/jmdQwNqGso3sQoUpcME5g8 — page `04 · Componentes`

## Questions before drawing

- Is it drawable? Animation, layout rhythm and page containers stay
  `figma: null` with a reason (see `COMPONENTS` in `figma-map.js`).
- Which props are a **variant** (a union that changes style or state), which a
  **property** (text, boolean, instance swap), which a **slot** (free content,
  a `ReactNode` that holds layout)? Variants are for style and state only;
  a structurally different layout is a separate component. Keep sets ≤ 30.

## Steps

1. Load the Figma MCP's `figma-use` and `figma-generate-library` skills.
2. Read the component's five files: `.tsx` (classes are the spec), contract
   (`props`, `states`, `designTool.canvasProps`, `usage`), previews (real
   copy), `.md`.
3. Draw it with `use_figma`:
   - auto layout everywhere; text that wraps is `FILL` + height auto;
     reproduce `line-clamp-*` with max lines + ellipsis;
   - every fill, stroke, radius, gap and padding bound to a variable; every
     text on a text style; icons are `icon/*` instances recoloured with an
     `icon/*` variable;
   - properties named as in the contract, in sentence case (`With arrow`);
   - free content → `createSlot()` once per variant, then point every
     variant's slot at the first one's property (`componentPropertyReferences
     = { slotContentId }`) and delete the extras, so the set has one slot.
4. Register it: in `src/tokens/figma-map.js` → `COMPONENTS`, set `figma` to the
   node id, `properties`, `aliases`, and `preferred` / `slot` where they apply.
5. `npm run figma:docs && npm run registry && npm run check`.
6. Run `ds-figma-sync` (push writes the description, doc link and preferred
   instances), then `ds-library-audit` until it is empty.
7. Add the component to the `Resize check` frame with long copy, and, if it
   composes into screens, to an `_example` on the Examples page.

## Output

The node id, the properties and why each is a variant, property or slot,
the audit result, and a screenshot of the component set and the resize check.
