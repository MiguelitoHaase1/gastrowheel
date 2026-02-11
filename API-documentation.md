# Gastrowheel REST API

Base URL: `https://gastrowheel.vercel.app`

All endpoints return JSON with CORS headers (`Access-Control-Allow-Origin: *`). GET routes are cached at the CDN edge. Every route supports `OPTIONS` preflight.

---

## Discovery Endpoints

### GET /api/filters

Returns all valid enum values for every filter parameter. Call this first to know what values you can pass to other endpoints.

**Response:**

```json
{
  "wheelSegments": ["Sour", "Umami", "Oil", "Crunch", "Sweet", "Aroma", "Fresh", "Base", "Bitter", "Spicy"],
  "dietaryFlags": ["Glutenfree", "Vegan", "Vegetarian", "LactoseFree", "Diabetic", "NutFree", "FODMAPS"],
  "seasons": ["Spring", "Summer", "Fall", "Winter"],
  "regions": ["Mediterranean", "SouthAsian", "EastAsian", "LatinAmerican", "European", "MiddleEastern", "Exotic"],
  "tastes": ["Umami", "Sweet", "Bitter", "Sour", "Salty", "Spicy", "Crunchy", "AromaBomb"],
  "aromas": ["FRUITY", "GREEN", "FLORAL", "SULFUROUS", "HERBAL", "AROMATIC_SPICY", "WOODY", "NUTTY", "ROASTED", "SMOKEY", "CITRUS", "MEATY", "MARINE", "CREAMY", "CHEESY"],
  "cookingStyles": ["SlowAndDeep", "FastAndFresh"],
  "recipeTags": ["Sofrito", "Taco", "Aromatics", "Boil", "Raw", "Dressing", "Toasting"],
  "dishRoles": ["Fibres", "Starch", "Protein", "Lightbulks", "Spices", "Alliums", "Fruittops", "Seeds", "Nuts", "Bread", "Cheesetops", "Herbs", "OtherTops", "Oils", "Fats", "LiquidAromas"],
  "roleCategories": ["Bulk", "Boost", "Top", "Splash"],
  "marketCodes": ["en", "da", "de", "es"],
  "contentLanguages": ["en", "da", "de", "es", "lv", "et", "lt"]
}
```

### GET /api/wheel/structure

Returns the Gastrowheel structural constants for building UIs.

**Response:**

```json
{
  "segments": ["Sour", "Umami", ...],
  "walkOrder": ["Base", "Fresh", "Aroma", "Oil", "Umami", "Sour", "Sweet", "Crunch"],
  "segmentColors": {
    "Sour": { "bg": "#FEF3C7", "text": "#92400E", "accent": "#F59E0B" },
    ...
  },
  "pairingWeights": { "aromaOverlap": 0.35, "tasteBalance": 0.30, ... },
  "roleCategories": { "Fibres": "Bulk", "Starch": "Bulk", ... },
  "dishRoles": ["Fibres", "Starch", ...],
  "stats": {
    "totalIngredients": 827,
    "ingredientsPerSegment": { "Sour": 150, "Base": 216, ... },
    "totalDishDescriptions": 590,
    "totalDishNotes": 572,
    "totalCookingComponents": 71,
    "totalRecipeNotes": 60,
    "ingredientsWithIcons": 407
  }
}
```

---

## Ingredient Endpoints

### GET /api/ingredients/by-segment

Get all ingredients assigned to a wheel segment, with optional filters.

**Query Parameters:**

| Param | Type | Required | Description |
|---|---|---|---|
| `segment` | string | Yes | Wheel segment name (e.g., `Base`, `Sour`) |
| `dietary` | string | No | Comma-separated dietary flags (e.g., `Vegan,NutFree`) |
| `season` | string | No | Season filter (e.g., `Summer`) |
| `region` | string | No | Cuisine region (e.g., `Mediterranean`) |
| `cookingStyle` | string | No | `SlowAndDeep` or `FastAndFresh` |
| `recipeTags` | string | No | Comma-separated recipe tags (e.g., `Sofrito,Boil`) |
| `commonality` | string | No | `all`, `common`, or `exotic` |

**Example:** `GET /api/ingredients/by-segment?segment=Base&dietary=Vegan&season=Summer`

**Response:**

