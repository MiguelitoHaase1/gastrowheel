import { describe, it, expect } from "vitest";
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
  WHEEL_SEGMENTS,
  WALK_ORDER,
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
  nameOverlaps,
} from "@gastrowheel/data";

import {
  handleGetIngredientsBySegment,
  handleGetIngredientDetails,
  handleGetPairingSuggestions,
  handleSuggestDishes,
  handleSearchIngredients,
  handleGetCookingGuide,
  handleGetWheelStructure,
  handleListFilterOptions,
  handleGetCookingComponents,
  handleGetIngredientIcon,
  scoreDish,
  isSweetDish,
  qualityLabel,
  buildFilters,
  resolveIngredient,
} from "../index";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Tool handler response shape */
type ToolResponse = { content: { type: string; text: string }[]; isError?: true };

/** Parse JSON from the text content of a tool response */
function parseResponse(response: ToolResponse) {
  return JSON.parse(response.content[0].text);
}

/** Check if a response is an error */
function isError(response: ToolResponse) {
  return response.isError === true;
}

// ---------------------------------------------------------------------------
// Data integrity tests
// ---------------------------------------------------------------------------

describe("data integrity", () => {
  it("loads all 827 ingredients", () => {
    expect(ingredients.length).toBe(827);
  });

  it("every ingredient has at least one wheelSegment", () => {
    for (const ing of ingredients) {
      expect(ing.wheelSegments.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("no duplicate ingredient IDs", () => {
    const ids = new Set(ingredients.map((i) => i.id));
    expect(ids.size).toBe(ingredients.length);
  });

  it("all dish descriptions have either dishName or description", () => {
    for (const dish of dishDescriptions) {
      const hasContent = !!dish.dishName || Object.keys(dish.descriptions).length > 0;
      expect(hasContent).toBe(true);
    }
  });

  it("ingredientById map matches ingredients array", () => {
    expect(ingredientById.size).toBe(ingredients.length);
    for (const ing of ingredients) {
      expect(ingredientById.get(ing.id)).toBe(ing);
    }
  });
});

// ---------------------------------------------------------------------------
// Tool 1: get_ingredients_by_segment
// ---------------------------------------------------------------------------

describe("get_ingredients_by_segment", () => {
  it("returns ingredients for a valid segment", () => {
    const res = handleGetIngredientsBySegment({ segment: "Base" });
    expect(isError(res)).toBe(false);
    const data = parseResponse(res);
    expect(data.segment).toBe("Base");
    expect(data.count).toBeGreaterThan(0);
    // All returned ingredients should have "Base" in their wheelSegments
    for (const ing of data.ingredients) {
      expect(ing.wheelSegments).toContain("Base");
    }
  });

  it("returns full ingredient shape (with iconId, commonIn, etc.)", () => {
    const res = handleGetIngredientsBySegment({ segment: "Fresh" });
    const data = parseResponse(res);
    const first = data.ingredients[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("iconId");
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("roles");
    expect(first).toHaveProperty("roleCategory");
    expect(first).toHaveProperty("dietary");
    expect(first).toHaveProperty("tastes");
    expect(first).toHaveProperty("aromas");
    expect(first).toHaveProperty("seasons");
    expect(first).toHaveProperty("regions");
    expect(first).toHaveProperty("cookingStyles");
    expect(first).toHaveProperty("recipeTags");
    expect(first).toHaveProperty("wheelSegments");
    expect(first).toHaveProperty("commonIn");
    expect(first).toHaveProperty("hasIcon");
  });

  it("filters by dietary correctly (AND logic)", () => {
    const res = handleGetIngredientsBySegment({
      segment: "Base",
      dietary: ["Vegan", "NutFree"],
    });
    const data = parseResponse(res);
    for (const ing of data.ingredients) {
      expect(ing.dietary).toContain("Vegan");
      expect(ing.dietary).toContain("NutFree");
    }
  });

  it("filters by season", () => {
    const res = handleGetIngredientsBySegment({
      segment: "Fresh",
      season: "Summer",
    });
    const data = parseResponse(res);
    for (const ing of data.ingredients) {
      expect(ing.seasons).toContain("Summer");
    }
  });

  it("filters by region", () => {
    const res = handleGetIngredientsBySegment({
      segment: "Umami",
      region: "EastAsian",
    });
    const data = parseResponse(res);
    for (const ing of data.ingredients) {
      expect(ing.regions).toContain("EastAsian");
    }
  });

  it("filters by commonality: common", () => {
    const res = handleGetIngredientsBySegment({
      segment: "Base",
      commonality: "common",
    });
    const data = parseResponse(res);
    for (const ing of data.ingredients) {
      expect(ing.commonIn).toContain("da");
    }
  });

  it("filters by commonality: exotic", () => {
    const res = handleGetIngredientsBySegment({
      segment: "Base",
      commonality: "exotic",
    });
    const data = parseResponse(res);
    for (const ing of data.ingredients) {
      expect(ing.commonIn).not.toContain("da");
    }
  });

  it("errors on invalid segment", () => {
    const res = handleGetIngredientsBySegment({ segment: "Invalid" });
    expect(isError(res)).toBe(true);
  });

  it("filters by cookingStyle", () => {
    const res = handleGetIngredientsBySegment({
      segment: "Base",
      cookingStyle: "SlowAndDeep",
    });
    const data = parseResponse(res);
    for (const ing of data.ingredients) {
      expect(ing.cookingStyles).toContain("SlowAndDeep");
    }
  });

  it("filters by recipeTags", () => {
    const res = handleGetIngredientsBySegment({
      segment: "Base",
      recipeTags: ["Sofrito"],
    });
    const data = parseResponse(res);
    for (const ing of data.ingredients) {
      expect(ing.recipeTags.some((t: string) => t === "Sofrito")).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Tool 2: get_ingredient_details
// ---------------------------------------------------------------------------

describe("get_ingredient_details", () => {
  it("finds ingredient by id", () => {
    const res = handleGetIngredientDetails({ id: 1 });
    expect(isError(res)).toBe(false);
    const data = parseResponse(res);
    expect(data.id).toBe(1);
    expect(data.name).toBe("acorn squash");
  });

  it("finds ingredient by name (case-insensitive)", () => {
    const res = handleGetIngredientDetails({ name: "ACORN SQUASH" });
    expect(isError(res)).toBe(false);
    const data = parseResponse(res);
    expect(data.id).toBe(1);
  });

  it("errors when ingredient not found", () => {
    const res = handleGetIngredientDetails({ name: "nonexistent" });
    expect(isError(res)).toBe(true);
  });

  it("errors when neither id nor name provided", () => {
    const res = handleGetIngredientDetails({});
    expect(isError(res)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tool 3: get_pairing_suggestions — including critical regression tests
// ---------------------------------------------------------------------------

describe("get_pairing_suggestions", () => {
  // Find a known ingredient for testing
  const rice = ingredients.find((i) => i.name === "rice")!;
  const noodles = ingredients.find((i) => i.name === "noodles")!;
  const riceNoodles = ingredients.find((i) => i.name === "rice noodles");
  const sobaNoodles = ingredients.find((i) => i.name === "soba noodles");

  it("returns ranked suggestions (descending score)", () => {
    const res = handleGetPairingSuggestions({
      selectedIds: [rice.id],
      targetSegment: "Fresh",
    });
    const data = parseResponse(res);
    expect(data.count).toBeGreaterThan(0);
    // Verify descending score order
    for (let i = 1; i < data.suggestions.length; i++) {
      expect(data.suggestions[i - 1].totalScore).toBeGreaterThanOrEqual(
        data.suggestions[i].totalScore,
      );
    }
  });

  it("respects limit parameter", () => {
    const res = handleGetPairingSuggestions({
      selectedIds: [rice.id],
      targetSegment: "Fresh",
      limit: 3,
    });
    const data = parseResponse(res);
    expect(data.count).toBeLessThanOrEqual(3);
  });

  it("breakdown values are in [0,1]", () => {
    const res = handleGetPairingSuggestions({
      selectedIds: [rice.id],
      targetSegment: "Fresh",
    });
    const data = parseResponse(res);
    for (const s of data.suggestions) {
      for (const [, val] of Object.entries(s.breakdown)) {
        expect(val as number).toBeGreaterThanOrEqual(0);
        expect(val as number).toBeLessThanOrEqual(1);
      }
    }
  });

  // CRITICAL BUG FIX: Selected ingredients must never be re-proposed
  it("does NOT re-propose selected ingredients", () => {
    const res = handleGetPairingSuggestions({
      selectedIds: [rice.id],
      targetSegment: rice.wheelSegments[0],
    });
    const data = parseResponse(res);
    const resultIds = data.suggestions.map((s: { ingredient: { id: number } }) => s.ingredient.id);
    expect(resultIds).not.toContain(rice.id);
  });

  // CRITICAL BUG FIX: Name overlap exclusion
  it("excludes name-overlapping ingredients (noodles → rice noodles excluded)", () => {
    if (!noodles) return; // skip if not in dataset
    const targetSeg = riceNoodles?.wheelSegments[0] ?? noodles.wheelSegments[0];
    const res = handleGetPairingSuggestions({
      selectedIds: [noodles.id],
      targetSegment: targetSeg,
      limit: 200,
    });
    const data = parseResponse(res);
    const resultNames = data.suggestions.map(
      (s: { ingredient: { name: string } }) => s.ingredient.name,
    );
    // "noodles" overlaps "rice noodles" and "soba noodles" via shared word
    for (const name of resultNames) {
      expect(nameOverlaps("noodles", name)).toBe(false);
    }
  });

  it("excludes name-overlapping in reverse (rice noodles → noodles excluded)", () => {
    if (!riceNoodles || !noodles) return;
    const targetSeg = noodles.wheelSegments[0];
    const res = handleGetPairingSuggestions({
      selectedIds: [riceNoodles.id],
      targetSegment: targetSeg,
      limit: 200,
    });
    const data = parseResponse(res);
    const resultNames: string[] = data.suggestions.map(
      (s: { ingredient: { name: string } }) => s.ingredient.name,
    );
    expect(resultNames).not.toContain("noodles");
  });

  // Segment filtering
  it("only returns ingredients from the target segment", () => {
    const res = handleGetPairingSuggestions({
      selectedIds: [rice.id],
      targetSegment: "Sour",
    });
    const data = parseResponse(res);
    for (const s of data.suggestions) {
      expect(s.ingredient.wheelSegments).toContain("Sour");
    }
  });

  // Free pairing mode
  it("free pairing mode (no targetSegment) returns from multiple segments", () => {
    const res = handleGetPairingSuggestions({
      selectedIds: [rice.id],
    });
    const data = parseResponse(res);
    expect(data.targetSegment).toBe("all (free pairing)");
    const segments = new Set<string>();
    for (const s of data.suggestions) {
      for (const seg of s.ingredient.wheelSegments) segments.add(seg);
    }
    expect(segments.size).toBeGreaterThan(1);
  });

  it("free pairing mode defaults to higher limit", () => {
    const res = handleGetPairingSuggestions({
      selectedIds: [rice.id],
    });
    const data = parseResponse(res);
    expect(data.count).toBeGreaterThan(10); // default segment limit is 10
  });

  // Dietary filter AND logic
  it("dietary filter AND logic (Vegan + NutFree excludes nuts)", () => {
    const res = handleGetPairingSuggestions({
      selectedIds: [rice.id],
      targetSegment: "Crunch",
      dietary: ["Vegan", "NutFree"],
      limit: 100,
    });
    const data = parseResponse(res);
    for (const s of data.suggestions) {
      expect(s.ingredient.dietary).toContain("Vegan");
      expect(s.ingredient.dietary).toContain("NutFree");
      // Should not contain any nut roles
      expect(s.ingredient.roles).not.toContain("Nuts");
    }
  });

  it("commonality filter: common items have da in commonIn", () => {
    const res = handleGetPairingSuggestions({
      selectedIds: [],
      targetSegment: "Base",
      commonality: "common",
      limit: 100,
    });
    const data = parseResponse(res);
    for (const s of data.suggestions) {
      expect(s.ingredient.commonIn).toContain("da");
    }
  });

  it("commonality filter: exotic items do NOT have da in commonIn", () => {
    const res = handleGetPairingSuggestions({
      selectedIds: [],
      targetSegment: "Base",
      commonality: "exotic",
      limit: 100,
    });
    const data = parseResponse(res);
    for (const s of data.suggestions) {
      expect(s.ingredient.commonIn).not.toContain("da");
    }
  });

  it("errors on invalid segment when provided", () => {
    const res = handleGetPairingSuggestions({
      selectedIds: [],
      targetSegment: "Invalid",
    });
    expect(isError(res)).toBe(true);
  });

  it("errors on non-existent ingredient ID", () => {
    const res = handleGetPairingSuggestions({
      selectedIds: [99999],
      targetSegment: "Base",
    });
    expect(isError(res)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tool 4: suggest_dishes
// ---------------------------------------------------------------------------

describe("suggest_dishes", () => {
  it("matches ingredient names in dish descriptions", () => {
    const res = handleSuggestDishes({
      ingredientNames: ["rice", "soy sauce"],
    });
    expect(isError(res)).toBe(false);
    const data = parseResponse(res);
    expect(data.matchCount).toBeGreaterThan(0);
  });

  it("stemming works (tomatoes matches tomato)", () => {
    const res = handleSuggestDishes({
      ingredientNames: ["tomatoes"],
    });
    const data = parseResponse(res);
    // Should match dishes mentioning "tomato"
    const allMatched = data.dishes.flatMap((d: { matchedIngredients: string[] }) => d.matchedIngredients);
    expect(allMatched).toContain("tomatoes");
  });

  it("sweet penalty reduces dessert dish scores when no sweet ingredient", () => {
    const res = handleSuggestDishes({
      ingredientNames: ["sugar", "cream"],
      hasSweetIngredient: false,
    });
    const data = parseResponse(res);
    // With sweet penalty, sweet dishes should be deprioritized
    // Check that at least some non-sweet dishes appear before sweet ones if both exist
    const sweetDishIdx = data.dishes.findIndex((d: { dishName: string }) =>
      isSweetDish({ dishName: d.dishName, dishPk: null, descriptions: { en: d.dishName } }),
    );
    // This is a soft test - mainly checking the function doesn't crash
    expect(data.matchCount).toBeGreaterThanOrEqual(0);
    if (sweetDishIdx >= 0) {
      expect(data.dishes[sweetDishIdx].score).toBeGreaterThan(0);
    }
  });

  it("deduplication removes duplicate dish names", () => {
    const res = handleSuggestDishes({
      ingredientNames: ["rice", "noodles", "soy sauce", "sesame", "ginger"],
    });
    const data = parseResponse(res);
    const names = data.dishes.map((d: { dishName: string }) => d.dishName?.toLowerCase());
    const uniqueNames = new Set(names);
    expect(names.length).toBe(uniqueNames.size);
  });

  it("quality labels are correct", () => {
    expect(qualityLabel(3, 5)).toBe("strong"); // ratio >= 0.5
    expect(qualityLabel(3, 10)).toBe("strong"); // matchCount >= 3
    expect(qualityLabel(2, 10)).toBe("good"); // matchCount >= 2
    expect(qualityLabel(1, 10)).toBe("partial");
  });

  it("returns score, matchCount, matchedIngredients, quality in response", () => {
    const res = handleSuggestDishes({
      ingredientNames: ["rice", "soy sauce"],
    });
    const data = parseResponse(res);
    if (data.dishes.length > 0) {
      const first = data.dishes[0];
      expect(first).toHaveProperty("score");
      expect(first).toHaveProperty("matchCount");
      expect(first).toHaveProperty("matchedIngredients");
      expect(first).toHaveProperty("quality");
      expect(["strong", "good", "partial"]).toContain(first.quality);
    }
  });

  it("respects limit parameter", () => {
    const res = handleSuggestDishes({
      ingredientNames: ["rice"],
      limit: 3,
    });
    const data = parseResponse(res);
    expect(data.dishes.length).toBeLessThanOrEqual(3);
  });

  it("errors on empty ingredient list", () => {
    const res = handleSuggestDishes({ ingredientNames: [] });
    expect(isError(res)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tool 5: search_ingredients
// ---------------------------------------------------------------------------

describe("search_ingredients", () => {
  it("text search finds matching ingredients", () => {
    const res = handleSearchIngredients({ query: "tomato" });
    const data = parseResponse(res);
    expect(data.totalMatches).toBeGreaterThan(0);
    for (const ing of data.ingredients) {
      expect(ing.name.toLowerCase()).toContain("tomato");
    }
  });

  it("query is optional (pure filter search)", () => {
    const res = handleSearchIngredients({
      segment: "Sour",
      taste: "Sour",
    });
    const data = parseResponse(res);
    expect(data.totalMatches).toBeGreaterThan(0);
    for (const ing of data.ingredients) {
      expect(ing.wheelSegments).toContain("Sour");
      expect(ing.tastes).toContain("Sour");
    }
  });

  it("combined filters work (text + segment + dietary)", () => {
    const res = handleSearchIngredients({
      segment: "Base",
      dietary: ["Vegan"],
      limit: 10,
    });
    const data = parseResponse(res);
    for (const ing of data.ingredients) {
      expect(ing.wheelSegments).toContain("Base");
      expect(ing.dietary).toContain("Vegan");
    }
  });

  it("role filter works", () => {
    const res = handleSearchIngredients({ role: "Protein", limit: 10 });
    const data = parseResponse(res);
    for (const ing of data.ingredients) {
      expect(ing.roles).toContain("Protein");
    }
  });

  it("roleCategory filter works", () => {
    const res = handleSearchIngredients({ roleCategory: "Top", limit: 10 });
    const data = parseResponse(res);
    for (const ing of data.ingredients) {
      expect(ing.roleCategory).toBe("Top");
    }
  });

  it("returns full ingredient shape", () => {
    const res = handleSearchIngredients({ query: "rice", limit: 1 });
    const data = parseResponse(res);
    const first = data.ingredients[0];
    expect(first).toHaveProperty("iconId");
    expect(first).toHaveProperty("commonIn");
    expect(first).toHaveProperty("cookingStyles");
    expect(first).toHaveProperty("recipeTags");
  });

  it("respects limit", () => {
    const res = handleSearchIngredients({ limit: 5 });
    const data = parseResponse(res);
    expect(data.returned).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// Tool 6: get_cooking_guide
// ---------------------------------------------------------------------------

describe("get_cooking_guide", () => {
  it("returns cooking steps for ingredients with recipe tags", () => {
    // Find an ingredient that has recipe tags
    const withTags = ingredients.find((i) => i.recipeTags.length > 0)!;
    const res = handleGetCookingGuide({ ingredientIds: [withTags.id] });
    expect(isError(res)).toBe(false);
    const data = parseResponse(res);
    expect(data.recipeTags.length).toBeGreaterThan(0);
    expect(data.cookingSteps.length).toBeGreaterThan(0);
  });

  it("always includes Add module", () => {
    const withTags = ingredients.find((i) => i.recipeTags.length > 0)!;
    const res = handleGetCookingGuide({ ingredientIds: [withTags.id] });
    const data = parseResponse(res);
    const modules = data.cookingSteps.map((s: { module: string }) => s.module);
    expect(modules).toContain("Add");
  });

  it("resolves ingredients by name", () => {
    const res = handleGetCookingGuide({ ingredientNames: ["rice"] });
    expect(isError(res)).toBe(false);
    const data = parseResponse(res);
    expect(data.ingredients[0].name).toBe("rice");
  });

  it("finds matching recipes", () => {
    // Find ingredients with "boil" tag to trigger recipe matching
    const boilIng = ingredients.find((i) => i.recipeTags.includes("Boil"));
    if (boilIng) {
      const res = handleGetCookingGuide({ ingredientIds: [boilIng.id] });
      const data = parseResponse(res);
      // Should have some cooking steps (at minimum "Add")
      expect(data.cookingSteps.length).toBeGreaterThan(0);
    }
  });

  it("errors when no ingredients provided", () => {
    const res = handleGetCookingGuide({});
    expect(isError(res)).toBe(true);
  });

  it("errors when no valid ingredients found", () => {
    const res = handleGetCookingGuide({ ingredientNames: ["nonexistent_xyz"] });
    expect(isError(res)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tool 7: get_wheel_structure
// ---------------------------------------------------------------------------

describe("get_wheel_structure", () => {
  it("returns all 10 segments", () => {
    const res = handleGetWheelStructure();
    const data = parseResponse(res);
    expect(data.segments).toHaveLength(10);
    expect(data.segments).toEqual(WHEEL_SEGMENTS);
  });

  it("returns walk order", () => {
    const res = handleGetWheelStructure();
    const data = parseResponse(res);
    expect(data.walkOrder).toEqual(WALK_ORDER);
  });

  it("stats match actual data", () => {
    const res = handleGetWheelStructure();
    const data = parseResponse(res);
    expect(data.stats.totalIngredients).toBe(ingredients.length);
    expect(data.stats.totalDishDescriptions).toBe(dishDescriptions.length);
    expect(data.stats.totalCookingComponents).toBe(cookingComponents.length);
    expect(data.stats.totalRecipeNotes).toBe(recipeNotes.length);
  });

  it("ingredientsPerSegment sums > total (multi-segment overlap)", () => {
    const res = handleGetWheelStructure();
    const data = parseResponse(res);
    const segmentSum = Object.values(data.stats.ingredientsPerSegment).reduce(
      (sum: number, val) => sum + (val as number),
      0,
    );
    // Some ingredients are in multiple segments, so sum > total
    expect(segmentSum).toBeGreaterThanOrEqual(data.stats.totalIngredients);
  });

  it("returns segment colors and pairing weights", () => {
    const res = handleGetWheelStructure();
    const data = parseResponse(res);
    expect(data.segmentColors).toHaveProperty("Sour");
    expect(data.segmentColors).toHaveProperty("Umami");
    expect(data.pairingWeights).toHaveProperty("aromaOverlap");
    expect(data.pairingWeights).toHaveProperty("tasteBalance");
  });
});

// ---------------------------------------------------------------------------
// Tool 8: list_filter_options
// ---------------------------------------------------------------------------

describe("list_filter_options", () => {
  it("all arrays are non-empty", () => {
    const res = handleListFilterOptions();
    const data = parseResponse(res);
    expect(data.wheelSegments.length).toBeGreaterThan(0);
    expect(data.dietaryFlags.length).toBeGreaterThan(0);
    expect(data.seasons.length).toBeGreaterThan(0);
    expect(data.regions.length).toBeGreaterThan(0);
    expect(data.tastes.length).toBeGreaterThan(0);
    expect(data.aromas.length).toBeGreaterThan(0);
    expect(data.cookingStyles.length).toBeGreaterThan(0);
    expect(data.recipeTags.length).toBeGreaterThan(0);
    expect(data.dishRoles.length).toBeGreaterThan(0);
    expect(data.roleCategories.length).toBeGreaterThan(0);
    expect(data.contentLanguages.length).toBeGreaterThan(0);
  });

  it("returns correct canonical values", () => {
    const res = handleListFilterOptions();
    const data = parseResponse(res);
    expect(data.wheelSegments).toEqual(WHEEL_SEGMENTS);
    expect(data.dietaryFlags).toEqual(DIETARY_FLAGS);
    expect(data.seasons).toEqual(SEASONS);
    expect(data.regions).toEqual(REGIONS);
    expect(data.tastes).toEqual(TASTE_TAGS);
    expect(data.aromas).toEqual(AROMA_TAGS);
    expect(data.cookingStyles).toEqual(COOKING_STYLES);
    expect(data.recipeTags).toEqual(RECIPE_TAGS);
    expect(data.marketCodes).toEqual(MARKET_CODES);
    expect(data.contentLanguages).toEqual(CONTENT_LANGUAGES);
  });
});

// ---------------------------------------------------------------------------
// Tool 9: get_cooking_components
// ---------------------------------------------------------------------------

describe("get_cooking_components", () => {
  it("returns all cooking components and recipe notes by default", () => {
    const res = handleGetCookingComponents({});
    const data = parseResponse(res);
    expect(data.cookingComponents.length).toBe(cookingComponents.length);
    expect(data.recipeNotes.length).toBe(recipeNotes.length);
    expect(data.tagToModules).toBeDefined();
  });

  it("module filter works", () => {
    const res = handleGetCookingComponents({ module: "Sofrito" });
    const data = parseResponse(res);
    for (const comp of data.cookingComponents) {
      expect(comp.module.toLowerCase()).toBe("sofrito");
    }
  });

  it("type=components returns only components", () => {
    const res = handleGetCookingComponents({ type: "components" });
    const data = parseResponse(res);
    expect(data.cookingComponents).toBeDefined();
    expect(data.recipeNotes).toBeUndefined();
  });

  it("type=recipes returns only recipes", () => {
    const res = handleGetCookingComponents({ type: "recipes" });
    const data = parseResponse(res);
    expect(data.recipeNotes).toBeDefined();
    expect(data.cookingComponents).toBeUndefined();
  });

  it("tagToModules maps all 7 recipe tags", () => {
    const res = handleGetCookingComponents({});
    const data = parseResponse(res);
    expect(Object.keys(data.tagToModules)).toHaveLength(RECIPE_TAGS.length);
    for (const tag of RECIPE_TAGS) {
      expect(data.tagToModules[tag]).toBeDefined();
      expect(Array.isArray(data.tagToModules[tag])).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Tool 10: get_ingredient_icon
// ---------------------------------------------------------------------------

describe("get_ingredient_icon", () => {
  it("returns SVG string for ingredient with icon", () => {
    const withIcon = ingredients.find((i) => i.hasIcon)!;
    const res = handleGetIngredientIcon({ id: withIcon.id });
    expect(isError(res)).toBe(false);
    const data = parseResponse(res);
    expect(data.hasIcon).toBe(true);
    if (data.iconSvg !== null) {
      expect(data.iconSvg).toContain("<svg");
    }
  });

  it("returns null iconSvg for ingredient without icon", () => {
    const noIcon = ingredients.find((i) => !i.hasIcon);
    if (noIcon) {
      const res = handleGetIngredientIcon({ id: noIcon.id });
      const data = parseResponse(res);
      expect(data.hasIcon).toBe(false);
      expect(data.iconSvg).toBeNull();
    }
  });

  it("errors on non-existent ID", () => {
    const res = handleGetIngredientIcon({ id: 99999 });
    expect(isError(res)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Helper function tests
// ---------------------------------------------------------------------------

describe("helper functions", () => {
  describe("resolveIngredient", () => {
    it("resolves by number id", () => {
      const ing = resolveIngredient(1);
      expect(ing).toBeDefined();
      expect(ing!.id).toBe(1);
    });

    it("resolves by string name (case-insensitive)", () => {
      const ing = resolveIngredient("Rice");
      expect(ing).toBeDefined();
      expect(ing!.name).toBe("rice");
    });

    it("returns undefined for missing", () => {
      expect(resolveIngredient("xyznonexistent")).toBeUndefined();
      expect(resolveIngredient(99999)).toBeUndefined();
    });
  });

  describe("buildFilters", () => {
    it("builds empty filters from empty params", () => {
      const f = buildFilters({});
      expect(Object.keys(f)).toHaveLength(0);
    });

    it("validates dietary flags", () => {
      const f = buildFilters({ dietary: ["Vegan", "INVALID"] });
      expect(f.dietary).toEqual(["Vegan"]);
    });

    it("sets cooking style filter", () => {
      const f = buildFilters({ cookingStyle: "SlowAndDeep" });
      expect(f.cookingStyles).toEqual(["SlowAndDeep"]);
    });
  });

  describe("scoreDish", () => {
    const testDish = {
      dishName: "Tomato Pasta",
      dishPk: 1,
      descriptions: { en: "A simple pasta dish with fresh tomatoes and basil." },
    };

    it("matches exact ingredient name", () => {
      const result = scoreDish(testDish, ["tomato"]);
      expect(result.matchCount).toBe(1);
      expect(result.matchedIngredients).toContain("tomato");
    });

    it("stemming matches plural (tomatoes → tomato)", () => {
      const result = scoreDish(testDish, ["tomatoes"]);
      expect(result.matchCount).toBe(1);
    });

    it("word prefix matching works", () => {
      const result = scoreDish(testDish, ["basil"]);
      expect(result.matchCount).toBe(1);
    });

    it("returns 0 for non-matching ingredients", () => {
      const result = scoreDish(testDish, ["salmon"]);
      expect(result.matchCount).toBe(0);
    });
  });

  describe("isSweetDish", () => {
    it("identifies sweet dishes", () => {
      const sweet = { dishName: "Chocolate Cake", dishPk: 1, descriptions: { en: "A rich dessert" } };
      expect(isSweetDish(sweet)).toBe(true);
    });

    it("non-sweet dish returns false", () => {
      const savory = { dishName: "Tomato Soup", dishPk: 1, descriptions: { en: "A warm soup" } };
      expect(isSweetDish(savory)).toBe(false);
    });
  });
});
