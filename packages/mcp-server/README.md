# Gastrowheel MCP Server

An MCP server providing 10 tools for ingredient lookup, flavor pairing, dish discovery, and cooking guidance — powered by 827 ingredients, 590 dish descriptions, 71 cooking components, and a weighted pairing engine.

## Quick Start

```bash
# Clone and install
git clone https://github.com/MiguelitoHaase1/gastrowheel.git
cd gastrowheel
pnpm install

# Generate data + build
pnpm generate-data
pnpm -r build

# Run tests
pnpm --filter @gastrowheel/mcp-server test
```

## Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gastrowheel": {
      "command": "node",
      "args": ["/absolute/path/to/gastrowheel/packages/mcp-server/dist/index.js"]
    }
  }
}
```

## Tools (10)

### 1. `get_ingredients_by_segment`

Get all ingredients in a wheel segment with optional filters.

| Param | Type | Required | Description |
|---|---|---|---|
| `segment` | string | Yes | One of: Sour, Umami, Oil, Crunch, Sweet, Aroma, Fresh, Base, Bitter, Spicy |
| `dietary` | string[] | No | Dietary flags to require (AND logic): Glutenfree, Vegan, Vegetarian, LactoseFree, Diabetic, NutFree, FODMAPS |
| `season` | string | No | Spring, Summer, Fall, Winter |
| `region` | string | No | Mediterranean, SouthAsian, EastAsian, LatinAmerican, European, MiddleEastern, Exotic |
| `cookingStyle` | string | No | SlowAndDeep, FastAndFresh |
| `recipeTags` | string[] | No | Sofrito, Taco, Aromatics, Boil, Raw, Dressing, Toasting |
| `commonality` | string | No | "all", "common", or "exotic" |

### 2. `get_ingredient_details`

Full details for a single ingredient by ID or name.

| Param | Type | Required |
|---|---|---|
| `id` | number | Either id or name |
| `name` | string | Either id or name |

### 3. `get_pairing_suggestions`

Ranked pairing suggestions using the weighted scoring engine.

| Param | Type | Required | Description |
|---|---|---|---|
| `selectedIds` | number[] | Yes | IDs of already-selected ingredients |
| `targetSegment` | string | No | Omit for free pairing across all segments |
| `limit` | number | No | Default 10 (segment) or 80 (free) |
| `dietary` | string[] | No | Dietary flags |
| `season` | string | No | Season filter |
| `region` | string | No | Region filter |
| `cookingStyle` | string | No | Cooking style filter |
| `commonality` | string | No | Commonality filter |

### 4. `suggest_dishes`

Fuzzy-match ingredients against 590 dish descriptions with scoring.

| Param | Type | Required | Description |
|---|---|---|---|
| `ingredientNames` | string[] | Yes | Ingredient names to match |
| `wheelSegments` | string[] | No | Segments per ingredient (enables diversity bonus) |
| `hasSweetIngredient` | boolean | No | Disables sweet-dish penalty when true |
| `language` | string | No | en, da, de, es, lv, et, lt (default "en") |
| `limit` | number | No | Default 15 |

### 5. `search_ingredients`

Search and filter ingredients across all properties.

| Param | Type | Required | Description |
|---|---|---|---|
| `query` | string | No | Free-text name search |
| `segment` | string | No | Wheel segment |
| `taste` | string | No | Taste tag |
| `aroma` | string | No | Aroma tag |
| `dietary` | string[] | No | Dietary flags |
| `season` | string | No | Season |
| `region` | string | No | Region |
| `cookingStyle` | string | No | Cooking style |
| `recipeTags` | string[] | No | Recipe tags |
| `role` | string | No | Dish role (e.g., Protein, Herbs) |
| `roleCategory` | string | No | Bulk, Boost, Top, Splash |
| `commonality` | string | No | Commonality filter |
| `limit` | number | No | Default 50 |

### 6. `get_cooking_guide`

Cooking steps and recipe matches for selected ingredients.

| Param | Type | Required |
|---|---|---|
| `ingredientIds` | number[] | Either ids or names |
| `ingredientNames` | string[] | Either ids or names |

### 7. `get_wheel_structure`

Discovery tool: segments, colors, walk order, pairing weights, stats.

No parameters required.

### 8. `list_filter_options`

All valid enum values for every filter parameter.

No parameters required.

### 9. `get_cooking_components`

Direct access to 71 cooking instruction modules and 60 recipe notes.

| Param | Type | Required | Description |
|---|---|---|---|
| `module` | string | No | Filter by module name |
| `type` | string | No | "components", "recipes", or "all" (default) |

### 10. `get_ingredient_icon`

SVG icon content for an ingredient.

| Param | Type | Required |
|---|---|---|
| `id` | number | Yes |

## Architecture

```
gastrowheel_unified.csv + scripts/excel_parsed.json
    |
    v  (pnpm generate-data)
packages/data/generated/{ingredients,dishes}.ts
    |
    v  (imports)
packages/mcp-server/src/index.ts  -->  10 MCP tools via stdio
```

All data is pre-generated as TypeScript modules. No database or runtime parsing needed.

## Pairing Engine

The engine scores candidates on 6 weighted factors:

| Factor | Weight | Logic |
|---|---|---|
| Aroma overlap | 0.35 | Jaccard similarity on 15 aroma tags |
| Taste balance | 0.30 | Favor underrepresented tastes |
| Region affinity | 0.15 | Same cuisine region scores higher |
| Role diversity | 0.10 | Favor underrepresented role categories |
| Season match | 0.05 | Shared seasonality |
| Commonality | 0.05 | Prefer widely available ingredients |

Selected ingredients are excluded from suggestions. Name overlap detection prevents variants like "noodles" and "rice noodles" from both appearing.

## Example Workflows

### Walk the wheel (guided mode)

1. `get_wheel_structure` — get walk order
2. `get_ingredients_by_segment({ segment: "Base" })` — pick a base
3. `get_pairing_suggestions({ selectedIds: [baseId], targetSegment: "Fresh" })` — next segment
4. Repeat for each segment in walk order
5. `suggest_dishes({ ingredientNames: [...] })` — find matching dishes
6. `get_cooking_guide({ ingredientIds: [...] })` — get cooking steps

### Free pairing

1. `get_pairing_suggestions({ selectedIds: [id1, id2], limit: 20 })` — no targetSegment
2. Results span all segments, ranked by compatibility

### Discovery

1. `list_filter_options` — see all valid filter values
2. `search_ingredients({ taste: "Umami", region: "EastAsian" })` — explore
3. `get_cooking_components({ module: "Sofrito" })` — learn techniques

## Development

```bash
# Regenerate data from CSV
pnpm generate-data

# Build everything
pnpm -r build

# Run MCP server tests (81 tests)
pnpm --filter @gastrowheel/mcp-server test

# Run data package tests (36 tests)
pnpm --filter @gastrowheel/data test

# Dev mode (auto-restart)
pnpm --filter @gastrowheel/mcp-server dev

# Inspect with MCP inspector
npx @modelcontextprotocol/inspector node packages/mcp-server/dist/index.js
```
