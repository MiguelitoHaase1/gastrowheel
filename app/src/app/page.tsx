"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlavorWheel } from "@/components/wheel/flavor-wheel";
import { WalkGuide } from "@/components/wheel/walk-guide";
import { IngredientGrid } from "@/components/ingredients/ingredient-grid";
import { DishBuilder } from "@/components/dish/dish-builder";
import { DishSuggestions } from "@/components/dish/dish-suggestions";
import { FilterBar } from "@/components/filters/filter-bar";
import { useDishStore } from "@/store/dish-store";
import { SEGMENT_COLORS } from "@gastrowheel/data";
import { ChefHat, X } from "lucide-react";

const COMMONALITY_OPTIONS = [
  { value: "common" as const, label: "Common" },
  { value: "all" as const, label: "All" },
  { value: "exotic" as const, label: "Exotic" },
];

function CommonalityToggle() {
  const commonalityFilter = useDishStore((s) => s.commonalityFilter);
  const setCommonalityFilter = useDishStore((s) => s.setCommonalityFilter);

  return (
    <div className="flex rounded-lg border border-stone-200 bg-white overflow-hidden">
      {COMMONALITY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setCommonalityFilter(opt.value)}
          className={`text-xs px-3 py-1.5 transition-colors ${
            commonalityFilter === opt.value
              ? "bg-coral text-white"
              : "text-stone-500 hover:bg-stone-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function Home() {
  const currentSegment = useDishStore((s) => s.currentSegment);
  const selections = useDishStore((s) => s.selections);
  const segmentColor = currentSegment ? SEGMENT_COLORS[currentSegment] : null;
  const [showDishPanel, setShowDishPanel] = useState(false);

  return (
    <main className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-stone-200/60 bg-white/40 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-heading text-xl font-bold text-stone-800">
            Gastro<span className="text-coral">wheel</span>
          </h1>
          <div className="flex items-center gap-3">
            {/* Mobile dish panel toggle */}
            <button
              onClick={() => setShowDishPanel(!showDishPanel)}
              className="lg:hidden relative flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-white border border-stone-200 text-stone-600"
            >
              <ChefHat size={16} />
              <span className="hidden sm:inline">Dish</span>
              {selections.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-coral text-white text-[10px] flex items-center justify-center font-bold">
                  {selections.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Cockpit: progress + dish builder — prominent, full width, sticky */}
      <div className="border-b border-stone-200/40 bg-white/60 backdrop-blur-sm sticky top-[53px] z-10">
        <div className="max-w-7xl mx-auto px-4">
          <WalkGuide />
          <DishBuilder />
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,400px)_minmax(0,1fr)_280px] gap-6">
          {/* Left: Wheel */}
          <div className="flex flex-col items-center lg:sticky lg:top-[300px] lg:self-start">
            <FlavorWheel />
          </div>

          {/* Center: Ingredients */}
          <div className="space-y-4 min-w-0">
            {currentSegment && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: segmentColor?.accent }}
                  />
                  <h2
                    className="font-heading text-lg font-semibold"
                    style={{ color: segmentColor?.text }}
                  >
                    {currentSegment} Ingredients
                  </h2>
                </div>
                <CommonalityToggle />
              </div>
            )}

            <FilterBar />

            <div className="max-h-[calc(100vh-300px)] overflow-y-auto pr-1 -mr-1 scrollbar-thin">
              <IngredientGrid />
            </div>
          </div>

          {/* Right: Dish Suggestions */}
          <div className="hidden lg:block lg:sticky lg:top-[300px] lg:self-start space-y-4 max-h-[calc(100vh-320px)] overflow-y-auto scrollbar-thin pr-1">
            <DishSuggestions />
          </div>
        </div>
      </div>

      {/* Mobile dish panel overlay */}
      <AnimatePresence>
        {showDishPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-30 lg:hidden"
              onClick={() => setShowDishPanel(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-cream rounded-t-2xl border-t border-stone-200 shadow-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-cream/90 backdrop-blur-sm px-4 pt-3 pb-2 flex items-center justify-between border-b border-stone-200/40">
                <h2 className="font-heading text-lg font-semibold text-stone-800">Your Dish</h2>
                <button
                  onClick={() => setShowDishPanel(false)}
                  className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-400"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <DishBuilder />
                <DishSuggestions />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
