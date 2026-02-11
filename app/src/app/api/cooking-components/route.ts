import { type NextRequest } from "next/server";
import {
  json,
  cookingComponents,
  recipeNotes,
  TAG_TO_MODULES,
} from "../_lib/helpers";

export { OPTIONS } from "../_lib/helpers";

export function GET(request: NextRequest): Response {
  const params = request.nextUrl.searchParams;
  const module = params.get("module");
  const contentType = params.get("type") ?? "all";

  let filteredComponents = cookingComponents;
  let filteredRecipes = recipeNotes;

  if (module) {
    const lower = module.toLowerCase();
    filteredComponents = cookingComponents.filter(
      (c) => c.module.toLowerCase() === lower,
    );
    filteredRecipes = recipeNotes.filter(
      (r) => r.recipeName?.toLowerCase().includes(lower),
    );
  }

  const result: Record<string, unknown> = {};

  if (contentType === "components" || contentType === "all") {
    result.cookingComponents = filteredComponents.map((c) => ({
      module: c.module,
      fullTextEn: c.fullTextEn,
      shortcutEn: c.shortcutEn,
      shortcutDa: c.shortcutDa ?? null,
    }));
  }

  if (contentType === "recipes" || contentType === "all") {
    result.recipeNotes = filteredRecipes.map((r) => ({
      recipeName: r.recipeName,
      fullRecipeEn: r.fullRecipeEn,
    }));
  }

  if (contentType === "all") {
    result.tagToModules = TAG_TO_MODULES;
  }

  return json(result);
}
