# Lovable Prompt: Gastrowheel Frontend

## What we're building

An interactive cooking companion where users build dishes by combining ingredients from 10 flavor categories. The backend API is live at `https://gastrowheel.vercel.app` with full CORS support. The app has **two tabs**:

1. **Foodpairing Waterfall** — a column-based explorer where all 10 flavor categories are visible at once
2. **Gastrowheel** — a guided wheel experience where users walk through one flavor category at a time

Both tabs share the same selection state: ingredients picked in one tab appear in the other.

---

## REST API Reference

Base URL: `https://gastrowheel.vercel.app`

### Bootstrap (call once on app load)

**`GET /api/filters`** — All valid enum values for filters (dietary, seasons, regions, etc.)

**`GET /api/wheel/structure`** — Wheel metadata including:
- `segments`: `["Sour", "Umami", "Oil", "Crunch", "Sweet", "Aroma", "Fresh", "Base", "Bitter", "Spicy"]`
- `walkOrder`: `["Base", "Fresh", "Aroma", "Oil", "Umami", "Sour", "Sweet", "Crunch"]` (suggested 8-step guided walk)
- `segmentColors`: object mapping each segment to `{ bg, text, accent }` hex colors
- `stats`: total counts (827 ingredients, 590 dishes, 407 icons)

### Ingredient Data

**`GET /api/ingredients/by-segment?segment=Base`** — All ingredients in a segment. Supports optional filters: `dietary=Vegan,NutFree`, `season=Summer`, `region=Mediterranean`, `cookingStyle=FastAndFresh`, `commonality=common`

**`GET /api/ingredients/search?query=tomato`** — Free-text + structured filter search. Optional params: `segment`, `taste`, `aroma`, `dietary`, `season`, `region`, `role`, `roleCategory`, `limit`

**`GET /api/ingredients/{id}`** — Single ingredient by numeric ID or name (e.g., `/api/ingredients/370` or `/api/ingredients/tomato`)

**`GET /api/ingredients/{id}/icon`** — SVG icon as `image/svg+xml`. Returns 404 if no icon exists. Use `hasIcon` field to check before requesting.

### Pairing Engine

**`POST /api/pairing-suggestions`** — The core pairing endpoint. Scores candidates by aroma overlap (35%), taste balance (30%), region affinity (15%), role diversity (10%), season match (5%), and commonality (5%).

```json
{
  "selectedIds": [370, 1],
  "targetSegment": "Fresh",
  "limit": 10,
  "dietary": ["Vegan"],
  "season": "Summer"
}
```
- `targetSegment` is optional — omit it for free pairing across ALL segments (returns up to 80 results)
- Response includes `suggestions[].totalScore` (0–1) and `suggestions[].breakdown` per factor

### Dish Matching

**`POST /api/suggest-dishes`** — Fuzzy-matches selected ingredients against 590 dish descriptions.

```json
{
  "ingredientNames": ["rice", "tomato", "onion"],
  "wheelSegments": ["Base", "Sour", "Aroma"],
  "limit": 10
}
```
- Response includes `dishes[].dishName`, `dishes[].description`, `dishes[].quality` ("strong"/"good"/"partial"), `dishes[].matchedIngredients`

### Cooking Guide

**`POST /api/cooking-guide`** — Given selected ingredients, returns matched cooking steps and recipes.

```json
{ "ingredientNames": ["rice", "onion"] }
```

### Cooking Components

**`GET /api/cooking-components`** — All 71 cooking instruction modules. Optional: `?module=Sofrito&type=components`

---

## Ingredient Object Shape

Every ingredient from the API looks like this:

```typescript
{
  id: number;
  iconId: number;
  name: string;
  roles: string[];           // e.g. ["Protein", "Fibres"]
  roleCategory: string;      // "Bulk" | "Boost" | "Top" | "Splash"
  dietary: string[];         // e.g. ["Glutenfree", "Vegan"]
  tastes: string[];          // e.g. ["Umami", "Salty"]
  aromas: string[];          // e.g. ["MEATY", "SMOKEY"]
  seasons: string[];         // e.g. ["Fall", "Winter"]
  regions: string[];         // e.g. ["Mediterranean", "European"]
  cookingStyles: string[];   // e.g. ["SlowAndDeep"]
  recipeTags: string[];      // e.g. ["Sofrito", "Boil"]
  wheelSegments: string[];   // e.g. ["Sour", "Umami", "Fresh"] — can be multiple!
  commonIn: string[];        // e.g. ["en", "da"]
  hasIcon: boolean;
}
```

---

## Tab 1: Foodpairing Waterfall

### Layout

A horizontal scrollable view with **10 columns**, one per wheel segment. Each column is color-coded using `segmentColors` from the wheel/structure endpoint.

Column order (left to right): **Base → Fresh → Aroma → Oil → Umami → Sour → Sweet → Crunch → Bitter → Spicy** (this is the `walkOrder` + the remaining 2 segments Bitter and Spicy appended).

### Column Content

Each column shows ingredient cards stacked vertically, sorted by **pairing score** (highest first).

- **Before any selection**: Show all ingredients in each segment, sorted alphabetically. Show the column header with segment name, color, and ingredient count.
- **After 1+ selections**: Re-fetch pairing suggestions with `POST /api/pairing-suggestions` using `selectedIds` of all picked ingredients and NO `targetSegment` (free mode). This returns up to 80 top pairings across all segments. Distribute the results into their respective segment columns. Ingredients not in the pairing results should appear below, grayed out or dimmed, still grouped by segment.

