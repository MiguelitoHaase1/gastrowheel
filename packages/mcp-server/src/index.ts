#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  ingredients,
  ingredientById,
} from "@gastrowheel/data/generated/ingredients";
import {
  dishDescriptions,
  dishNotes,
} from "@gastrowheel/data/generated/dishes";
import {
  getPairingSuggestions,
  applyFilters,
} from "@gastrowheel/data";
import type {
  Ingredient,
  WheelSegment,
  DietaryFlag,
  Season,
  Region,
  IngredientFilters,
  PairingScore,
} from "@gastrowheel/data";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WHEEL_SEGMENTS: WheelSegment[] = [
  "Sour", "Umami", "Oil", "Crunch", "Sweet",
  "Aroma", "Fresh", "Soft", "Bitter", "Spicy",
];

const DIETARY_FLAGS: DietaryFlag[] = [
  "Glutenfree", "Vegan", "Vegetarian", "LactoseFree",
  "Diabetic", "NutFree", "FODMAPS",
];

const SEASONS: Season[] = ["Spring", "Summer", "Fall", "Winter"];

const REGIONS: Region[] = [
  "Mediterranean", "SouthAsian", "EastAsian",
  "LatinAmerican", "European", "MiddleEastern", "Exotic",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Serialize an Ingredient to a plain JSON-safe object. */
function serializeIngredient(ing: Ingredient) {
  return {
    id: ing.id,
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

/** Serialize a PairingScore result. */
function serializePairingScore(ps: PairingScore) {
  return {
    ingredient: serializeIngredient(ps.ingredient),
    totalScore: Math.round(ps.totalScore * 1000) / 1000,
    breakdown: ps.breakdown,
  };
}

const COMMONALITY_VALUES = ["all", "common", "exotic"] as const;

/** Build an IngredientFilters object from optional raw params. */
function buildFilters(params: {
  dietary?: string[];
  season?: string;
  region?: string;
  cookingStyle?: string;
  query?: string;
  commonality?: string;
}): IngredientFilters {
  const filters: IngredientFilters = {};
  if (params.dietary?.length) {
    filters.dietary = params.dietary.filter((d): d is DietaryFlag =>
      DIETARY_FLAGS.includes(d as DietaryFlag),
    );
  }
  if (params.season && SEASONS.includes(params.season as Season)) {
    filters.seasons = [params.season as Season];
  }
  if (params.region && REGIONS.includes(params.region as Region)) {
    filters.regions = [params.region as Region];
  }
  if (params.query) {
    filters.searchQuery = params.query;
  }
  if (params.commonality && COMMONALITY_VALUES.includes(params.commonality as typeof COMMONALITY_VALUES[number])) {
    filters.commonality = params.commonality as IngredientFilters["commonality"];
  }
  return filters;
}

/** Resolve an ingredient by numeric id or string name. */
function resolveIngredient(idOrName: number | string): Ingredient | undefined {
  if (typeof idOrName === "number") {
    return ingredientById.get(idOrName);
  }
  const lower = idOrName.toLowerCase();
  return ingredients.find((i) => i.name.toLowerCase() === lower);
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "get_ingredients_by_segment",
    description:
      "Get all ingredients assigned to a Gastrowheel segment. " +
      "Optionally filter by dietary requirements, season, or region.",
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
        commonality: {
          type: "string",
          enum: ["all", "common", "exotic"],
          description: "Filter by commonality: 'common' = available in at least one market, 'exotic' = not common in any market, 'all' = no filter",
        },
      },
      required: ["segment"],
    },
  },
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
  {
    name: "get_pairing_suggestions",
    description:
      "Get ranked pairing suggestions for a target wheel segment based on " +
      "already-selected ingredient IDs. Uses the Gastrowheel pairing engine " +
      "which scores aroma overlap, taste balance, region affinity, season " +
      "match, role diversity, and commonality.",
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
          description: "Target wheel segment to find pairings for",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default 10)",
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
        commonality: {
          type: "string",
          enum: ["all", "common", "exotic"],
          description: "Filter by commonality: 'common' = available in at least one market, 'exotic' = not common in any market, 'all' = no filter",
        },
      },
      required: ["selectedIds", "targetSegment"],
    },
  },
  {
    name: "suggest_dishes",
    description:
      "Match selected ingredient names against the dish description database. " +
      "Returns dish descriptions and notes that mention the given ingredients.",
    inputSchema: {
      type: "object" as const,
      properties: {
        ingredientNames: {
          type: "array",
          items: { type: "string" },
          description: "Names of selected ingredients to match against dishes",
        },
      },
      required: ["ingredientNames"],
    },
  },
  {
    name: "search_ingredients",
    description:
      "Search ingredients by name, taste, aroma, or other properties. " +
      "Combine a free-text query with optional structured filters.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Free-text search query (matched against ingredient name)",
        },
        segment: {
          type: "string",
          enum: WHEEL_SEGMENTS,
          description: "Only return ingredients in this wheel segment",
        },
        taste: {
          type: "string",
          enum: [
            "Umami", "Sweet", "Bitter", "Sour",
            "Salty", "Spicy", "Crunchy", "AromaBomb",
          ],
          description: "Filter by taste tag",
        },
        aroma: {
          type: "string",
          enum: [
            "FRUITY", "GREEN", "FLORAL", "SULFUROUS", "HERBAL",
            "AROMATIC_SPICY", "WOODY", "NUTTY", "ROASTED", "SMOKEY",
            "CITRUS", "MEATY", "MARINE", "CREAMY", "CHEESY",
          ],
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
        commonality: {
          type: "string",
          enum: ["all", "common", "exotic"],
          description: "Filter by commonality: 'common' = available in at least one market, 'exotic' = not common in any market, 'all' = no filter",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default 50)",
        },
      },
      required: ["query"],
    },
  },
];

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

