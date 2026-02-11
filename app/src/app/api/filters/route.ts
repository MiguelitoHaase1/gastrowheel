import {
  json,
  corsHeaders,
  WHEEL_SEGMENTS,
  DIETARY_FLAGS,
  SEASONS,
  REGIONS,
  TASTE_TAGS,
  AROMA_TAGS,
  COOKING_STYLES,
  RECIPE_TAGS,
  DISH_ROLES,
  MARKET_CODES,
  CONTENT_LANGUAGES,
} from "../_lib/helpers";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function GET() {
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
    roleCategories: ["Bulk", "Boost", "Top", "Splash"],
    marketCodes: MARKET_CODES,
    contentLanguages: CONTENT_LANGUAGES,
  });
}
