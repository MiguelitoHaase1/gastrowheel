import { type NextRequest } from "next/server";
import {
  json,
  jsonError,
  parseJsonBody,
  cookingComponents,
  recipeNotes,
  resolveIngredient,
  ingredientById,
  TAG_TO_MODULES,
  type Ingredient,
  type RecipeTag,
} from "../_lib/helpers";

export { OPTIONS } from "../_lib/helpers";

export async function POST(request: NextRequest): Promise<Response> {
  const body = await parseJsonBody(request);
  if (body instanceof Response) return body;

  const ingredientIds = body.ingredientIds as number[] | undefined;
  const ingredientNames = body.ingredientNames as string[] | undefined;

  if (!ingredientIds?.length && !ingredientNames?.length) {
    return jsonError("Either ingredientIds or ingredientNames must be provided");
  }
  if ((ingredientIds?.length ?? 0) + (ingredientNames?.length ?? 0) > 100) {
    return jsonError("Total ingredients exceeds maximum of 100 items");
  }

  const resolved: Ingredient[] = [];
  for (const id of ingredientIds ?? []) {
    const ing = ingredientById.get(id);
    if (ing) resolved.push(ing);
  }
  for (const name of ingredientNames ?? []) {
    const ing = resolveIngredient(name);
    if (ing && !resolved.some((r) => r.id === ing.id)) {
      resolved.push(ing);
    }
  }

  if (resolved.length === 0) {
    return jsonError("No valid ingredients found", 404);
  }

  const tagSet = new Set<RecipeTag>();
  for (const ing of resolved) {
    for (const tag of ing.recipeTags) tagSet.add(tag);
  }
  const allTags = Array.from(tagSet);

  const moduleNames = new Set<string>();
  for (const tag of allTags) {
    const modules = TAG_TO_MODULES[tag];
    if (modules) {
      for (const m of modules) moduleNames.add(m);
    }
  }
  moduleNames.add("Add");

  const matchedSteps = cookingComponents
    .filter((comp) => moduleNames.has(comp.module))
    .map((comp) => ({
      module: comp.module,
      fullTextEn: comp.fullTextEn,
      shortcutEn: comp.shortcutEn,
      shortcutDa: comp.shortcutDa ?? null,
      fromTags: allTags.filter((t) => TAG_TO_MODULES[t]?.includes(comp.module)),
    }));

  const searchTerms = new Set([
    ...resolved.map((i) => i.name.toLowerCase()),
    ...allTags.map((t) => t.toLowerCase()),
  ]);

  const matchedRecipes = recipeNotes.filter((r) => {
    if (!r.recipeName || !r.fullRecipeEn) return false;
    const name = r.recipeName.toLowerCase();
    for (const term of searchTerms) {
      if (name.includes(term) || term.includes(name)) return true;
    }
    return false;
  });

  return json({
    ingredients: resolved.map((i) => ({ id: i.id, name: i.name })),
    recipeTags: allTags,
    cookingSteps: matchedSteps,
    matchedRecipes: matchedRecipes.map((r) => ({
      recipeName: r.recipeName,
      fullRecipeEn: r.fullRecipeEn,
    })),
  });
}
