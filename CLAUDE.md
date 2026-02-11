# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gastrowheel is an interactive cooking companion where users build dishes by selecting ingredients around a flavor wheel. The wheel has **10 segments**:

**Sour · Umami · Oil · Crunch · Sweet · Aroma · Fresh · Base · Bitter · Spicy**

Users start by picking a base ingredient, then move around the wheel segment by segment. At each step, the system proposes ingredients for the next component that pair well with what's already selected. The goal: compose a balanced, flavorful dish one component at a time.

The project will include a **React web app** (interactive wheel UI) and an **MCP server** (ingredient data, pairing logic, dish suggestions).

## Data: Single Source of Truth

### `gastrowheel_unified.csv`

**This is the only file to read for ingredient data.** Everything else is legacy input.

827 ingredients, 100 columns, sorted by ID. All boolean tags use `x` for true, empty for false.

**Column groups:**

| Group | Columns | Purpose |
|---|---|---|
| Identity | `id`, `name` | Ingredient ID and English display name |
| Dish Components (16) | `Fibres`, `Starch`, `Protein`, `Lightbulks`, `Spices`, `Alliums`, `Fruittops`, `Seeds`, `Nuts`, `Bread`, `Cheesetops`, `Herbs`, `OtherTops`, `Oils`, `Fats`, `LiquidAromas` | Role in a dish: Bulk / Boost / Top / Splash |
| Dietary (7) | `Glutenfree`, `Vegan`, `Vegetarian`, `LactoseFree`, `Diabetic`, `NutFree`, `FODMAPS` | Dietary restriction compatibility |
| Taste (8) | `Umami`, `Sweet`, `Bitter`, `Sour`, `Salty`, `Spicy`, `Crunchy`, `AromaBomb` | Primary taste profile |
| Aromas (15) | `FRUITY`, `GREEN`, `FLORAL`, `SULFUROUS`, `HERBAL`, `AROMATIC_SPICY`, `WOODY`, `NUTTY`, `ROASTED`, `SMOKEY`, `CITRUS`, `MEATY`, `MARINE`, `CREAMY`, `CHEESY` | Aroma profile |
| Seasonality (4) | `Spring`, `Summer`, `Fall`, `Winter` | Best seasons |
| Region (7) | `Mediterranean`, `SouthAsian`, `EastAsian`, `LatinAmerican`, `European`, `MiddleEastern`, `Exotic` | Cuisine associations |
| Style (2) | `SlowAndDeep`, `FastAndFresh` | Cooking style fit |
| RecipeTags (7) | `Sofrito`, `Taco`, `Aromatics`, `Boil`, `Raw`, `Dressing`, `Toasting` | Cooking method |
| Flavormap (17) | `Sour_map` .. `Baking_map` | Detailed flavor mapping dimensions |
| **Wheel (10)** | `Sour_wheel`, `Umami_wheel`, `Oil_wheel`, `Crunch_wheel`, `Sweet_wheel`, `Aroma_wheel`, `Fresh_wheel`, `Soft_wheel`, `Bitter_wheel`, `Spicy_wheel` | **Gastrowheel segment assignments** |
| Market (4) | `common_en`, `common_da`, `common_de`, `common_es` | Regional ingredient commonality |
| Meta (1) | `has_icon` | Whether `Icons/{id}.svg` exists |

154 ingredients have multiple wheel assignments (e.g., yoghurt → Sour + Oil + Fresh). 407 of 827 have SVG icons.

### `DishDescriptions.xlsx` (separate — not in the CSV)

Dish-level content for the recipe/guidance side of the app. Four sheets:
- **DishDescriptions** — 590 dish descriptions in up to 7 languages (en, da, de, es, lv, et, lt)
- **DishNotes** — 572 per-dish cooking tips
- **CookingComponents** — 71 reusable cooking instruction modules (Sofrito, Fry, Roast, etc.)
- **RecipeNotes** — 60 composed recipe instructions

Parsed version available at `scripts/excel_parsed.json`.

### `Icons/`

342 SVG files named `{id}.svg`. The `has_icon` column in the unified CSV tracks which ingredients have icons.

## Legacy Source Files (do not use directly)

These were merged into `gastrowheel_unified.csv` and are kept only for provenance:

| File | What it was | Why it's legacy |
|---|---|---|
| `IngredientTagsV2.csv` | 341 ingredients, 3-row hierarchical header | Superseded by unified CSV |
| `Gastrowheel_tags .csv` | Same 341, just wheel columns | Merged into unified CSV (was authoritative for wheels where V2 was stale) |
| `IngredientTags.csv` | 759 ingredients, different ID system | IDs don't match V2. Matched by name during merge. |
| `CommonIngredients.xlsx` | Regional commonality per market | Merged into `common_en/da/de/es` columns |

## Scripts

All in `scripts/`. Run with `python3 scripts/<name>.py` from project root.

