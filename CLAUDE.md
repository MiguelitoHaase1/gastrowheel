# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Gastrowheel is an interactive cooking companion where users build dishes by selecting ingredients around a flavor wheel. The wheel has **10 segments**:

**Sour · Umami · Oil · Crunch · Sweet · Aroma · Fresh · Soft · Bitter · Spicy**

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

## Architecture Plan

### React Web App
- Interactive wheel visualization with 10 segments
- Step-by-step ingredient selection flow
- Ingredient cards with SVG icons
- Pairing suggestions based on selected ingredients
- Dietary filter support

### MCP Server
- Serve ingredient data with full taxonomy
- Pairing/recommendation engine based on shared tags, flavor profiles, and aroma compatibility
- Dish suggestion based on selected ingredients
- Dietary and regional filtering
