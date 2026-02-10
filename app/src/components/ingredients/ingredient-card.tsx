"use client";

import { motion } from "framer-motion";
import type { Ingredient, WheelSegment, PairingScore } from "@gastrowheel/data";
import { SEGMENT_COLORS } from "@gastrowheel/data";
import { IngredientIcon } from "./ingredient-icon";
import { Plus, Check } from "lucide-react";

interface IngredientCardProps {
  ingredient: Ingredient;
  segment: WheelSegment;
  pairingScore?: PairingScore;
  isSelected: boolean;
  onToggle: () => void;
}

export function IngredientCard({
  ingredient,
  segment,
  pairingScore,
  isSelected,
  onToggle,
}: IngredientCardProps) {
  const colors = SEGMENT_COLORS[segment];
  const score = pairingScore?.totalScore;

  return (
    <motion.button
      onClick={onToggle}
      className={`relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors w-full ${
        isSelected
          ? "border-current bg-white shadow-sm"
          : "border-transparent bg-white/60 hover:bg-white hover:shadow-sm"
      }`}
      style={{
        borderColor: isSelected ? colors.accent : undefined,
      }}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      <IngredientIcon ingredient={ingredient} segment={segment} size={40} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: colors.text }}>
          {ingredient.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {ingredient.dietary.slice(0, 3).map((d) => (
            <span
              key={d}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500"
            >
              {d === "Glutenfree"
                ? "GF"
                : d === "Vegetarian"
                  ? "Veg"
                  : d === "LactoseFree"
                    ? "LF"
                    : d === "NutFree"
                      ? "NF"
                      : d.slice(0, 3)}
            </span>
          ))}
          {score !== undefined && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: `${colors.accent}20`,
                color: colors.accent,
              }}
            >
              {Math.round(score * 100)}%
            </span>
          )}
        </div>
      </div>

      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
        style={{
          backgroundColor: isSelected ? colors.accent : `${colors.accent}15`,
          color: isSelected ? "white" : colors.accent,
        }}
      >
        {isSelected ? <Check size={14} /> : <Plus size={14} />}
      </div>
    </motion.button>
  );
}
