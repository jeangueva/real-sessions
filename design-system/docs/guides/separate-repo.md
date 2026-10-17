---
title: Separate repository
group: Guides
order: 5
summary: How to split design-system/ into its own GitHub repository with its history, and what changes once it lives there.
---

# Moving the system to its own repository

`design-system/` is self-contained: its own `package.json`, lockfile,
`.npmrc`, `.gitignore`, Tailwind and Vite config, tests and scripts. Nothing in
it imports from the rest of the monorepo. So it can move to its own GitHub
repository, history included, whenever the team wants one (to give a design
tool a repository to connect, or to version the system apart from the
product).

## Split it, keeping history

From the monorepo root, on an up-to-date `main`:

```sh
# 1. A branch whose root is design-system/, with every commit that touched it.
git subtree split --prefix=design-system -b design-system

# 2. An empty repository on GitHub (no README, no licence, so the first push
#    has nothing to merge with), then push the branch as its main.
gh repo create <org>/mockio-design-system --private
git push git@github.com:<org>/mockio-design-system.git design-system:main

# 3. The local branch is no longer needed.
git branch -D design-system
```

`git subtree split` rewrites only the commits that touched `design-system/`,
with paths relative to it, so `git log` and `git blame` in the new repository
show the real history. Commit hashes differ from the monorepo's.

Then, in a clone of the new repository:

```sh
npm ci
npm run check
npm run build
```

## What changes

**The two product checks skip themselves.** Both tests that look outside the
folder are guarded by `it.runIf(existsSync(...))`, so when there is no `../web`
next to the package they are reported as skipped, not failed:

- `test/tokens.test.ts`, "match the product stylesheet, in both themes",
  runs only if `../web/src/index.css` exists.
- `test/contracts.test.ts`, "points at a product counterpart that still
  exists", runs only if `../web/src` exists.

Nothing else in the package (`src/`, `app/`, `scripts/`, `test/`) reads a
path outside the folder, which was checked when this guide was written. Keep
it that way: a new test that reaches into `../web` must use the same guard.

That also means **the drift guard is gone** in the new repository. The tokens
and the product's counterparts can now drift silently. Pick one before the
split:

- Keep a copy of the drift tests in the monorepo, pointing at the system as a
  dependency (a git URL or the internal registry), so the product's CI still
  compares the two.
- Or check out the monorepo in the system's CI as well and put (or symlink)
  its `web/` folder at `../web` next to the system's checkout, so the guarded
  tests run again.

**CI.** Move the design-system steps out of the monorepo's
`.github/workflows/ci.yml` into a workflow in the new repository: `npm ci`,
`npm run check`, `npm run build`, with `package-lock.json` as the cache path.

**The internal site.** The admin service builds the site from
`design-system/` (`render.yaml`, `mockio-admin`'s build command) and serves
`design-system/dist` at `/ds/`. After the split, either keep a copy in the
monorepo for the admin to build, or change that build command to clone the
new repository (it needs a deploy key) and point `DS_ROOT` in
`admin/server.ts` at the result.

**The product.** It never imported the package, so nothing in `web/` breaks.
If the product later consumes the system, add it as a dependency by git URL
(`"@mockio/design-system": "github:<org>/mockio-design-system#v1.2.0"`) and
pin a tag.

**The remaining folder.** Either delete `design-system/` from the monorepo
(`git rm -r design-system`) in the same pull request that updates the CI,
`render.yaml` and this guide, or keep it and bring changes across with
`git subtree pull --prefix=design-system <remote> main`. Do not keep two
copies that both receive edits.

**Lunagraph and other tools** can then connect the new repository directly:
its root is the project root, with `components.json`, `CLAUDE.md` and
`AGENTS.md` at the top.
