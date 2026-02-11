"use client";

import { useDishStore } from "@/store/dish-store";
import type { DietaryFlag, Region } from "@gastrowheel/data";

const DIETARY_OPTIONS: { value: DietaryFlag; label: string }[] = [
  { value: "Vegan", label: "Vegan" },
  { value: "Vegetarian", label: "Veggie" },
  { value: "Glutenfree", label: "GF" },
  { value: "LactoseFree", label: "LF" },
  { value: "NutFree", label: "Nut-free" },
  { value: "Diabetic", label: "Diabetic" },
  { value: "FODMAPS", label: "FODMAP" },
];

const REGION_OPTIONS: { value: Region; label: string }[] = [
  { value: "Mediterranean", label: "Med" },
  { value: "SouthAsian", label: "S. Asian" },
  { value: "EastAsian", label: "E. Asian" },
  { value: "LatinAmerican", label: "Latin Am." },
  { value: "European", label: "European" },
  { value: "MiddleEastern", label: "Mid-East" },
  { value: "Exotic", label: "Exotic" },
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
      className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap ${
        isActive
          ? "bg-coral text-white border-coral"
          : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
      }`}
    >
      {label}
    </button>
  );
}

export function FilterBar() {
  const dietaryFilters = useDishStore((s) => s.dietaryFilters);
  const regionFilters = useDishStore((s) => s.regionFilters);
  const toggleDietaryFilter = useDishStore((s) => s.toggleDietaryFilter);
  const toggleRegionFilter = useDishStore((s) => s.toggleRegionFilter);
  const clearFilters = useDishStore((s) => s.clearFilters);

  const hasFilters = dietaryFilters.length > 0 || regionFilters.length > 0;

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
      <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider shrink-0">
        Diet
      </span>
      <div className="flex gap-1 shrink-0">
        {DIETARY_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            label={opt.label}
            isActive={dietaryFilters.includes(opt.value)}
            onClick={() => toggleDietaryFilter(opt.value)}
          />
        ))}
      </div>
      <div className="w-px h-4 bg-stone-200 shrink-0" />
      <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider shrink-0">
        Cuisine
      </span>
      <div className="flex gap-1 shrink-0">
        {REGION_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            label={opt.label}
            isActive={regionFilters.includes(opt.value)}
            onClick={() => toggleRegionFilter(opt.value)}
          />
        ))}
      </div>
      {hasFilters && (
        <>
          <div className="w-px h-4 bg-stone-200 shrink-0" />
          <button
            onClick={clearFilters}
            className="text-[11px] text-coral hover:text-coral-dark transition-colors whitespace-nowrap shrink-0"
          >
            Clear
          </button>
        </>
      )}
    </div>
  );
}