```json
{
  "segment": "Base",
  "count": 142,
  "ingredients": [
    {
      "id": 1,
      "iconId": 1,
      "name": "acorn squash",
      "roles": ["Fibres"],
      "roleCategory": "Bulk",
      "dietary": ["Glutenfree", "Vegan", "Vegetarian", "LactoseFree", "NutFree"],
      "tastes": ["Sweet"],
      "aromas": ["NUTTY", "CREAMY"],
      "seasons": ["Fall", "Winter"],
      "regions": ["European"],
      "cookingStyles": ["SlowAndDeep"],
      "recipeTags": ["Boil"],
      "wheelSegments": ["Base"],
      "commonIn": [],
      "hasIcon": true
    }
  ]
}
```

### GET /api/ingredients/search

Search ingredients by name and/or structured filters. All parameters are optional.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `query` | string | Free-text search (matched against ingredient name) |
| `segment` | string | Wheel segment filter |
| `taste` | string | Taste tag filter (e.g., `Umami`) |
| `aroma` | string | Aroma tag filter (e.g., `SMOKEY`) |
| `dietary` | string | Comma-separated dietary flags |
| `season` | string | Season filter |
| `region` | string | Cuisine region filter |
| `cookingStyle` | string | Cooking style filter |
| `recipeTags` | string | Comma-separated recipe tags |
| `role` | string | Specific dish role (e.g., `Protein`) |
| `roleCategory` | string | Role category (`Bulk`, `Boost`, `Top`, `Splash`) |
| `commonality` | string | `all`, `common`, or `exotic` |
| `limit` | number | Max results (default 50, max 200) |

**Example:** `GET /api/ingredients/search?query=tomato&dietary=Vegan`

**Response:**

```json
{
  "query": "tomato",
  "totalMatches": 10,
  "returned": 10,
  "ingredients": [...]
}
```

### GET /api/ingredients/{id}

Get full details for a single ingredient. The `{id}` parameter can be a numeric ID or an ingredient name (case-insensitive).

**Examples:**
- `GET /api/ingredients/370` (by ID)
- `GET /api/ingredients/tomato` (by name)

**Response:** Single ingredient object (same shape as in the arrays above).

### GET /api/ingredients/{id}/icon

Returns the SVG icon for an ingredient as `image/svg+xml`. The `{id}` must be a numeric ingredient ID.

**Cache:** `max-age=31536000, immutable` (icons never change).

**Errors:**
- `404` if ingredient not found or has no icon

**Example:** `GET /api/ingredients/370/icon` returns raw SVG content.

---

## Pairing & Dish Endpoints

### POST /api/pairing-suggestions

Get ranked ingredient pairing suggestions based on already-selected ingredients. Uses the Gastrowheel pairing engine (aroma overlap, taste balance, region affinity, season match, role diversity, commonality).

**Request Body:**

