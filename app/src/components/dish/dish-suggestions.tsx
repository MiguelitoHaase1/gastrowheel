"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChefHat, Lightbulb, Sparkles } from "lucide-react";
import { useDishStore } from "@/store/dish-store";
import { dishDescriptions, dishNotes } from "@/lib/data";
import type { DishDescription, DishNote } from "@gastrowheel/data";

interface ScoredDish {
  dish: DishDescription;
  note: DishNote | undefined;
  matchCount: number;
  matchedIngredients: string[];
  quality: "strong" | "good" | "partial";
}

/**
 * Fuzzy-match ingredient names against dish name and English description.
 * Returns a score based on how many selected ingredients appear in the dish text.
 */
function scoreDish(
  dish: DishDescription,
  ingredientNames: string[],
): { matchCount: number; matchedIngredients: string[] } {
  const dishText = [
    dish.dishName ?? "",
    dish.descriptions.en ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const matched: string[] = [];

  for (const name of ingredientNames) {
    const lower = name.toLowerCase();
    // Check for exact word match or substring match (handles plurals, partial names)
    if (dishText.includes(lower)) {
      matched.push(name);
      continue;
    }
    // Try matching with at least 4 chars for shorter ingredient names
    if (lower.length >= 4) {
      // Check if the stem (dropping trailing 's', 'es', etc.) matches
      const stem = lower.replace(/(s|es|ies)$/, "");
      if (stem.length >= 3 && dishText.includes(stem)) {
        matched.push(name);
        continue;
      }
    }
    // Check if any word in the dish text starts with the ingredient name
    const words = dishText.split(/\s+/);
    if (words.some((w) => w.startsWith(lower) || lower.startsWith(w))) {
      matched.push(name);
    }
  }

  return { matchCount: matched.length, matchedIngredients: matched };
}

function qualityLabel(
  matchCount: number,
  totalIngredients: number,
): "strong" | "good" | "partial" {
  const ratio = matchCount / totalIngredients;
  if (ratio >= 0.5 || matchCount >= 3) return "strong";
  if (matchCount >= 2) return "good";
  return "partial";
}

const qualityConfig = {
  strong: { label: "Strong match", bg: "bg-green-100", text: "text-green-700" },
  good: { label: "Good match", bg: "bg-amber-100", text: "text-amber-700" },
  partial: { label: "Partial match", bg: "bg-stone-100", text: "text-stone-500" },
};

export function DishSuggestions() {
  const selections = useDishStore((s) => s.selections);

  const ingredientNames = useMemo(
    () => selections.map((s) => s.ingredient.name),
    [selections],
  );

  const scoredDishes = useMemo(() => {
    if (ingredientNames.length === 0) return [];

    const results: ScoredDish[] = [];

    for (const dish of dishDescriptions) {
      // Skip dishes without a name or English description
      if (!dish.dishName || !dish.descriptions.en) continue;

      const { matchCount, matchedIngredients } = scoreDish(dish, ingredientNames);

      if (matchCount > 0) {
        const quality = qualityLabel(matchCount, ingredientNames.length);
        const note = dishNotes.find((n) => n.dishPk === dish.dishPk);
        results.push({ dish, note, matchCount, matchedIngredients, quality });
      }
    }

    // Sort by match count descending, then by quality
    const qualityOrder = { strong: 0, good: 1, partial: 2 };
    results.sort(
      (a, b) =>
        b.matchCount - a.matchCount || qualityOrder[a.quality] - qualityOrder[b.quality],
    );

    // Deduplicate by dishName (keep the highest scoring entry)
    const seen = new Set<string>();
    return results.filter((r) => {
      const key = r.dish.dishName!.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [ingredientNames]);

  // Empty state: no ingredients selected
  if (selections.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white/60 p-6 text-center">
        <ChefHat className="mx-auto mb-3 text-stone-300" size={32} />
        <h3 className="font-heading text-base font-semibold text-stone-500">
          Dish Suggestions
        </h3>
        <p className="mt-1 text-sm text-stone-400">
          Select ingredients from the wheel to discover matching dishes.
        </p>
      </div>
    );
  }

  // Empty state: no matches found
  if (scoredDishes.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white/60 p-6 text-center">
        <Sparkles className="mx-auto mb-3 text-stone-300" size={32} />
        <h3 className="font-heading text-base font-semibold text-stone-500">
          No Matches Yet
        </h3>
        <p className="mt-1 text-sm text-stone-400">
          Keep adding ingredients -- dish suggestions will appear as your
          selections match known recipes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ChefHat className="text-coral" size={18} />
        <h2 className="font-heading text-lg font-semibold text-stone-800">
          Dish Suggestions
        </h2>
        <span className="ml-auto text-xs text-stone-400">
          {scoredDishes.length} {scoredDishes.length === 1 ? "match" : "matches"}
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        {scoredDishes.slice(0, 8).map((item, index) => {
          const cfg = qualityConfig[item.quality];
          return (
            <motion.div
              key={`${item.dish.dishPk}-${item.dish.dishName}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, delay: index * 0.04 }}
              className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-heading text-base font-semibold text-stone-800">
                  {item.dish.dishName}
                </h3>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${cfg.bg} ${cfg.text}`}
                >
                  {cfg.label}
                </span>
              </div>

              <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
                {item.dish.descriptions.en}
              </p>

              {/* Matched ingredients */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.matchedIngredients.map((name) => (
                  <span
                    key={name}
                    className="rounded-full bg-coral/10 px-2 py-0.5 text-[11px] font-medium text-coral-dark"
                  >
                    {name}
                  </span>
                ))}
              </div>

              {/* Dish note */}
              {item.note?.notes?.en && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-cream p-3">
                  <Lightbulb
                    className="mt-0.5 shrink-0 text-coral-light"
                    size={14}
                  />
                  <p className="text-xs leading-relaxed text-stone-500">
                    {item.note.notes.en}
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
