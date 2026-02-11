import {
  ingredients,
  ingredientById,
} from "@gastrowheel/data/generated/ingredients";
import {
  dishDescriptions,
  dishNotes,
  cookingComponents,
  recipeNotes,
} from "@gastrowheel/data/generated/dishes";
import {
  getPairingSuggestions,
  applyFilters,
  WHEEL_SEGMENTS,
  WALK_ORDER,
  SEGMENT_COLORS,
  PAIRING_WEIGHTS,
  ROLE_CATEGORIES,
  DISH_ROLES,
  DIETARY_FLAGS,
  SEASONS,
  REGIONS,
  TASTE_TAGS,
  AROMA_TAGS,
  COOKING_STYLES,
  RECIPE_TAGS,
  MARKET_CODES,
  CONTENT_LANGUAGES,
  TAG_TO_MODULES,
  type Ingredient,
  type WheelSegment,
  type DietaryFlag,
  type Season,
  type Region,
  type CookingStyle,
  type RecipeTag,
  type IngredientFilters,
  type PairingScore,
  type ContentLanguage,
  type DishDescription,
  type DishNote,
  type RoleCategory,
} from "@gastrowheel/data";

// ---------------------------------------------------------------------------
// Re-exports for route handlers
// ---------------------------------------------------------------------------

export {
  ingredients,
  ingredientById,
  dishDescriptions,
  dishNotes,
  cookingComponents,
  recipeNotes,
  getPairingSuggestions,
  applyFilters,
  WHEEL_SEGMENTS,
  WALK_ORDER,
  SEGMENT_COLORS,
  PAIRING_WEIGHTS,
  ROLE_CATEGORIES,
  DISH_ROLES,
  DIETARY_FLAGS,
  SEASONS,
  REGIONS,
  TASTE_TAGS,
  AROMA_TAGS,
  COOKING_STYLES,
  RECIPE_TAGS,
  MARKET_CODES,
  CONTENT_LANGUAGES,
  TAG_TO_MODULES,
  type Ingredient,
  type WheelSegment,
  type DietaryFlag,
  type Season,
  type Region,
  type CookingStyle,
  type RecipeTag,
  type IngredientFilters,
  type PairingScore,
  type ContentLanguage,
  type DishDescription,
  type DishNote,
  type RoleCategory,
};

// ---------------------------------------------------------------------------
// CORS + Cache headers
// ---------------------------------------------------------------------------

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const cacheHeaders: Record<string, string> = {
  "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
};

/** OPTIONS preflight handler — re-export from every route file */
export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// ---------------------------------------------------------------------------
// JSON response helpers
// ---------------------------------------------------------------------------

export function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { ...corsHeaders, ...cacheHeaders },
  });
}

export function jsonError(message: string, status = 400): Response {
  return Response.json(
    { error: message },
    { status, headers: corsHeaders },
  );
}

/** Parse a JSON request body, returning either the parsed data or an error Response */
export async function parseJsonBody(
  request: Request,
): Promise<Record<string, unknown> | Response> {
  try {
    return await request.json();
  } catch {
    return jsonError("Invalid JSON body");
  }
}

// ---------------------------------------------------------------------------
// Shared logic (ported from MCP server — avoids importing @modelcontextprotocol/sdk)
// ---------------------------------------------------------------------------

/** Serialize an Ingredient to a plain JSON-safe object */
export function serializeIngredient(ing: Ingredient) {
  return {
    id: ing.id,
    iconId: ing.iconId,
    name: ing.name,
    roles: ing.roles,
    roleCategory: ing.roleCategory,
    dietary: ing.dietary,
    tastes: ing.tastes,
    aromas: ing.aromas,
    seasons: ing.seasons,
    regions: ing.regions,
    cookingStyles: ing.cookingStyles,
    recipeTags: ing.recipeTags,
    wheelSegments: ing.wheelSegments,
    commonIn: ing.commonIn,
    hasIcon: ing.hasIcon,
  };
}

