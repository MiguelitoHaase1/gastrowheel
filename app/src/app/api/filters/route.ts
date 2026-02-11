import {
  json,
  WHEEL_SEGMENTS,
  DIETARY_FLAGS,
  SEASONS,
  REGIONS,
  TASTE_TAGS,
  AROMA_TAGS,
  COOKING_STYLES,
  RECIPE_TAGS,
  DISH_ROLES,
  ROLE_CATEGORIES,
  MARKET_CODES,
  CONTENT_LANGUAGES,
} from "../_lib/helpers";

export { OPTIONS } from "../_lib/helpers";

export function GET(): Response {
  return json({
    wheelSegments: WHEEL_SEGMENTS,
    dietaryFlags: DIETARY_FLAGS,
    seasons: SEASONS,
    regions: REGIONS,
    tastes: TASTE_TAGS,
    aromas: AROMA_TAGS,
    cookingStyles: COOKING_STYLES,
    recipeTags: RECIPE_TAGS,
    dishRoles: DISH_ROLES,
    roleCategories: [...new Set(Object.values(ROLE_CATEGORIES))],
    marketCodes: MARKET_CODES,
    contentLanguages: CONTENT_LANGUAGES,
  });
}
