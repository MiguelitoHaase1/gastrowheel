"use client";

import { useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import type { Ingredient, WheelSegment } from "@gastrowheel/data";
import { getPairingSuggestions, nameOverlaps } from "@gastrowheel/data";
import { useDishStore } from "@/store/dish-store";
import { IngredientCard } from "./ingredient-card";
import { useIngredients } from "@/hooks/use-ingredients";

export function IngredientGrid() {
  const currentSegment = useDishStore((s) => s.currentSegment);
  const selections = useDishStore((s) => s.selections);
  const addIngredient = useDishStore((s) => s.addIngredient);
  const removeIngredient = useDishStore((s) => s.removeIngredient);
  const dietaryFilters = useDishStore((s) => s.dietaryFilters);
  const seasonFilters = useDishStore((s) => s.seasonFilters);
  const regionFilters = useDishStore((s) => s.regionFilters);
  const searchQuery = useDishStore((s) => s.searchQuery);
  const commonalityFilter = useDishStore((s) => s.commonalityFilter);
  const freeMode = useDishStore((s) => s.freeMode);

  const { allIngredients } = useIngredients();

  const selectedIds = useMemo(
    () => new Set(selections.map((s) => s.ingredient.id)),
    [selections],
  );

  const selectedIngredients = useMemo(
    () => selections.map((s) => s.ingredient),
    [selections],
  );

  // In free mode, pass null as targetSegment to skip segment filtering
  const effectiveSegment = freeMode ? null : currentSegment;

  const pairings = useMemo(() => {
    if (!freeMode && !currentSegment) return [];
    if (allIngredients.length === 0) return [];

    const results = getPairingSuggestions(allIngredients, selectedIngredients, effectiveSegment, {
      dietary: dietaryFilters.length > 0 ? dietaryFilters : undefined,
      seasons: seasonFilters.length > 0 ? seasonFilters : undefined,
      regions: regionFilters.length > 0 ? regionFilters : undefined,
      searchQuery: searchQuery || undefined,
      commonality: commonalityFilter !== "all" ? commonalityFilter : undefined,
    }, freeMode ? 80 : 50);

    // Safety: ensure no already-selected ingredient or name variant leaks through
    const selectedNames = selectedIngredients.map((s) => s.name);
    return results.filter(
      (p) =>
        !selectedIds.has(p.ingredient.id) &&
        !selectedNames.some((name) => nameOverlaps(name, p.ingredient.name)),
    );
  }, [
    currentSegment,
    effectiveSegment,
    freeMode,
    allIngredients,
    selectedIngredients,
    selectedIds,
    dietaryFilters,
    seasonFilters,
    regionFilters,
    searchQuery,
    commonalityFilter,
  ]);

  if (!freeMode && !currentSegment) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-400">
        <p className="text-center">
          Click a segment on the wheel
          <br />
          to explore ingredients
        </p>
      </div>
    );
  }

  if (pairings.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-stone-400">
        <p className="text-center">
          No ingredients match your filters.
          <br />
          Try adjusting your criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-stone-400 tabular-nums">
        {pairings.length} ingredient{pairings.length !== 1 ? "s" : ""}
      </p>
      <AnimatePresence mode="popLayout">
        {pairings.map((p) => {
          // In free mode, use the ingredient's primary wheel segment for display/grouping
          const displaySegment = freeMode
            ? (p.ingredient.wheelSegments[0] as WheelSegment)
            : currentSegment!;
          return (
            <IngredientCard
              key={`${displaySegment}-${p.ingredient.id}`}
              ingredient={p.ingredient}
              segment={displaySegment}
              pairingScore={selectedIngredients.length > 0 ? p : undefined}
              isSelected={selectedIds.has(p.ingredient.id)}
              onToggle={() => {
                if (selectedIds.has(p.ingredient.id)) {
                  removeIngredient(displaySegment, p.ingredient.id);
                } else {
                  addIngredient(displaySegment, p.ingredient);
                }
              }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
