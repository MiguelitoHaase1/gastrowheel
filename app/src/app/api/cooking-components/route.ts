import { type NextRequest } from "next/server";
import {
  json,
  corsHeaders,
  cookingComponents,
  recipeNotes,
  TAG_TO_MODULES,
} from "../_lib/helpers";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const module = params.get("module");
  const type = params.get("type") ?? "all";

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

  if (type === "components" || type === "all") {
    result.cookingComponents = filteredComponents.map((c) => ({
      module: c.module,
      fullTextEn: c.fullTextEn,
      shortcutEn: c.shortcutEn,
      shortcutDa: c.shortcutDa ?? null,
    }));
  }

  if (type === "recipes" || type === "all") {
    result.recipeNotes = filteredRecipes.map((r) => ({
      recipeName: r.recipeName,
      fullRecipeEn: r.fullRecipeEn,
    }));
  }

  if (type === "all") {
    result.tagToModules = TAG_TO_MODULES;
  }

  return json(result);
}
