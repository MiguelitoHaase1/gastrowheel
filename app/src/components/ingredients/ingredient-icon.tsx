"use client";

import type { Ingredient, WheelSegment } from "@gastrowheel/data";
import { SEGMENT_COLORS } from "@gastrowheel/data";

interface IngredientIconProps {
  ingredient: Ingredient;
  segment?: WheelSegment;
  size?: number;
}

export function IngredientIcon({ ingredient, segment, size = 48 }: IngredientIconProps) {
  const colors = segment ? SEGMENT_COLORS[segment] : null;

  if (ingredient.hasIcon) {
    const imgSize = size - 8;
    return (
      <div
        className="rounded-lg flex items-center justify-center overflow-hidden"
        style={{
          width: size,
          height: size,
          backgroundColor: colors?.bg ?? "#f5f5f4",
        }}
      >
        {/* Use <img> for SVGs — next/image optimization breaks SVGs on Vercel */}
        <img
          src={`/icons/${ingredient.iconId}.svg`}
          alt={ingredient.name}
          width={imgSize}
          height={imgSize}
          className="object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  const initial = ingredient.name.charAt(0).toUpperCase();
  return (
    <div
      className="rounded-lg flex items-center justify-center font-semibold"
      style={{
        width: size,
        height: size,
        backgroundColor: colors?.bg ?? "#f5f5f4",
        color: colors?.text ?? "#525252",
        fontSize: size * 0.4,
      }}
    >
      {initial}
    </div>
  );
}
