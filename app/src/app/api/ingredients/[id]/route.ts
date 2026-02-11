import { type NextRequest } from "next/server";
import {
  json,
  jsonError,
  corsHeaders,
  resolveIngredient,
  serializeIngredient,
} from "../../_lib/helpers";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return params.then(({ id }) => {
    const parsed = Number(id);
    const ing = resolveIngredient(Number.isNaN(parsed) ? id : parsed);

    if (!ing) {
      return jsonError(`Ingredient not found: ${id}`, 404);
    }

    return json(serializeIngredient(ing));
  });
}
