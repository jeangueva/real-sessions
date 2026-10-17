---
title: The registry
group: Guides
order: 3
summary: How registry.json describes the system in the shadcn registry format, what each item installs, and what the contract under meta gives a tool or an assistant.
---

# The registry

`registry.json` describes every part of the system in the
[shadcn registry format](https://ui.shadcn.com/schema/registry.json), so
anything that can install a shadcn component (the shadcn CLI, a design tool
built on it, an AI assistant) can install Mockio's, file by file.

It is generated. Never edit it by hand:

```sh
npm run registry                          # write it
npx tsx scripts/build-registry.ts --check # fail if it is out of date (part of npm run check)
```

The output is deterministic: items, files and dependencies are sorted, so the
same tree always gives the same file, and `--check` is a plain comparison.

## Items

| Item | Type | Installs |
| --- | --- | --- |
| `mockio-theme` | `registry:theme` | `tokens.css`, `theme.css` (Tailwind v4), the v3 preset, `tokens.json` and `styles.css`; also the palette as shadcn `cssVars` (`theme`, `light`, `dark`) and the keyframes as `css` |
| `mockio-contract` | `registry:lib` | `contract.ts` and `preview.ts`, which every contract and preview file imports |
| `mockio-guidelines` | `registry:file` | Every Markdown file in `docs/foundations/` and `docs/guides/` that exists when the registry is generated |
| one per component (`action`, `panel`, `check-item`…) | `registry:ui` | Every file in the component's folder: the code, contract, previews, guidance, `index.ts`, helpers and assets |

Component items are named in kebab-case after the folder (`CheckItem` →
`check-item`), the same name as the contract's `designTool.registryItem`.

### File types

| File | Registry type |
| --- | --- |
| `<Name>.tsx`, the component | `registry:ui` |
| A stylesheet | `registry:style` |
| `contract.ts`, `preview.ts`, the preset | `registry:lib` |
| Everything else: contract, previews, guidance, `index.ts`, helpers, images | `registry:file` |

Every file has a `target` under `mockio/`, mirroring this package's `src/`
(`src/components/Action/Action.tsx` → `mockio/components/Action/Action.tsx`,
`docs/guides/registry.md` → `mockio/docs/guides/registry.md`). The relative
imports between a component, its assets and `contract.ts` therefore resolve
after install exactly as they do here.

### Dependencies

- `dependencies` lists the npm packages a component imports (beyond React),
  read from the files themselves and from the contract.
- `registryDependencies` always starts with `mockio-theme`, so a component
  never installs unstyled, then lists the components it composes (from the
  contract's `composes`) and any item that ships a file it imports (usually
  `mockio-contract`).

Dependencies between items are namespaced, `@mockio/mockio-theme`, because the
shadcn CLI resolves a bare name against its own registry, not this one. A
consumer maps the namespace in their `components.json`:

```json
{
  "registries": {
    "@mockio": "https://<host>/r/{name}.json"
  }
}
```

The generator fails, and writes nothing, if any relative import in a component
folder points at a file no item ships. An item that installs and does not
compile is worse than no item.

## The theme item

shadcn writes `cssVars.light` to `:root` and `cssVars.dark` to `.dark`. Mockio
is dark by default, so after installing the theme through `cssVars`, add
`class="dark"` to `<html>` for Mockio's default look. Variables that do not
change between themes (the easing curves) are in `light` too, so they reach
`:root` either way.

`cssVars.theme` is the same `@theme inline` mapping as `theme.css`: it gives
v4 projects the utility names the v3 preset makes.

If you would rather not have the CLI write variables into your CSS, skip the
`cssVars` and import `mockio/tokens/theme.css` (v4) or use
`mockio/tokens/tailwind-preset.js` (v3).

## meta.contract

Each component item carries, under `meta`:

```json
{
  "level": "atom",
  "status": "stable",
  "version": "1.0.0",
  "contract": { "name": "Action", "props": { }, "states": [ ], "accessibility": { }, "usage": { } }
}
```

`meta.contract` is the full contract from `<Name>.contract.ts`: props with
types, defaults and allowed values; states and what triggers them; events;
motion; accessibility (role, keyboard, ARIA and who manages it, contrast,
focus, target size); content rules and real examples; when to use it and when
not, with the alternative; tokens; i18n and RTL; responsive behaviour; the
design-tool mapping (`registryItem`, `importStatement`, `canvasProps`,
`placement`); the product counterpart; version and changelog.

A tool or assistant that installs a component gets its rules with it. An
assistant composing a screen should read `meta.contract.usage` and
`meta.contract.content` before choosing a component or writing a label, and
respect `usage.whenNot[].instead`.

## Install

`shadcn add` installs one item from its own JSON file or URL, not from a whole
`registry.json`. Build the per-item files first; the shadcn CLI does it from
this file:

```sh
cd design-system
npx shadcn@latest build          # reads registry.json, writes public/r/<name>.json
```

Then, in the consuming project, map the namespace (above) to where those files
are served and add by name:

```sh
npx shadcn@latest add @mockio/action
```

or add a single item by path or URL (`npx shadcn@latest add
https://<host>/r/action.json`). Do not commit `public/r/` (it is in
`.gitignore`): it is regenerated from `registry.json` whenever it is needed. The command names above
are the shadcn CLI's at the time of writing (`build` was earlier
`registry:build`); if one is missing, run `npx shadcn@latest --help`.

The registry is internal, like the site. Host it behind the same access
control (the admin service serves the site at `/ds/`), not on a public URL.