### Ingredient Cards

Each card shows:
- **Icon** (from `/api/ingredients/{id}/icon`) or a **letter fallback** (first letter of name in a colored circle) if `hasIcon` is false
- **Name**
- **Pairing score bar** (only visible after selections exist) — a thin horizontal bar showing `totalScore` as a percentage (0–100%)
- **Role badge** — small pill showing the `roleCategory` (Bulk/Boost/Top/Splash)
- **Click to select/deselect** — selected cards get a colored border matching their segment accent color and a checkmark

### Selected Ingredients Bar

A sticky bar at the top (below the tab navigation) showing all selected ingredients as small chips/pills. Each chip shows the icon + name + an X to remove. The bar also shows:
- A **"Suggest Dishes"** button that calls `POST /api/suggest-dishes` and opens a slide-over panel with results
- A **"Clear All"** button

### Filters

A collapsible filter bar above the columns with:
- Dietary toggles (Vegan, Glutenfree, etc.)
- Season selector
- Region selector
- Search input (filters ingredient names within all columns)

Filters are applied client-side on the already-loaded data AND passed to the pairing-suggestions API call.

---

## Tab 2: Gastrowheel

### Layout

A centered circular wheel (SVG or canvas) with 10 segments, plus a side panel showing ingredients for the active segment.

### The Wheel

- 10 equal arc segments arranged clockwise: Sour, Umami, Oil, Crunch, Sweet, Aroma, Fresh, Base, Bitter, Spicy
- Each segment colored with its `segmentColors.bg` / `segmentColors.accent`
- The **active segment** is highlighted (larger, brighter, or pulled out slightly)
- Segments that already have a selected ingredient show a **filled dot or checkmark**
- Clicking a segment makes it active and loads its ingredients in the side panel

### Guided Walk

Above the wheel, show a **step indicator** showing progress through the 8-step `walkOrder`: Base → Fresh → Aroma → Oil → Umami → Sour → Sweet → Crunch.

- The current step is highlighted
- Completed steps show the selected ingredient name
- "Next" and "Back" buttons advance through the walk
- Users can also click any segment directly to jump there (breaking the guided order is fine)

### Ingredient Panel

When a segment is active, the right side (or bottom on mobile) shows ingredients for that segment, fetched via `GET /api/ingredients/by-segment?segment={active}` initially, then ranked by `POST /api/pairing-suggestions` once 1+ ingredients are selected.

Each ingredient card shows:
- Icon or letter fallback
- Name
- Pairing score (after 1+ selections) with a visual indicator
- Taste and aroma tags as small pills
- Click to select (becomes the chosen ingredient for this segment)

Only **one ingredient per segment** in guided mode. Selecting a new one in the same segment replaces the previous choice.

### Dish Suggestions

Once 3+ ingredients are selected, automatically call `POST /api/suggest-dishes` and show a "Dish Ideas" section below the wheel or in a collapsible panel. Show the top 5 matches with dish name, description, quality badge, and matched ingredients highlighted.

### Cooking Guide

When the user clicks on a dish suggestion (or a dedicated "How to Cook" button), call `POST /api/cooking-guide` with the selected ingredient names. Show the returned cooking steps and matched recipes in a modal or slide-over panel.

---

## Design Direction

- **Warm, appetizing palette**: cream backgrounds (`#FAF9F6`), coral accents (`#D97757`), each segment has its own color from the API
- **Typography**: clean sans-serif (Inter or similar), segment names in a slightly heavier weight
- **Feel**: friendly, approachable, like a cooking companion — not a database browser
- **Cards**: rounded corners, subtle shadows, ingredient icons at ~40px
- **Animations**: smooth transitions when re-ranking ingredients after a selection, gentle highlight when a new pairing appears at the top
- **Mobile**: Tab 1 (Waterfall) becomes horizontally scrollable with snap-to-column. Tab 2 (Wheel) stacks the wheel above the ingredient panel.
- **Empty states**: Before any selection, show an encouraging message like "Pick your first ingredient to start building flavor"

---

## Authentication

All API requests require an `x-api-key` header. Include it on every fetch call:

```typescript
const API_BASE = "https://gastrowheel.vercel.app";
const API_KEY = "346b20b485d4b7eb4973da7e593801743c870822fe5273730d96211de752e4f9";

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}
```

Without the header, the API returns `401 Unauthorized`. Rate limiting is also enforced (60 req/min per IP).

---

## Technical Notes

- All API responses are JSON with `Access-Control-Allow-Origin: *`
- **Authentication**: Every request needs `x-api-key` header (see above)
- **Rate limiting**: 60 requests/minute per IP. Check `X-RateLimit-Remaining` header. On 429, respect the `Retry-After` header.
- GET endpoints are CDN-cached (1hr). POST endpoints are not cached.
- Icons are served as SVG — use `<img src="https://gastrowheel.vercel.app/api/ingredients/{id}/icon">` or fetch and inline as SVG for styling
- Some ingredients belong to **multiple segments** (e.g., tomato → Sour + Umami + Fresh). They'll appear in each relevant column/segment.
- Dish fields can be null (`dishName`, `description`) — always null-check before rendering
- Max 100 items in any POST array (enforced server-side)
