import { type NextRequest } from "next/server";
import {
  json,
  jsonError,
  parseJsonBody,
  dishDescriptions,
  dishNotes,
  scoreDish,
  isSweetDish,
  qualityLabel,
  type WheelSegment,
  type ContentLanguage,
  type DishDescription,
  type DishNote,
} from "../_lib/helpers";

export { OPTIONS } from "../_lib/helpers";

interface ScoredDish {
  dish: DishDescription;
  note: DishNote | undefined;
  score: number;
  matchCount: number;
  matchedIngredients: string[];
  quality: "strong" | "good" | "partial";
}

const QUALITY_ORDER: Record<string, number> = { strong: 0, good: 1, partial: 2 };

export async function POST(request: NextRequest): Promise<Response> {
  const body = await parseJsonBody(request);
  if (body instanceof Response) return body;

  const ingredientNames = body.ingredientNames as string[] | undefined;
  if (!Array.isArray(ingredientNames) || ingredientNames.length === 0) {
    return jsonError("ingredientNames must be a non-empty array of strings");
  }
  if (ingredientNames.length > 100) {
    return jsonError("ingredientNames exceeds maximum of 100 items");
  }

  const wheelSegments = (body.wheelSegments as WheelSegment[] | undefined) ?? [];
  const hasSweetIngredient = (body.hasSweetIngredient as boolean | undefined) ?? false;
  const language = ((body.language as string | undefined) ?? "en") as ContentLanguage;
  const limit = (body.limit as number | undefined) ?? 15;

  const results: ScoredDish[] = [];

  for (const dish of dishDescriptions) {
    if (!dish.dishName || !dish.descriptions.en) continue;

    const { matchCount, matchedIngredients } = scoreDish(dish, ingredientNames);
    if (matchCount === 0) continue;

    let adjustedScore = matchCount;

    if (!hasSweetIngredient && isSweetDish(dish)) {
      adjustedScore = Math.max(0, matchCount - 1);
    }

    if (wheelSegments.length > 0) {
      const matchedSegments = new Set<WheelSegment>();
      for (const name of matchedIngredients) {
        const idx = ingredientNames.indexOf(name);
        if (idx !== -1 && idx < wheelSegments.length) {
          matchedSegments.add(wheelSegments[idx]);
        }
      }
      if (matchedSegments.size >= 3) adjustedScore += 0.5;
      if (matchedSegments.size >= 5) adjustedScore += 0.5;
    }

    if (adjustedScore > 0) {
      const quality = qualityLabel(matchCount, ingredientNames.length);
      const note = dishNotes.find((n) => n.dishPk === dish.dishPk);
      results.push({ dish, note, score: adjustedScore, matchCount, matchedIngredients, quality });
    }
  }

  results.sort(
    (a, b) =>
      b.score - a.score || QUALITY_ORDER[a.quality] - QUALITY_ORDER[b.quality],
  );

  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    const key = r.dish.dishName!.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const sliced = deduped.slice(0, limit);

  return json({
    query: ingredientNames,
    matchCount: sliced.length,
    dishes: sliced.map((item) => ({
      dishName: item.dish.dishName,
      dishPk: item.dish.dishPk,
      description: item.dish.descriptions[language] ?? item.dish.descriptions.en ?? null,
      note: item.note?.notes?.[language] ?? item.note?.notes?.en ?? null,
      score: Math.round(item.score * 1000) / 1000,
      matchCount: item.matchCount,
      matchedIngredients: item.matchedIngredients,
      quality: item.quality,
    })),
  });
}