| Script | Purpose | Output |
|---|---|---|
| `build_unified_csv.py` | **Builds the unified CSV** from all parsed sources. Re-run to regenerate. | `gastrowheel_unified.csv`, `scripts/merge_report.txt` |
| `parse_v1.py` | Parses `IngredientTags.csv` (V1) | `scripts/v1_parsed.json` |
| `parse_v2.py` | Parses `IngredientTagsV2.csv` + `Gastrowheel_tags .csv` | `scripts/v2_parsed.json`, `scripts/v2_columns.json` |
| `parse_excel.py` | Parses both Excel files | `scripts/excel_parsed.json` |

To regenerate the unified CSV from scratch:
```bash
python3 scripts/parse_v1.py
python3 scripts/parse_v2.py
python3 scripts/parse_excel.py
python3 scripts/build_unified_csv.py
```

## Multi-Language Support

Dish content supports: English (en), Danish (da), German (de), Spanish (es), Latvian (lv), Estonian (et), Lithuanian (lt). Ingredient names are English only.

## Architecture (Implemented)

### Monorepo (pnpm workspaces)

```
Gastrowheel/
├── packages/data/          # @gastrowheel/data — types, constants, pairing engine
├── packages/mcp-server/    # @gastrowheel/mcp-server — 5 MCP tools
├── app/                    # @gastrowheel/app — Next.js 15 + React 19
└── pnpm-workspace.yaml     # packages/*, app
```

### Build & Run Commands

```bash
pnpm install              # Install all workspace deps
pnpm generate-data        # Regenerate TS modules from CSV + JSON
pnpm -r build             # Build all packages (data → mcp-server + app)
pnpm dev                  # Start Next.js dev server (port 3000)
```

### Key Technology Choices

| Choice | Rationale |
|---|---|
| Pre-generated TS modules from CSV | 827 rows = ~150KB. No DB needed. Type-safe, zero-latency. |
| SVG wheel (not Canvas) | 10 segments = trivial. Native DOM events, CSS transitions, accessible. |
| Zustand for state | Complex state consumed by many components. Avoids Context re-render cascade. |
| Tailwind v4 + custom @theme | Warm cream/coral palette, segment-specific colors defined in globals.css |
| framer-motion | Smooth segment transitions, ingredient card entry animations |
| Extensionless imports in data package | Required for Next.js `transpilePackages` compatibility |

### Data Flow

```
gastrowheel_unified.csv + scripts/excel_parsed.json
    ↓ (pnpm generate-data → packages/data/scripts/generate-data.ts)
packages/data/generated/{ingredients,dishes}.ts
    ↓ (import via package exports)
app/src/lib/data.ts (re-exports for app consumption)
    ↓
Components, hooks, store
```

### Important Implementation Notes

- **Nullable dish fields**: Some dish entries have `null` for `dishName`, `dishPk`, `fullTextEn`. Types use `string | null` / `number | null`.
- **Data package exports**: The `package.json` exports map explicit paths for generated files (`./generated/ingredients`, `./generated/dishes`). Wildcard exports didn't work reliably with Next.js.
- **Import style**: All internal imports in `packages/data/src/` use extensionless paths (e.g., `from "./types"` not `from "./types.js"`). This is required because Next.js `transpilePackages` resolves `.ts` source files directly.
- **Generated files import types**: `generated/ingredients.ts` imports `from "../src/types"` — this relative path works because Next.js transpiles the whole package.
- **Icons**: 342 SVGs copied to `app/public/icons/{id}.svg`. The `has_icon` field on ingredients determines which have icons vs letter fallback.

### Web App Component Map

```
app/src/
├── app/page.tsx              # Main layout (3-col desktop, mobile bottom sheet)
├── components/
│   ├── wheel/flavor-wheel.tsx  # SVG wheel with 10 arc segments
│   ├── wheel/walk-guide.tsx    # Horizontal step indicator
│   ├── ingredients/ingredient-grid.tsx  # Pairing-scored ingredient list
│   ├── ingredients/ingredient-card.tsx  # Single ingredient card
│   ├── ingredients/ingredient-icon.tsx  # SVG icon or letter fallback
│   ├── dish/dish-builder.tsx   # Selected ingredients summary
│   ├── dish/dish-suggestions.tsx # Fuzzy dish matching
│   ├── dish/cooking-guide.tsx  # Recipe tag → cooking steps
│   └── filters/filter-bar.tsx  # Dietary, season, region, search
├── store/dish-store.ts       # Zustand: selections, filters, walk state
├── hooks/use-ingredients.ts  # Static data access hook
└── lib/data.ts               # Re-exports from generated modules
```

### MCP Server Tools (10 tools)

