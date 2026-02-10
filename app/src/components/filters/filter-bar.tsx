"use client";

import { useDishStore } from "@/store/dish-store";
import type { DietaryFlag, Region } from "@gastrowheel/data";
import { Search, X } from "lucide-react";

const DIETARY_OPTIONS: { value: DietaryFlag; label: string }[] = [
  { value: "Vegan", label: "Vegan" },
  { value: "Vegetarian", label: "Vegetarian" },
  { value: "Glutenfree", label: "Gluten-free" },
  { value: "LactoseFree", label: "Lactose-free" },
  { value: "NutFree", label: "Nut-free" },
  { value: "Diabetic", label: "Diabetic" },
];

const REGION_OPTIONS: { value: Region; label: string }[] = [
  { value: "Mediterranean", label: "Mediterranean" },
  { value: "SouthAsian", label: "South Asian" },
  { value: "EastAsian", label: "East Asian" },
  { value: "LatinAmerican", label: "Latin American" },
  { value: "European", label: "European" },
  { value: "MiddleEastern", label: "Middle Eastern" },
];

function FilterChip({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
        isActive
          ? "bg-coral text-white border-coral"
          : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
      }`}
    >
      {label}
    </button>
  );
}

export function FilterBar() {
  const dietaryFilters = useDishStore((s) => s.dietaryFilters);
  const regionFilters = useDishStore((s) => s.regionFilters);
  const searchQuery = useDishStore((s) => s.searchQuery);
  const toggleDietaryFilter = useDishStore((s) => s.toggleDietaryFilter);
  const toggleRegionFilter = useDishStore((s) => s.toggleRegionFilter);
  const setSearchQuery = useDishStore((s) => s.setSearchQuery);
  const clearFilters = useDishStore((s) => s.clearFilters);

  const hasFilters =
    dietaryFilters.length > 0 ||
    regionFilters.length > 0 ||
    searchQuery.length > 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
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

      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {DIETARY_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              isActive={dietaryFilters.includes(opt.value)}
              onClick={() => toggleDietaryFilter(opt.value)}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {REGION_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              isActive={regionFilters.includes(opt.value)}
              onClick={() => toggleRegionFilter(opt.value)}
            />
          ))}
        </div>
      </div>

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="text-xs text-coral hover:text-coral-dark transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}
