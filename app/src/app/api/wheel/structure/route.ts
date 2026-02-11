import {
  json,
  ingredients,
  dishDescriptions,
  dishNotes,
  cookingComponents,
  recipeNotes,
  WHEEL_SEGMENTS,
  WALK_ORDER,
  SEGMENT_COLORS,
  PAIRING_WEIGHTS,
  ROLE_CATEGORIES,
  DISH_ROLES,
} from "../../_lib/helpers";

export { OPTIONS } from "../../_lib/helpers";

export function GET(): Response {
  const ingredientsPerSegment: Record<string, number> = {};
  for (const seg of WHEEL_SEGMENTS) {
    ingredientsPerSegment[seg] = ingredients.filter((i) =>
      i.wheelSegments.includes(seg),
    ).length;
  }

  return json({
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