1. `get_ingredients_by_segment` — Filter by wheel segment + dietary/season/region
2. `get_ingredient_details` — Lookup by ID or name
3. `get_pairing_suggestions` — Ranked pairings given selected IDs + target segment
4. `suggest_dishes` — Match ingredients against dish descriptions
5. `search_ingredients` — Free-text + structured filter search
6. `get_cooking_guide` — Cooking steps + recipes for selected ingredients
7. `get_wheel_structure` — Wheel constants, colors, weights, stats
8. `list_filter_options` — All valid enum values for every filter
9. `get_cooking_components` — Direct access to 71 cooking modules + 60 recipes
10. `get_ingredient_icon` — SVG icon content for an ingredient

### REST API (10 endpoints)

The same 10 capabilities are exposed as HTTP endpoints for cross-origin consumption (e.g., Lovable, external frontends). Full documentation: [`API-documentation.md`](./API-documentation.md).

```
GET  /api/filters                        — All valid filter enum values
GET  /api/wheel/structure                — Wheel constants + stats
GET  /api/ingredients/by-segment         — Ingredients in a wheel segment
GET  /api/ingredients/search             — Search/filter ingredients
GET  /api/ingredients/{id}               — Single ingredient (by ID or name)
GET  /api/ingredients/{id}/icon          — SVG icon (image/svg+xml)
GET  /api/cooking-components             — Cooking components + recipe notes
POST /api/pairing-suggestions            — Ranked pairing suggestions
POST /api/suggest-dishes                 — Fuzzy dish matching
POST /api/cooking-guide                  — Cooking steps + recipes
```

**Base URL:** `https://gastrowheel.vercel.app`
**CORS:** `Access-Control-Allow-Origin: *` on all endpoints
**Caching:** GET routes cached at CDN edge (`s-maxage=3600`)

### Pairing Engine Weights

| Factor | Weight | Logic |
|---|---|---|
| Aroma overlap | 0.35 | Jaccard similarity on 15 aroma tags |
| Taste balance | 0.25 | Favor underrepresented tastes |
| Region affinity | 0.15 | Same cuisine region scores higher |
| Season match | 0.10 | Shared seasonality |
| Role diversity | 0.10 | Favor underrepresented role categories (Bulk/Boost/Top/Splash) |
| Commonality | 0.05 | Prefer widely available ingredients |

## Deployment

### Vercel (Production)

- **URL**: https://gastrowheel.vercel.app
- **GitHub**: https://github.com/MiguelitoHaase1/gastrowheel
- **Project ID**: `prj_u9WDrBRGYMXiocIoPTDvgxpbX4C7`
- **Team**: `michael-haases-projects-5567a244`

### Vercel Monorepo Configuration

This is a **pnpm workspace monorepo** deployed with root directory set to `app/`. The config was set via the Vercel API (not `vercel.json`) because the CLI `vercel project` doesn't support setting root directory directly.

| Setting | Value |
|---|---|
| Root Directory | `app` |
| Framework | `nextjs` |
| Install Command | `cd .. && pnpm install` |
| Build Command | `cd .. && pnpm -r build` |
| Node.js | 24.x |

### Deploy Commands

```bash
# Push to GitHub (auto-deploy triggers too)
git push origin main

# Manual production deploy via CLI
vercel --prod --yes

# Check deployment logs
vercel inspect <deployment-url> --logs
```

### Deployment Gotchas (Learned the Hard Way)

1. **`.beads/bd.sock` breaks Vercel upload** — Socket files cause `Unknown system error -102`. Fix: add `.beads` to `.vercelignore`.

2. **Project name validation** — Vercel rejects names derived from deep directory paths. Always specify `--project gastrowheel` when linking.

3. **Framework auto-detection fails for monorepos** — Vercel looks for `next` in root `package.json`, not the workspace. Must set root directory to `app/` and framework to `nextjs` via the API:
   ```bash
   curl -X PATCH "https://api.vercel.com/v9/projects/$PROJECT_ID?teamId=$TEAM_ID" \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"rootDirectory":"app","framework":"nextjs","installCommand":"cd .. && pnpm install","buildCommand":"cd .. && pnpm -r build"}'
   ```
   Token lives at: `~/Library/Application Support/com.vercel.cli/auth.json`

4. **`vercel.json` with `outputDirectory: "app/.next"` doesn't work** — Vercel needs the root directory setting, not just output redirection. Use project-level API settings instead.

5. **TypeScript strict mode in `next build`** — Turbopack dev mode doesn't catch all type errors. `ringColor` is a Tailwind utility, NOT a valid CSS property. Use `boxShadow` for inline ring effects: `boxShadow: "0 0 0 2px white, 0 0 0 4px ${color}"`

6. **`.vercelignore` is essential** — Prevents uploading socket files, large CSVs, and local-only state:
   ```
   .beads
   .git
   node_modules
   *.csv
   *.xlsx
   scripts/
   Icons/
   status.md
   ```

### Testing

```bash
pnpm --filter @gastrowheel/data test   # 29 unit tests (vitest)
pnpm -r build                           # Full build verification
```
