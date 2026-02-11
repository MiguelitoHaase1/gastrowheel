"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlavorWheel } from "@/components/wheel/flavor-wheel";
import { WalkGuide } from "@/components/wheel/walk-guide";
import { IngredientGrid } from "@/components/ingredients/ingredient-grid";
import { DishBuilder } from "@/components/dish/dish-builder";
import { DishSuggestions } from "@/components/dish/dish-suggestions";
import { FilterBar } from "@/components/filters/filter-bar";
import { useDishStore } from "@/store/dish-store";
import { SEGMENT_COLORS } from "@gastrowheel/data";
import { ChefHat, Search, X } from "lucide-react";

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
          className={`text-xs px-2.5 py-1 transition-colors ${
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
  const searchQuery = useDishStore((s) => s.searchQuery);
  const setSearchQuery = useDishStore((s) => s.setSearchQuery);
  const freeMode = useDishStore((s) => s.freeMode);
  const setFreeMode = useDishStore((s) => s.setFreeMode);
  const [showDishPanel, setShowDishPanel] = useState(false);
  const ingredientScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll ingredient list to top when segment changes
  useEffect(() => {
    if (currentSegment && ingredientScrollRef.current) {
      ingredientScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [currentSegment]);

  return (
    <main className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-stone-200/60 bg-white/40 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-heading text-xl font-bold text-stone-800">
            Gastro<span className="text-coral">wheel</span>
          </h1>
          <div className="flex items-center gap-3">
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

      {/* Walk guide */}
      <div className="border-b border-stone-200/40 bg-white/60 backdrop-blur-sm sticky top-[53px] z-10">
        <div className="max-w-7xl mx-auto px-4">
          <WalkGuide />
        </div>
      </div>

      {/* Sticky filter bar — segment title + search + filter chips */}
      <div className="border-b border-stone-200/40 bg-cream/95 backdrop-blur-sm sticky top-[110px] z-10">
        <div className="max-w-7xl mx-auto px-4 py-2 space-y-1.5">
          {/* Row 1: Segment title + Commonality toggle + Search */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {freeMode ? (
              <h2 className="font-heading text-base font-semibold text-coral shrink-0">
                Free Pairing
              </h2>
            ) : currentSegment ? (
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: segmentColor?.accent }}
                />
                <h2
                  className="font-heading text-base font-semibold whitespace-nowrap"
                  style={{ color: segmentColor?.text }}
                >
                  {currentSegment} Ingredients
                </h2>
              </div>
            ) : (
              <h2 className="font-heading text-base font-semibold text-stone-400 shrink-0">
                Select a segment
              </h2>
            )}
            <CommonalityToggle />
            <div className="relative w-full sm:w-auto sm:flex-1 sm:max-w-[220px] sm:ml-auto order-last sm:order-none">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                placeholder="Search ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-1.5 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:border-coral focus:ring-1 focus:ring-coral/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          {/* Row 2: Diet + Cuisine filter chips */}
          <FilterBar />
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_280px] gap-6">
          {/* Left: Wheel (compact, sticky) + mode toggle */}
          <div className="flex flex-col items-center gap-3 lg:sticky lg:top-[200px] lg:self-start">
            <FlavorWheel />
            <div className="flex flex-col gap-1.5 w-full max-w-[220px]">
              <label
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                  !freeMode
                    ? "border-coral bg-coral/5 text-coral font-medium"
                    : "border-stone-200 text-stone-500 hover:border-stone-300"
                }`}
              >
                <input
                  type="radio"
                  name="pairing-mode"
                  checked={!freeMode}
                  onChange={() => setFreeMode(false)}
                  className="accent-coral"
                />
                Gastrowheel
              </label>
              <label
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                  freeMode
                    ? "border-coral bg-coral/5 text-coral font-medium"
                    : "border-stone-200 text-stone-500 hover:border-stone-300"
                }`}
              >
                <input
                  type="radio"
                  name="pairing-mode"
                  checked={freeMode}
                  onChange={() => setFreeMode(true)}
                  className="accent-coral"
                />
                Free Pairing
              </label>
            </div>
          </div>

          {/* Center: Ingredients (main scrollable content) */}
          <div className="min-w-0">
            <div
              ref={ingredientScrollRef}
              className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1 -mr-1 scrollbar-thin"
            >
              <IngredientGrid />
            </div>
          </div>

          {/* Right: Dish Builder + Suggestions */}
          <div className="hidden lg:block lg:sticky lg:top-[200px] lg:self-start space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-thin pr-1">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-stone-200/60 p-4">
              <DishBuilder />
            </div>
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
                <h2 className="font-heading text-lg font-semibold text-stone-800">
                  Your Dish
                </h2>
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