```json
{
  "selectedIds": [370, 1],
  "targetSegment": "Fresh",
  "limit": 10,
  "dietary": ["Vegan"],
  "season": "Summer",
  "region": "Mediterranean",
  "cookingStyle": "FastAndFresh",
  "commonality": "common"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `selectedIds` | number[] | Yes | IDs of already-selected ingredients |
| `targetSegment` | string | No | Target wheel segment. Omit for free pairing across all segments. |
| `limit` | number | No | Max results (default 10 for segment mode, 80 for free mode) |
| `dietary` | string[] | No | Dietary flags to require |
| `season` | string | No | Season filter |
| `region` | string | No | Region filter |
| `cookingStyle` | string | No | Cooking style filter |
| `commonality` | string | No | `all`, `common`, or `exotic` |

**Response:**

```json
{
  "targetSegment": "Fresh",
  "selectedIngredients": [{ "id": 370, "name": "tomato" }, { "id": 1, "name": "acorn squash" }],
  "count": 10,
  "suggestions": [
    {
      "ingredient": { "id": 42, "name": "dill", ... },
      "totalScore": 0.723,
      "breakdown": {
        "aromaOverlap": 0.25,
        "tasteBalance": 0.18,
        "regionAffinity": 0.12,
        "seasonMatch": 0.05,
        "roleDiversity": 0.08,
        "commonality": 0.04
      }
    }
  ]
}
```

### POST /api/suggest-dishes

Match selected ingredients against the dish description database using fuzzy scoring with stemming, sweet-dish penalty, and segment diversity bonus.

**Request Body:**

```json
{
  "ingredientNames": ["rice", "tomato", "onion"],
  "wheelSegments": ["Base", "Sour", "Aroma"],
  "hasSweetIngredient": false,
  "language": "en",
  "limit": 15
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `ingredientNames` | string[] | Yes | Names of selected ingredients |
| `wheelSegments` | string[] | No | Wheel segments matching ingredientNames 1:1 (enables diversity bonus) |
| `hasSweetIngredient` | boolean | No | Whether any ingredient is from Sweet segment (default false) |
| `language` | string | No | Language for descriptions: `en`, `da`, `de`, `es`, `lv`, `et`, `lt` (default `en`) |
| `limit` | number | No | Max results (default 15) |

**Response:**

```json
{
  "query": ["rice", "tomato", "onion"],
  "matchCount": 15,
  "dishes": [
    {
      "dishName": "Orzotto",
      "dishPk": 123,
      "description": "A creamy risotto-style dish...",
      "note": "Use arborio rice for best results...",
      "score": 3.5,
      "matchCount": 3,
      "matchedIngredients": ["rice", "tomato", "onion"],
      "quality": "strong"
    }
  ]
}
```

Quality labels: `"strong"` (50%+ match or 3+ ingredients), `"good"` (2 matches), `"partial"` (1 match).

### POST /api/cooking-guide

Given selected ingredients, returns matched cooking steps and recipes based on the ingredients' recipe tags.

**Request Body:**

```json
{
  "ingredientIds": [370, 1],
  "ingredientNames": ["rice", "onion"]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `ingredientIds` | number[] | No | Ingredient IDs (at least one of `ingredientIds` or `ingredientNames` required) |
| `ingredientNames` | string[] | No | Ingredient names (at least one of `ingredientIds` or `ingredientNames` required) |

**Response:**

```json
{
  "ingredients": [{ "id": 370, "name": "tomato" }, { "id": 1, "name": "acorn squash" }],
  "recipeTags": ["Boil", "Aromatics"],
  "cookingSteps": [
    {
      "module": "Rice",
      "fullTextEn": "Rinse rice under cold water...",
      "shortcutEn": "Rinse, boil 12 min, rest 5 min",
      "shortcutDa": null,
      "fromTags": ["Boil"]
    }
  ],
  "matchedRecipes": [
    {
      "recipeName": "Rice Bowl",
      "fullRecipeEn": "Cook rice according to..."
    }
  ]
}
```

---

## Cooking Components

### GET /api/cooking-components

Direct access to 71 reusable cooking instruction modules and 60 composed recipe notes.

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `module` | string | Filter by module name (e.g., `Sofrito`, `Rice`) |
| `type` | string | `components`, `recipes`, or `all` (default `all`) |

**Example:** `GET /api/cooking-components?module=Sofrito&type=components`

**Response (type=all):**

```json
{
  "cookingComponents": [
    {
      "module": "Sofrito",
      "fullTextEn": "Heat oil in a pan...",
      "shortcutEn": "Sautee onion, garlic, tomato",
      "shortcutDa": null
    }
  ],
  "recipeNotes": [
    {
      "recipeName": "Sofrito Base",
      "fullRecipeEn": "A classic sofrito forms..."
    }
  ],
  "tagToModules": {
    "Sofrito": ["Sofrito"],
    "Boil": ["Rice", "Pasta", "Boil"],
    ...
  }
}
```

---

## Error Handling

All errors return JSON with an `error` field:

```json
{ "error": "Invalid or missing segment. Valid: Sour, Umami, Oil, ..." }
```

| Status | Meaning |
|---|---|
| 400 | Bad request (missing/invalid parameters) |
| 404 | Resource not found (ingredient, icon) |

---

## CORS

All responses include:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

Every endpoint supports `OPTIONS` preflight with a `204 No Content` response.

---

## Caching

| Route Type | Cache-Control |
|---|---|
| GET endpoints | `public, s-maxage=3600, stale-while-revalidate=86400` |
| Icon endpoint | `public, max-age=31536000, immutable` |
| POST endpoints | No caching |

Data is static (pre-generated at build time from CSV), so aggressive caching is safe.

---

## Rate Limits

Vercel free tier: 100K serverless invocations/month. No per-endpoint rate limiting is applied.
