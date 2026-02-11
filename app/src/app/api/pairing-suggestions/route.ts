import { type NextRequest } from "next/server";
import {
  json,
  jsonError,
  parseJsonBody,
  ingredients,
  ingredientById,
  getPairingSuggestions,
  buildFilters,
  serializePairingScore,
  WHEEL_SEGMENTS,
  type Ingredient,
  type WheelSegment,
} from "../_lib/helpers";

export { OPTIONS } from "../_lib/helpers";

export async function POST(request: NextRequest): Promise<Response> {
  const body = await parseJsonBody(request);
  if (body instanceof Response) return body;

  const selectedIds = body.selectedIds as number[] | undefined;
  if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
    return jsonError("selectedIds must be a non-empty array of numbers");
  }
  if (selectedIds.length > 100) {
    return jsonError("selectedIds exceeds maximum of 100 items");
  }
  if (!selectedIds.every((id) => typeof id === "number")) {
    return jsonError("selectedIds must contain only numbers");
  }

  const targetSegment = (body.targetSegment as WheelSegment | undefined) ?? null;
  const isFreeMode = targetSegment === null;
  const limit = (body.limit as number | undefined) ?? (isFreeMode ? 80 : 10);

  if (targetSegment !== null && !WHEEL_SEGMENTS.includes(targetSegment)) {
    return jsonError(
      `Invalid segment: ${targetSegment}. Valid: ${WHEEL_SEGMENTS.join(", ")}`,
    );
  }

  const selected: Ingredient[] = [];
  for (const id of selectedIds) {
    const ing = ingredientById.get(id);
    if (!ing) {
      return jsonError(`Ingredient ID not found: ${id}`, 404);
    }
    selected.push(ing);
  }

  const filters = buildFilters({
    dietary: body.dietary as string[] | undefined,
    season: body.season as string | undefined,
    region: body.region as string | undefined,
    cookingStyle: body.cookingStyle as string | undefined,
    commonality: body.commonality as string | undefined,
  });

  const suggestions = getPairingSuggestions(
    ingredients,
    selected,
    targetSegment,
    Object.keys(filters).length > 0 ? filters : undefined,
    limit,
  );

  return json({
    targetSegment: targetSegment ?? "all (free pairing)",
    selectedIngredients: selected.map((s) => ({ id: s.id, name: s.name })),
    count: suggestions.length,
    suggestions: suggestions.map(serializePairingScore),
  });
}