/** Serialize a PairingScore result */
export function serializePairingScore(ps: PairingScore) {
  return {
    ingredient: serializeIngredient(ps.ingredient),
    totalScore: Math.round(ps.totalScore * 1000) / 1000,
    breakdown: ps.breakdown,
  };
}

/** Build an IngredientFilters object from raw query/body params */
export function buildFilters(params: {
  dietary?: string[];
  season?: string;
  region?: string;
  cookingStyle?: string;
  recipeTags?: string[];
  query?: string;
  commonality?: string;
}): IngredientFilters {
  const filters: IngredientFilters = {};
  if (params.dietary?.length) {
    filters.dietary = params.dietary.filter(
      (d): d is DietaryFlag => (DIETARY_FLAGS as readonly string[]).includes(d),
    );
  }
  if (params.season && (SEASONS as readonly string[]).includes(params.season)) {
    filters.seasons = [params.season as Season];
  }
  if (params.region && (REGIONS as readonly string[]).includes(params.region)) {
    filters.regions = [params.region as Region];
  }
  if (params.cookingStyle && (COOKING_STYLES as readonly string[]).includes(params.cookingStyle)) {
    filters.cookingStyles = [params.cookingStyle as CookingStyle];
  }
  if (params.query) {
    filters.searchQuery = params.query;
  }
  if (params.commonality && ["all", "common", "exotic"].includes(params.commonality)) {
    filters.commonality = params.commonality as IngredientFilters["commonality"];
  }
  return filters;
}

/** Resolve an ingredient by numeric id or string name */
export function resolveIngredient(idOrName: number | string): Ingredient | undefined {
  if (typeof idOrName === "number") {
    return ingredientById.get(idOrName);
  }
  const lower = idOrName.toLowerCase();
  return ingredients.find((i) => i.name.toLowerCase() === lower);
}

// ---------------------------------------------------------------------------
// Dish scoring (ported from MCP server)
// ---------------------------------------------------------------------------

const SWEET_KEYWORDS = [
  "cake", "dessert", "candy", "jam", "cookie", "pudding",
  "pie", "tart", "chocolate", "ice cream", "sorbet", "compote", "marmalade",
  "muffin", "brownie", "pastry", "sweet",
];

/** Fuzzy-match ingredient names against dish text with stemming & prefix matching */
export function scoreDish(
  dish: DishDescription,
  ingredientNames: string[],
): { matchCount: number; matchedIngredients: string[] } {
  const dishText = [dish.dishName ?? "", dish.descriptions.en ?? ""]
    .join(" ")
    .toLowerCase();

  const matched: string[] = [];

  for (const name of ingredientNames) {
    const lower = name.toLowerCase();
    if (dishText.includes(lower)) {
      matched.push(name);
      continue;
    }
    if (lower.length >= 4) {
      const stem = lower.replace(/(s|es|ies)$/, "");
      if (stem.length >= 3 && dishText.includes(stem)) {
        matched.push(name);
        continue;
      }
    }
    const words = dishText.split(/\s+/);
    if (words.some((w) => w.startsWith(lower) || lower.startsWith(w))) {
      matched.push(name);
    }
  }

  return { matchCount: matched.length, matchedIngredients: matched };
}

/** Check if a dish is sweet/dessert based on keyword heuristic */
export function isSweetDish(dish: DishDescription): boolean {
  const text = [dish.dishName ?? "", dish.descriptions.en ?? ""].join(" ").toLowerCase();
  return SWEET_KEYWORDS.some((kw) => text.includes(kw));
}

/** Quality label based on match count vs total ingredients */
export function qualityLabel(
  matchCount: number,
  totalIngredients: number,
): "strong" | "good" | "partial" {
  const ratio = matchCount / totalIngredients;
  if (ratio >= 0.5 || matchCount >= 3) return "strong";
  if (matchCount >= 2) return "good";
  return "partial";
}

// ---------------------------------------------------------------------------
// Query param parsing helpers
// ---------------------------------------------------------------------------

/** Parse comma-separated string into array, or return undefined if empty */
export function parseCommaSeparated(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const parts = value.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length > 0 ? parts : undefined;
}