function handleGetIngredientsBySegment(params: Record<string, unknown>) {
  const segment = params.segment as WheelSegment;
  if (!WHEEL_SEGMENTS.includes(segment)) {
    return { isError: true, content: [{ type: "text" as const, text: `Invalid segment: ${segment}` }] };
  }

  let result = ingredients.filter((i) => i.wheelSegments.includes(segment));

  const filters = buildFilters({
    dietary: params.dietary as string[] | undefined,
    season: params.season as string | undefined,
    region: params.region as string | undefined,
    commonality: params.commonality as string | undefined,
  });
  if (Object.keys(filters).length > 0) {
    result = applyFilters(result, filters);
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            segment,
            count: result.length,
            ingredients: result.map((i) => ({
              id: i.id,
              name: i.name,
              roleCategory: i.roleCategory,
              tastes: i.tastes,
              aromas: i.aromas,
              hasIcon: i.hasIcon,
            })),
          },
          null,
          2,
        ),
      },
    ],
  };
}

function handleGetIngredientDetails(params: Record<string, unknown>) {
  const id = params.id as number | undefined;
  const name = params.name as string | undefined;

  if (id == null && name == null) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: "Either 'id' or 'name' must be provided." }],
    };
  }

  const ing = resolveIngredient(id ?? name!);
  if (!ing) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Ingredient not found: ${id ?? name}`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(serializeIngredient(ing), null, 2),
      },
    ],
  };
}

function handleGetPairingSuggestions(params: Record<string, unknown>) {
  const selectedIds = params.selectedIds as number[];
  const targetSegment = params.targetSegment as WheelSegment;
  const limit = (params.limit as number | undefined) ?? 10;

  if (!WHEEL_SEGMENTS.includes(targetSegment)) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: `Invalid segment: ${targetSegment}` }],
    };
  }

  const selected: Ingredient[] = [];
  for (const id of selectedIds) {
    const ing = ingredientById.get(id);
    if (!ing) {
      return {
        isError: true,
        content: [{ type: "text" as const, text: `Ingredient ID not found: ${id}` }],
      };
    }
    selected.push(ing);
  }

  const filters = buildFilters({
    dietary: params.dietary as string[] | undefined,
    season: params.season as string | undefined,
    region: params.region as string | undefined,
    commonality: params.commonality as string | undefined,
  });

  const suggestions = getPairingSuggestions(
    ingredients,
    selected,
    targetSegment,
    Object.keys(filters).length > 0 ? filters : undefined,
    limit,
  );

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            targetSegment,
            selectedIngredients: selected.map((s) => ({ id: s.id, name: s.name })),
            count: suggestions.length,
            suggestions: suggestions.map(serializePairingScore),
          },
          null,
          2,
        ),
      },
    ],
  };
}

function handleSuggestDishes(params: Record<string, unknown>) {
  const ingredientNames = params.ingredientNames as string[];
  if (!ingredientNames?.length) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: "ingredientNames must be a non-empty array." }],
    };
  }

  const lowerNames = ingredientNames.map((n) => n.toLowerCase());

  // Search dish descriptions for mentions of any selected ingredient
  const matchingDescriptions = dishDescriptions.filter((dish) => {
    const enDesc = dish.descriptions.en?.toLowerCase() ?? "";
    const dishNameLower = dish.dishName?.toLowerCase() ?? "";
    return lowerNames.some(
      (name) => enDesc.includes(name) || dishNameLower.includes(name),
    );
  });

  // Collect matching dish notes
  const matchingDishNames = new Set(matchingDescriptions.map((d) => d.dishName));
  const matchingNotes = dishNotes.filter((n) => matchingDishNames.has(n.dishName));

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            query: ingredientNames,
            matchCount: matchingDescriptions.length,
            dishes: matchingDescriptions.map((d) => ({
              dishName: d.dishName,
              dishPk: d.dishPk,
              description: d.descriptions.en ?? null,
              note:
                matchingNotes.find((n) => n.dishPk === d.dishPk)?.notes.en ??
                null,
            })),
          },
          null,
          2,
        ),
      },
    ],
  };
}

function handleSearchIngredients(params: Record<string, unknown>) {
  const query = (params.query as string) ?? "";
  const limit = (params.limit as number | undefined) ?? 50;
  const segment = params.segment as WheelSegment | undefined;
  const taste = params.taste as string | undefined;
  const aroma = params.aroma as string | undefined;

  let result = [...ingredients];

  // Free-text name filter
  if (query) {
    const lower = query.toLowerCase();
    result = result.filter((i) => i.name.toLowerCase().includes(lower));
  }

  // Segment filter
  if (segment && WHEEL_SEGMENTS.includes(segment)) {
    result = result.filter((i) => i.wheelSegments.includes(segment));
  }

  // Taste filter
  if (taste) {
    result = result.filter((i) =>
      i.tastes.some((t) => t.toLowerCase() === taste.toLowerCase()),
    );
  }

  // Aroma filter
  if (aroma) {
    result = result.filter((i) =>
      i.aromas.some((a) => a.toLowerCase() === aroma.toLowerCase()),
    );
  }

  // Dietary / season / region / commonality filters via applyFilters
  const filters = buildFilters({
    dietary: params.dietary as string[] | undefined,
    season: params.season as string | undefined,
    region: params.region as string | undefined,
    commonality: params.commonality as string | undefined,
  });
  if (Object.keys(filters).length > 0) {
    result = applyFilters(result, filters);
  }

  const sliced = result.slice(0, limit);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            query,
            totalMatches: result.length,
            returned: sliced.length,
            ingredients: sliced.map((i) => ({
              id: i.id,
              name: i.name,
              wheelSegments: i.wheelSegments,
              tastes: i.tastes,
              aromas: i.aromas,
              roleCategory: i.roleCategory,
              hasIcon: i.hasIcon,
            })),
          },
          null,
          2,
        ),
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new Server(
  { name: "gastrowheel", version: "0.1.0" },
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
    default:
      return {
        isError: true,
        content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
      };
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gastrowheel MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
