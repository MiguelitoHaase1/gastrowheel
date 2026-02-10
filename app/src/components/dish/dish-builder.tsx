"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useDishStore } from "@/store/dish-store";
import { IngredientIcon } from "@/components/ingredients/ingredient-icon";
import { SEGMENT_COLORS, WALK_ORDER } from "@gastrowheel/data";
import type { WheelSegment } from "@gastrowheel/data";
import { X, RotateCcw, ChevronRight } from "lucide-react";

export function DishBuilder() {
  const selections = useDishStore((s) => s.selections);
  const completedSegments = useDishStore((s) => s.completedSegments);
  const removeIngredient = useDishStore((s) => s.removeIngredient);
  const setCurrentSegment = useDishStore((s) => s.setCurrentSegment);
  const advanceWalk = useDishStore((s) => s.advanceWalk);
  const reset = useDishStore((s) => s.reset);
  const suggestedSegment = useDishStore((s) => s.suggestedSegment);

  const suggested = suggestedSegment();

  // Group selections by segment in walk order
  const groupedBySegment = WALK_ORDER.reduce(
    (acc, seg) => {
      const items = selections.filter((s) => s.segment === seg);
      if (items.length > 0) acc.push({ segment: seg, items });
      return acc;
    },
    [] as { segment: WheelSegment; items: typeof selections }[],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-stone-800">Your Dish</h2>
        {selections.length > 0 && (
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs text-stone-400 hover:text-coral transition-colors"
          >
            <RotateCcw size={12} />
            Start over
          </button>
        )}
      </div>

      {/* Walk progress */}
      <div className="flex gap-1">
        {WALK_ORDER.map((seg) => {
          const colors = SEGMENT_COLORS[seg];
          const isComplete = completedSegments.has(seg);
          const isSuggested = seg === suggested;
          return (
            <button
              key={seg}
              onClick={() => setCurrentSegment(seg)}
              className={`flex-1 h-2 rounded-full transition-all ${
                isSuggested && !isComplete ? "segment-pulse" : ""
              }`}
              style={{
                backgroundColor: isComplete ? colors.accent : `${colors.accent}30`,
              }}
              title={seg}
            />
          );
        })}
      </div>

      {selections.length === 0 ? (
        <div className="text-center py-8 text-stone-400">
          <p className="text-sm">
            Start building your dish by
            <br />
            selecting ingredients from the wheel.
          </p>
          <button
            onClick={() => setCurrentSegment(suggested)}
            className="mt-3 inline-flex items-center gap-1 text-sm text-coral hover:text-coral-dark transition-colors font-medium"
          >
            Start with {suggested}
            <ChevronRight size={14} />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {groupedBySegment.map(({ segment, items }) => {
              const colors = SEGMENT_COLORS[segment];
              return (
                <motion.div
                  key={segment}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1"
                >
                  <button
                    onClick={() => setCurrentSegment(segment)}
                    className="text-xs font-medium uppercase tracking-wider hover:underline"
                    style={{ color: colors.accent }}
                  >
                    {segment}
                  </button>
                  {items.map(({ ingredient }) => (
                    <div
                      key={ingredient.id}
                      className="flex items-center gap-2 py-1 group"
                    >
                      <IngredientIcon
                        ingredient={ingredient}
                        segment={segment}
                        size={28}
                      />
                      <span className="text-sm text-stone-700 flex-1 truncate">
                        {ingredient.name}
                      </span>
                      <button
                        onClick={() => removeIngredient(segment, ingredient.id)}
                        className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-red-500 transition-all"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {completedSegments.size < WALK_ORDER.length && (
            <button
              onClick={() => {
                advanceWalk();
                setCurrentSegment(suggested);
              }}
              className="w-full py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: SEGMENT_COLORS[suggested].accent }}
            >
              Next: {suggested}
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-stone-400 text-center">
        {completedSegments.size}/{WALK_ORDER.length} components
      </p>
    </div>
  );
}
