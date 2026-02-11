import {
  json,
  jsonError,
  resolveIngredient,
  serializeIngredient,
} from "../../_lib/helpers";

export { OPTIONS } from "../../_lib/helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const parsed = Number(id);
  const ing = resolveIngredient(Number.isNaN(parsed) ? id : parsed);

  if (!ing) {
    return jsonError(`Ingredient not found: ${id}`, 404);
  }

  return json(serializeIngredient(ing));
}
