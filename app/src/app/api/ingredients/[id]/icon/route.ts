import { type NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { corsHeaders, jsonError, ingredientById } from "../../../_lib/helpers";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  return params.then(({ id }) => {
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      return jsonError("id must be a number", 400);
    }

    const ing = ingredientById.get(numId);
    if (!ing) {
      return jsonError(`Ingredient not found: ${id}`, 404);
    }

    if (!ing.hasIcon) {
      return jsonError(`No icon for ingredient: ${ing.name}`, 404);
    }

    try {
      const iconPath = resolve(process.cwd(), "public", "icons", `${ing.iconId}.svg`);
      const svg = readFileSync(iconPath, "utf-8");
      return new Response(svg, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch {
      return jsonError(`Icon file not found for ingredient: ${ing.name}`, 404);
    }
  });
}
