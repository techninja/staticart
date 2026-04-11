You are implementing **Platform Stacking** for the Clearstack CLI (`@techninja/clearstack` v0.3.17) at `/home/techninja/web/clearstack/`.

## Context

Clearstack is a no-build web component spec + CLI. It scaffolds projects, syncs spec docs, and runs compliance checks. A new spec doc `docs/PLATFORM_STACKING.md` defines how a Clearstack project can declare itself as a **platform** — a reusable foundation that scaffolds child projects with vendor files, config schemas, and override layers.

The first (and currently only) platform is **StatiCart** (`staticart`) at `/home/techninja/web/staticart/`. It's a working e-commerce app (49/49 tests, 10/10 spec checks) that needs to be extractable as an npm package that scaffolds child stores.

## What Exists

### Clearstack CLI (`/home/techninja/web/clearstack/`)
- `bin/clearstack.js` — CLI entry point, handles `init`, `update`, `check` subcommands
- `lib/` — scaffold logic, spec checkers, doc sync
- `docs/` — spec docs that get synced to child projects
- `docs/PLATFORM_STACKING.md` — the spec you're implementing (read this first!)
- `templates/` — scaffold templates for `init`

### StatiCart (`/home/techninja/web/staticart/`)
- Working Clearstack project with full e-commerce flow
- Components in `src/components/` (atoms, molecules, organisms)
- Store models in `src/store/` (Product, CartState, UserPrefs, AppState)
- Utils in `src/utils/` (formatPrice, i18n with 4-layer cascade, productVariants, storeConfig, checkout)
- API handlers in `api/` (checkout, webhook, stock, orders, session)
- Build scripts in `scripts/` (build-products, update-stock, vendor-deps, build-icons, setup)
- i18n: all templates wired through `t()`, Spanish locale complete, project-specific terms (category names) in `locales/overrides*.json`
- Config: `staticart.config.json` at project root, served by dev server via explicit Express route

## What to Implement

### Phase 1: Clearstack CLI — Platform-Aware `init` and `update`

1. Read `docs/PLATFORM_STACKING.md` thoroughly — it's the spec.
2. Modify `clearstack init` to detect platforms in `devDependencies` (or `dependencies`) by looking for `clearstack.platform` in their `package.json`.
3. After normal Clearstack scaffolding, run the platform's vendor/template/docs copy steps per the manifest.
4. Modify `clearstack update` to re-vendor platform files and sync platform docs (always overwrite), while skipping project-owned files.
5. The `postinstall` hook pattern (platform vendor sync on `npm install`) should also work — document both paths.

### Phase 2: StatiCart Package Extraction

1. Add `clearstack.platform` manifest to StatiCart's `package.json`.
2. Create `vendor/` directory in StatiCart with the files that get vendored to child projects (components, store models, utils, styles).
3. Create `templates/` directory with scaffold templates (index.html, config, tokens.css, seed products.json, .env).
4. Ensure `staticart init` (via Clearstack) produces a working store from scratch.
5. Ensure `staticart update` (via Clearstack) syncs vendor files without clobbering project customizations.

### Phase 3: Verify End-to-End

1. From an empty directory: `npm init -y && npm install @techninja/clearstack @techninja/staticart`
2. `npx clearstack init` should detect StatiCart and scaffold a complete store
3. `npm run dev` should serve a working store with seed data
4. `npm test` and `npm run spec` should pass
5. Changing `tokens.css` should restyle without touching vendor files
6. Adding an import map override should replace a platform component

## Key Constraints

- Clearstack spec rules apply: ≤150 lines per file, no `../` imports in browser JS, `shadow: false`, JSDoc types, etc.
- The platform stacking must not break existing non-platform Clearstack projects. `init` and `update` without a platform dependency should work exactly as before.
- File ownership is sacred: vendor files are always overwritten, project files are never touched on update, templates are created once.
- The i18n responsibility split: platform owns UI chrome translations, project owns domain-specific terms (categories, variants, product copy) via override files.

## Important Files to Read First

1. `/home/techninja/web/clearstack/docs/PLATFORM_STACKING.md` — the spec
2. `/home/techninja/web/clearstack/bin/clearstack.js` — current CLI
3. `/home/techninja/web/clearstack/lib/` — current scaffold/update/check logic
4. `/home/techninja/web/staticart/package.json` — StatiCart's current structure
5. `/home/techninja/web/staticart/docs/app-spec/SCAFFOLD.md` — StatiCart's scaffold design doc
6. `/home/techninja/web/staticart/scripts/setup.js` — current postinstall flow
