"use client";

import Image from "next/image";
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
    return (
      <div
        className="rounded-lg flex items-center justify-center overflow-hidden"
        style={{
          width: size,
          height: size,
          backgroundColor: colors?.bg ?? "#f5f5f4",
        }}
      >
        <Image
          src={`/icons/${ingredient.id}.svg`}
          alt={ingredient.name}
          width={size - 8}
          height={size - 8}
          className="object-contain"
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
