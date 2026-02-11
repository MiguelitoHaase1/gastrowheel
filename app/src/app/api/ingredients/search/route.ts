import { type NextRequest } from "next/server";
import {
  json,
  corsHeaders,
  ingredients,
  applyFilters,
  serializeIngredient,
  buildFilters,
  parseCommaSeparated,
  WHEEL_SEGMENTS,
  type WheelSegment,
  type RoleCategory,
} from "../../_lib/helpers";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const query = params.get("query") ?? "";
  const limit = Math.min(Number(params.get("limit")) || 50, 200);
  const segment = params.get("segment") as WheelSegment | null;
  const taste = params.get("taste");
  const aroma = params.get("aroma");
  const role = params.get("role");
  const roleCategory = params.get("roleCategory") as RoleCategory | null;
  const recipeTags = parseCommaSeparated(params.get("recipeTags"));

  let result = [...ingredients];

  if (query) {
    const lower = query.toLowerCase();
    result = result.filter((i) => i.name.toLowerCase().includes(lower));
  }

  if (segment && WHEEL_SEGMENTS.includes(segment)) {
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

  const sliced = result.slice(0, limit);

  return json({
    query: query || null,
    totalMatches: result.length,
    returned: sliced.length,
    ingredients: sliced.map(serializeIngredient),
  });
}
