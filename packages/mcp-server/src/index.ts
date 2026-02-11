#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

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
} from "@gastrowheel/data";
import type {
  Ingredient,
  WheelSegment,
  DietaryFlag,
  Season,
  Region,
  CookingStyle,
  RecipeTag,
  IngredientFilters,
  PairingScore,
  ContentLanguage,
  DishDescription,
  DishNote,
  RoleCategory,
} from "@gastrowheel/data";

// ---------------------------------------------------------------------------
// Path resolution for Icons
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Icons are at project root: Gastrowheel/Icons/{id}.svg
// From packages/mcp-server/src/ that's ../../../Icons
const ICONS_DIR = resolve(__dirname, "..", "..", "..", "Icons");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if a value exists in a readonly string array (type-safe enum validation). */
function isValidEnum(arr: readonly string[], value: string): boolean {
  return arr.includes(value);
}

/** Build a JSON text response for MCP tool results. */
function jsonResponse(data: unknown): { content: { type: "text"; text: string }[] } {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

/** Build an error response for MCP tool results. */
function errorResponse(message: string): { isError: true; content: { type: "text"; text: string }[] } {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

/** Serialize an Ingredient to a plain JSON-safe object (full shape). */
export function serializeIngredient(ing: Ingredient) {
  const { id, iconId, name, roles, roleCategory, dietary, tastes, aromas, seasons, regions, cookingStyles, recipeTags, wheelSegments, commonIn, hasIcon } = ing;
  return { id, iconId, name, roles, roleCategory, dietary, tastes, aromas, seasons, regions, cookingStyles, recipeTags, wheelSegments, commonIn, hasIcon };
}

/** Serialize a PairingScore result. */
export function serializePairingScore(ps: PairingScore) {
  return {
    ingredient: serializeIngredient(ps.ingredient),
    totalScore: Math.round(ps.totalScore * 1000) / 1000,
    breakdown: ps.breakdown,
  };
}

/** Build an IngredientFilters object from optional raw params. */
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
    filters.dietary = params.dietary.filter((d): d is DietaryFlag =>
      isValidEnum(DIETARY_FLAGS, d),
    );
  }
  if (params.season && isValidEnum(SEASONS, params.season)) {
    filters.seasons = [params.season as Season];
  }
  if (params.region && isValidEnum(REGIONS, params.region)) {
    filters.regions = [params.region as Region];
  }
  if (params.cookingStyle && isValidEnum(COOKING_STYLES, params.cookingStyle)) {
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

/** Resolve an ingredient by numeric id or string name. */
export function resolveIngredient(idOrName: number | string): Ingredient | undefined {
  if (typeof idOrName === "number") {
    return ingredientById.get(idOrName);
  }
  const lower = idOrName.toLowerCase();
  return ingredients.find((i) => i.name.toLowerCase() === lower);
}

// ---------------------------------------------------------------------------
// Dish scoring (ported from dish-suggestions.tsx)
// ---------------------------------------------------------------------------

const SWEET_KEYWORDS = [
  "cake", "dessert", "candy", "jam", "cookie", "pudding",
  "pie", "tart", "chocolate", "ice cream", "sorbet", "compote", "marmalade",
  "muffin", "brownie", "pastry", "sweet",
];

/** Fuzzy-match ingredient names against dish text with stemming & prefix matching. */
export function scoreDish(
  dish: DishDescription,
  ingredientNames: string[],
): { matchCount: number; matchedIngredients: string[] } {
  const dishText = [
    dish.dishName ?? "",
    dish.descriptions.en ?? "",
  ]
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
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  // Tool 1: get_ingredients_by_segment
  {
    name: "get_ingredients_by_segment",
    description:
      "Get all ingredients assigned to a Gastrowheel segment. " +
      "Optionally filter by dietary requirements, season, region, cooking style, or recipe tags.",
    inputSchema: {
      type: "object" as const,
      properties: {
        segment: {
          type: "string",
          enum: WHEEL_SEGMENTS,
          description: "Wheel segment name",
        },
        dietary: {
          type: "array",
          items: { type: "string", enum: DIETARY_FLAGS },
          description: "Dietary flags to require (all must match)",
        },
        season: {
          type: "string",
          enum: SEASONS,
          description: "Filter to ingredients available in this season",
        },
        region: {
          type: "string",
          enum: REGIONS,
          description: "Filter to ingredients from this cuisine region",
        },
        cookingStyle: {
          type: "string",
          enum: COOKING_STYLES,
          description: "Filter by cooking style",
        },
        recipeTags: {
          type: "array",
          items: { type: "string", enum: RECIPE_TAGS },
          description: "Filter to ingredients with these recipe tags (any match)",
        },
        commonality: {
          type: "string",
          enum: ["all", "common", "exotic"],
          description: "Filter by commonality: 'common' = available in at least one market, 'exotic' = not common in any market, 'all' = no filter",
        },
      },
      required: ["segment"],
    },
  },
  // Tool 2: get_ingredient_details
  {
    name: "get_ingredient_details",
    description:
      "Get full details for a single ingredient by its numeric ID or exact name.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "number",
          description: "Ingredient ID (numeric)",
        },
        name: {
          type: "string",
          description: "Ingredient name (case-insensitive exact match)",
        },
      },
      required: [],
    },
  },
  // Tool 3: get_pairing_suggestions
  {
    name: "get_pairing_suggestions",
    description:
      "Get ranked pairing suggestions based on already-selected ingredient IDs. " +
      "Uses the Gastrowheel pairing engine which scores aroma overlap, taste balance, " +
      "region affinity, season match, role diversity, and commonality. " +
      "If targetSegment is omitted, returns pairings from ALL segments (free pairing mode).",
    inputSchema: {
      type: "object" as const,
      properties: {
        selectedIds: {
          type: "array",
          items: { type: "number" },
          description: "IDs of already-selected ingredients",
        },
        targetSegment: {
          type: "string",
          enum: WHEEL_SEGMENTS,
          description: "Target wheel segment to find pairings for. Omit for free pairing across all segments.",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default 10 for segment mode, 80 for free mode)",
        },
        dietary: {
          type: "array",
          items: { type: "string", enum: DIETARY_FLAGS },
          description: "Dietary flags to require",
        },
        season: {
          type: "string",
          enum: SEASONS,
          description: "Filter to this season",
        },
        region: {
          type: "string",
          enum: REGIONS,
          description: "Filter to this region",
        },
        cookingStyle: {
          type: "string",
          enum: COOKING_STYLES,
          description: "Filter by cooking style",
        },
        commonality: {
          type: "string",
          enum: ["all", "common", "exotic"],
          description: "Filter by commonality",
        },
      },
      required: ["selectedIds"],
    },
  },
  // Tool 4: suggest_dishes
  {
    name: "suggest_dishes",
    description:
      "Match selected ingredients against the dish description database using fuzzy scoring. " +
      "Returns ranked dish suggestions with stemming, sweet-dish penalty, segment diversity bonus, " +
      "and deduplication by dish name. Supports multiple languages for descriptions.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ingredientNames: {
          type: "array",
          items: { type: "string" },
          description: "Names of selected ingredients to match against dishes",
        },
        wheelSegments: {
          type: "array",
          items: { type: "string", enum: WHEEL_SEGMENTS },
          description: "Wheel segments the ingredients were selected from (enables segment diversity bonus). Should match ingredientNames 1:1.",
        },
        hasSweetIngredient: {
          type: "boolean",
          description: "Whether any selected ingredient is from the Sweet segment (used for savory bias). Defaults to false.",
        },
        language: {
          type: "string",
          enum: CONTENT_LANGUAGES,
          description: "Language for dish descriptions (default 'en')",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default 15)",
        },
      },
      required: ["ingredientNames"],
    },
  },
  // Tool 5: search_ingredients
  {
    name: "search_ingredients",
    description:
      "Search ingredients by name, taste, aroma, or other properties. " +
      "Combine a free-text query with optional structured filters. " +
      "Query is optional — omit it for pure filter-based searches.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Free-text search query (matched against ingredient name). Optional.",
        },
        segment: {
          type: "string",
          enum: WHEEL_SEGMENTS,
          description: "Only return ingredients in this wheel segment",
        },
        taste: {
          type: "string",
          enum: TASTE_TAGS,
          description: "Filter by taste tag",
        },
        aroma: {
          type: "string",
          enum: AROMA_TAGS,
          description: "Filter by aroma tag",
        },
        dietary: {
          type: "array",
          items: { type: "string", enum: DIETARY_FLAGS },
          description: "Dietary flags to require",
        },
        season: {
          type: "string",
          enum: SEASONS,
          description: "Filter to this season",
        },
        region: {
          type: "string",
          enum: REGIONS,
          description: "Filter to this region",
        },
        cookingStyle: {
          type: "string",
          enum: COOKING_STYLES,
          description: "Filter by cooking style",
        },
        recipeTags: {
          type: "array",
          items: { type: "string", enum: RECIPE_TAGS },
          description: "Filter to ingredients with these recipe tags (any match)",
        },
        role: {
          type: "string",
          enum: DISH_ROLES,
          description: "Filter by specific dish role (e.g. 'Protein', 'Herbs')",
        },
        roleCategory: {
          type: "string",
          enum: ["Bulk", "Boost", "Top", "Splash"],
          description: "Filter by role category",
        },
        commonality: {
          type: "string",
          enum: ["all", "common", "exotic"],
          description: "Filter by commonality",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default 50)",
        },
      },
      required: [],
    },
  },
  // Tool 6: get_cooking_guide
  {
    name: "get_cooking_guide",
    description:
      "Given selected ingredients, return matched cooking steps and recipes. " +
      "Collects recipe tags from the ingredients, maps them to cooking component modules, " +
      "and finds matching recipe notes.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ingredientIds: {
          type: "array",
          items: { type: "number" },
          description: "Ingredient IDs to get cooking guide for",
        },
        ingredientNames: {
          type: "array",
          items: { type: "string" },
          description: "Ingredient names to get cooking guide for",
        },
      },
      required: [],
    },
  },
  // Tool 7: get_wheel_structure
  {
    name: "get_wheel_structure",
    description:
      "Discovery tool — returns the Gastrowheel structural constants for building UIs. " +
      "Includes segments, walk order, colors, pairing weights, role categories, and stats.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  // Tool 8: list_filter_options
  {
    name: "list_filter_options",
    description:
      "Returns all valid enum values for every filter parameter. " +
      "Essential for LLM consumers to know what values they can pass to other tools.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  // Tool 9: get_cooking_components
  {
    name: "get_cooking_components",
    description:
      "Direct access to cooking components (71 reusable instruction modules) and recipe notes (60 composed recipes). " +
      "Optionally filter by module name or type.",
    inputSchema: {
      type: "object" as const,
      properties: {
        module: {
          type: "string",
          description: "Filter to a specific module name (e.g. 'Sofrito', 'Rice')",
        },
        type: {
          type: "string",
          enum: ["components", "recipes", "all"],
          description: "What to return: 'components', 'recipes', or 'all' (default 'all')",
        },
      },
      required: [],
    },
  },
  // Tool 10: get_ingredient_icon
  {
    name: "get_ingredient_icon",
    description:
      "Returns the SVG icon content for an ingredient. " +
      "342 of 827 ingredients have SVG icons. Returns null for those without.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "number",
          description: "Ingredient ID",
        },
      },
      required: ["id"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

export function handleGetIngredientsBySegment(params: Record<string, unknown>) {
  const segment = params.segment as WheelSegment;
  if (!isValidEnum(WHEEL_SEGMENTS, segment)) {
    return errorResponse(`Invalid segment: ${segment}. Valid: ${WHEEL_SEGMENTS.join(", ")}`);
  }

  let result = ingredients.filter((i) => i.wheelSegments.includes(segment));

  const filters = buildFilters(params as Parameters<typeof buildFilters>[0]);
  if (Object.keys(filters).length > 0) {
    result = applyFilters(result, filters);
  }

  const recipeTags = params.recipeTags as string[] | undefined;
  if (recipeTags?.length) {
    result = result.filter((ing) =>
      recipeTags.some((t) => (ing.recipeTags as string[]).includes(t)),
    );
  }

  return jsonResponse({
    segment,
    count: result.length,
    ingredients: result.map(serializeIngredient),
  });
}

export function handleGetIngredientDetails(params: Record<string, unknown>) {
  const id = params.id as number | undefined;
  const name = params.name as string | undefined;

  if (id == null && name == null) {
    return errorResponse("Either 'id' or 'name' must be provided.");
  }

  const ing = resolveIngredient(id ?? name!);
  if (!ing) {
    return errorResponse(`Ingredient not found: ${id ?? name}`);
  }

  return jsonResponse(serializeIngredient(ing));
}

export function handleGetPairingSuggestions(params: Record<string, unknown>) {
  const selectedIds = params.selectedIds as number[];
  const targetSegment = (params.targetSegment as WheelSegment | undefined) ?? null;
  const isFreeMode = targetSegment === null;
  const limit = (params.limit as number | undefined) ?? (isFreeMode ? 80 : 10);

  if (targetSegment !== null && !isValidEnum(WHEEL_SEGMENTS, targetSegment)) {
    return errorResponse(`Invalid segment: ${targetSegment}. Valid: ${WHEEL_SEGMENTS.join(", ")}`);
  }

  const selected: Ingredient[] = [];
  for (const id of selectedIds) {
    const ing = ingredientById.get(id);
    if (!ing) {
      return errorResponse(`Ingredient ID not found: ${id}`);
    }
    selected.push(ing);
  }

  const filters = buildFilters(params as Parameters<typeof buildFilters>[0]);
  const suggestions = getPairingSuggestions(
    ingredients,
    selected,
    targetSegment,
    Object.keys(filters).length > 0 ? filters : undefined,
    limit,
  );

  return jsonResponse({
    targetSegment: targetSegment ?? "all (free pairing)",
    selectedIngredients: selected.map((s) => ({ id: s.id, name: s.name })),
    count: suggestions.length,
    suggestions: suggestions.map(serializePairingScore),
  });
}

export function handleSuggestDishes(params: Record<string, unknown>) {
  const ingredientNames = params.ingredientNames as string[];
  if (!ingredientNames?.length) {
    return errorResponse("ingredientNames must be a non-empty array.");
  }

  const wheelSegments = (params.wheelSegments as WheelSegment[] | undefined) ?? [];
  const hasSweetIngredient = (params.hasSweetIngredient as boolean | undefined) ?? false;
  const language = ((params.language as string | undefined) ?? "en") as ContentLanguage;
  const limit = (params.limit as number | undefined) ?? 15;

  interface ScoredDish {
    dish: DishDescription;
    note: DishNote | undefined;
    score: number;
    matchCount: number;
    matchedIngredients: string[];
    quality: "strong" | "good" | "partial";
  }

  const results: ScoredDish[] = [];

  for (const dish of dishDescriptions) {
    if (!dish.dishName || !dish.descriptions.en) continue;

    const { matchCount, matchedIngredients } = scoreDish(dish, ingredientNames);
    if (matchCount === 0) continue;

    let adjustedScore = matchCount;

    // Savory bias: penalize sweet/dessert dishes when no Sweet-segment ingredient selected
    if (!hasSweetIngredient && isSweetDish(dish)) {
      adjustedScore = Math.max(0, matchCount - 1);
    }

    // Segment diversity bonus when segment info provided
    if (wheelSegments.length > 0) {
      const matchedSegments = new Set<WheelSegment>();
      for (const name of matchedIngredients) {
        const idx = ingredientNames.indexOf(name);
        if (idx !== -1 && idx < wheelSegments.length) {
          matchedSegments.add(wheelSegments[idx]);
        }
      }
      if (matchedSegments.size >= 3) adjustedScore += 0.5;
      if (matchedSegments.size >= 5) adjustedScore += 0.5;
    }

    if (adjustedScore > 0) {
      const quality = qualityLabel(matchCount, ingredientNames.length);
      const note = dishNotes.find((n) => n.dishPk === dish.dishPk);
      results.push({ dish, note, score: adjustedScore, matchCount, matchedIngredients, quality });
    }
  }

  // Sort by adjusted score descending, then by quality
  const qualityOrder = { strong: 0, good: 1, partial: 2 };
  results.sort(
    (a, b) =>
      b.score - a.score || qualityOrder[a.quality] - qualityOrder[b.quality],
  );

  // Deduplicate by dishName (keep highest scoring)
  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    const key = r.dish.dishName!.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const sliced = deduped.slice(0, limit);

  return jsonResponse({
    query: ingredientNames,
    matchCount: sliced.length,
    dishes: sliced.map((item) => ({
      dishName: item.dish.dishName,
      dishPk: item.dish.dishPk,
      description: item.dish.descriptions[language] ?? item.dish.descriptions.en ?? null,
      note: item.note?.notes?.[language] ?? item.note?.notes?.en ?? null,
      score: Math.round(item.score * 1000) / 1000,
      matchCount: item.matchCount,
      matchedIngredients: item.matchedIngredients,
      quality: item.quality,
    })),
  });
}

export function handleSearchIngredients(params: Record<string, unknown>) {
  const query = (params.query as string | undefined) ?? "";
  const limit = (params.limit as number | undefined) ?? 50;
  const segment = params.segment as WheelSegment | undefined;
  const taste = params.taste as string | undefined;
  const aroma = params.aroma as string | undefined;
  const role = params.role as string | undefined;
  const roleCategory = params.roleCategory as RoleCategory | undefined;
  const recipeTags = params.recipeTags as string[] | undefined;

  let result = [...ingredients];

  if (query) {
    const lower = query.toLowerCase();
    result = result.filter((i) => i.name.toLowerCase().includes(lower));
  }

  if (segment && isValidEnum(WHEEL_SEGMENTS, segment)) {
    result = result.filter((i) => i.wheelSegments.includes(segment));
  }

  if (taste) {
    const lowerTaste = taste.toLowerCase();
    result = result.filter((i) =>
      i.tastes.some((t) => t.toLowerCase() === lowerTaste),
    );
  }

  if (aroma) {
    const lowerAroma = aroma.toLowerCase();
    result = result.filter((i) =>
      i.aromas.some((a) => a.toLowerCase() === lowerAroma),
    );
  }

  if (role) {
    result = result.filter((i) => (i.roles as string[]).includes(role));
  }

  if (roleCategory) {
    result = result.filter((i) => i.roleCategory === roleCategory);
  }

  if (recipeTags?.length) {
    result = result.filter((ing) =>
      recipeTags.some((t) => (ing.recipeTags as string[]).includes(t)),
    );
  }

  const filters = buildFilters(params as Parameters<typeof buildFilters>[0]);
  if (Object.keys(filters).length > 0) {
    result = applyFilters(result, filters);
  }

  const sliced = result.slice(0, limit);

  return jsonResponse({
    query: query || null,
    totalMatches: result.length,
    returned: sliced.length,
    ingredients: sliced.map(serializeIngredient),
  });
}

export function handleGetCookingGuide(params: Record<string, unknown>) {
  const ingredientIds = params.ingredientIds as number[] | undefined;
  const ingredientNames = params.ingredientNames as string[] | undefined;

  if (!ingredientIds?.length && !ingredientNames?.length) {
    return errorResponse("Either 'ingredientIds' or 'ingredientNames' must be provided.");
  }

  const resolved: Ingredient[] = [];
  for (const id of ingredientIds ?? []) {
    const ing = ingredientById.get(id);
    if (ing) resolved.push(ing);
  }
  for (const name of ingredientNames ?? []) {
    const ing = resolveIngredient(name);
    if (ing && !resolved.some((r) => r.id === ing.id)) {
      resolved.push(ing);
    }
  }

  if (resolved.length === 0) {
    return errorResponse("No valid ingredients found.");
  }

  const tagSet = new Set<RecipeTag>();
  for (const ing of resolved) {
    for (const tag of ing.recipeTags) tagSet.add(tag);
  }
  const allTags = Array.from(tagSet);

  const moduleNames = new Set<string>();
  for (const tag of allTags) {
    const modules = TAG_TO_MODULES[tag];
    if (modules) {
      for (const m of modules) moduleNames.add(m);
    }
  }
  moduleNames.add("Add");

  const matchedSteps = cookingComponents
    .filter((comp) => moduleNames.has(comp.module))
    .map((comp) => ({
      module: comp.module,
      fullTextEn: comp.fullTextEn,
      shortcutEn: comp.shortcutEn,
      shortcutDa: comp.shortcutDa ?? null,
      fromTags: allTags.filter((t) => TAG_TO_MODULES[t]?.includes(comp.module)),
    }));

  const resolvedNames = resolved.map((i) => i.name);
  const searchTerms = new Set([
    ...resolvedNames.map((n) => n.toLowerCase()),
    ...allTags.map((t) => t.toLowerCase()),
  ]);

  const matchedRecipes = recipeNotes.filter((r) => {
    if (!r.recipeName || !r.fullRecipeEn) return false;
    const name = r.recipeName.toLowerCase();
    for (const term of searchTerms) {
      if (name.includes(term) || term.includes(name)) return true;
    }
    return false;
  });

  return jsonResponse({
    ingredients: resolved.map((i) => ({ id: i.id, name: i.name })),
    recipeTags: allTags,
    cookingSteps: matchedSteps,
    matchedRecipes: matchedRecipes.map((r) => ({
      recipeName: r.recipeName,
      fullRecipeEn: r.fullRecipeEn,
    })),
  });
}

export function handleGetWheelStructure() {
  const ingredientsPerSegment: Record<string, number> = {};
  for (const seg of WHEEL_SEGMENTS) {
    ingredientsPerSegment[seg] = ingredients.filter((i) =>
      i.wheelSegments.includes(seg),
    ).length;
  }

  return jsonResponse({
    segments: WHEEL_SEGMENTS,
    walkOrder: WALK_ORDER,
    segmentColors: SEGMENT_COLORS,
    pairingWeights: PAIRING_WEIGHTS,
    roleCategories: ROLE_CATEGORIES,
    dishRoles: DISH_ROLES,
    stats: {
      totalIngredients: ingredients.length,
      ingredientsPerSegment,
      totalDishDescriptions: dishDescriptions.length,
      totalDishNotes: dishNotes.length,
      totalCookingComponents: cookingComponents.length,
      totalRecipeNotes: recipeNotes.length,
      ingredientsWithIcons: ingredients.filter((i) => i.hasIcon).length,
    },
  });
}

export function handleListFilterOptions() {
  return jsonResponse({
    wheelSegments: WHEEL_SEGMENTS,
    dietaryFlags: DIETARY_FLAGS,
    seasons: SEASONS,
    regions: REGIONS,
    tastes: TASTE_TAGS,
    aromas: AROMA_TAGS,
    cookingStyles: COOKING_STYLES,
    recipeTags: RECIPE_TAGS,
    dishRoles: DISH_ROLES,
    roleCategories: ["Bulk", "Boost", "Top", "Splash"],
    marketCodes: MARKET_CODES,
    contentLanguages: CONTENT_LANGUAGES,
  });
}

export function handleGetCookingComponents(params: Record<string, unknown>) {
  const module = params.module as string | undefined;
  const type = (params.type as string | undefined) ?? "all";

  let filteredComponents = cookingComponents;
  let filteredRecipes = recipeNotes;

  if (module) {
    const lower = module.toLowerCase();
    filteredComponents = cookingComponents.filter(
      (c) => c.module.toLowerCase() === lower,
    );
    filteredRecipes = recipeNotes.filter(
      (r) => r.recipeName?.toLowerCase().includes(lower),
    );
  }

  const result: Record<string, unknown> = {};

  if (type === "components" || type === "all") {
    result.cookingComponents = filteredComponents.map((c) => ({
      module: c.module,
      fullTextEn: c.fullTextEn,
      shortcutEn: c.shortcutEn,
      shortcutDa: c.shortcutDa ?? null,
    }));
  }

  if (type === "recipes" || type === "all") {
    result.recipeNotes = filteredRecipes.map((r) => ({
      recipeName: r.recipeName,
      fullRecipeEn: r.fullRecipeEn,
    }));
  }

  if (type === "all") {
    result.tagToModules = TAG_TO_MODULES;
  }

  return jsonResponse(result);
}

export function handleGetIngredientIcon(params: Record<string, unknown>) {
  const id = params.id as number;
  if (id == null) {
    return errorResponse("id is required.");
  }

  const ing = ingredientById.get(id);
  if (!ing) {
    return errorResponse(`Ingredient not found: ${id}`);
  }

  let iconSvg: string | null = null;
  if (ing.hasIcon) {
    try {
      const iconPath = resolve(ICONS_DIR, `${ing.iconId}.svg`);
      iconSvg = readFileSync(iconPath, "utf-8");
    } catch {
      iconSvg = null;
    }
  }

  return jsonResponse({
    id: ing.id,
    iconId: ing.iconId,
    name: ing.name,
    hasIcon: ing.hasIcon,
    iconSvg,
  });
}

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "gastrowheel", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const params = (args ?? {}) as Record<string, unknown>;

  switch (name) {
    case "get_ingredients_by_segment":
      return handleGetIngredientsBySegment(params);
    case "get_ingredient_details":
      return handleGetIngredientDetails(params);
    case "get_pairing_suggestions":
      return handleGetPairingSuggestions(params);
    case "suggest_dishes":
      return handleSuggestDishes(params);
    case "search_ingredients":
      return handleSearchIngredients(params);
    case "get_cooking_guide":
      return handleGetCookingGuide(params);
    case "get_wheel_structure":
      return handleGetWheelStructure();
    case "list_filter_options":
      return handleListFilterOptions();
    case "get_cooking_components":
      return handleGetCookingComponents(params);
    case "get_ingredient_icon":
      return handleGetIngredientIcon(params);
    default:
      return errorResponse(`Unknown tool: ${name}`);
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gastrowheel MCP server v1.0.0 running on stdio (10 tools)");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
