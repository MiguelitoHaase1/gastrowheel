"use client";

import { useMemo } from "react";
import type { Ingredient, WheelSegment } from "@gastrowheel/data";
import { ingredients, ingredientById } from "@/lib/data";

/**
 * Hook to access ingredient data with segment filtering.
 */
export function useIngredients() {
  return useMemo(
    () => ({
      allIngredients: ingredients,
      ingredientById,
      getBySegment: (segment: WheelSegment) =>
        ingredients.filter((ing: Ingredient) => ing.wheelSegments.includes(segment)),
    }),
    [],
  );
}
