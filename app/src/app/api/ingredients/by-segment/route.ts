import { type NextRequest } from "next/server";
import {
  json,
  jsonError,
  corsHeaders,
  ingredients,
  applyFilters,
  serializeIngredient,
  buildFilters,
  parseCommaSeparated,
  WHEEL_SEGMENTS,
  type WheelSegment,
} from "../../_lib/helpers";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const segment = params.get("segment");

  if (!segment || !WHEEL_SEGMENTS.includes(segment as WheelSegment)) {
    return jsonError(
      `Invalid or missing segment. Valid: ${WHEEL_SEGMENTS.join(", ")}`,
    );
  }

  let result = ingredients.filter((i) =>
    i.wheelSegments.includes(segment as WheelSegment),
  );

  const filters = buildFilters({
    dietary: parseCommaSeparated(params.get("dietary")),
    season: params.get("season") ?? undefined,
    region: params.get("region") ?? undefined,
    cookingStyle: params.get("cookingStyle") ?? undefined,
    commonality: params.get("commonality") ?? undefined,
  });

  if (Object.keys(filters).length > 0) {
    result = applyFilters(result, filters);
  }

  const recipeTags = parseCommaSeparated(params.get("recipeTags"));
  if (recipeTags?.length) {
    result = result.filter((ing) =>
      recipeTags.some((t) => (ing.recipeTags as string[]).includes(t)),
    );
  }

  return json({
    segment,
    count: result.length,
    ingredients: result.map(serializeIngredient),
  });
}
