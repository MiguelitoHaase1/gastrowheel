import type { WheelSegment, DishRole, RoleCategory } from "./types";

/** All 10 wheel segments in display order (clockwise from top) */
export const WHEEL_SEGMENTS: WheelSegment[] = [
  "Sour",
  "Umami",
  "Oil",
  "Crunch",
  "Sweet",
  "Aroma",
  "Fresh",
  "Soft",
  "Bitter",
  "Spicy",
];

/** Suggested walk order for building a balanced dish (8 guided segments) */
export const WALK_ORDER: WheelSegment[] = [
  "Soft",
  "Fresh",
  "Aroma",
  "Oil",
  "Umami",
  "Sour",
  "Sweet",
  "Crunch",
];

/** Colors for each wheel segment */
export const SEGMENT_COLORS: Record<WheelSegment, { bg: string; text: string; accent: string }> = {
  Sour: { bg: "#FEF3C7", text: "#92400E", accent: "#F59E0B" },
  Umami: { bg: "#FDE8E8", text: "#7F1D1D", accent: "#B91C1C" },
  Oil: { bg: "#FEF9C3", text: "#713F12", accent: "#CA8A04" },
  Crunch: { bg: "#ECFCCB", text: "#365314", accent: "#65A30D" },
  Sweet: { bg: "#FCE7F3", text: "#831843", accent: "#DB2777" },
  Aroma: { bg: "#F3E8FF", text: "#581C87", accent: "#9333EA" },
  Fresh: { bg: "#DCFCE7", text: "#14532D", accent: "#16A34A" },
  Soft: { bg: "#FFF7ED", text: "#7C2D12", accent: "#EA580C" },
  Bitter: { bg: "#E0E7FF", text: "#312E81", accent: "#4F46E5" },
  Spicy: { bg: "#FEE2E2", text: "#7F1D1D", accent: "#DC2626" },
};

/** Segment index in the wheel (0-9), used for SVG arc calculation */
export const SEGMENT_INDEX: Record<WheelSegment, number> = {
  Sour: 0,
  Umami: 1,
  Oil: 2,
  Crunch: 3,
  Sweet: 4,
  Aroma: 5,
  Fresh: 6,
  Soft: 7,
  Bitter: 8,
  Spicy: 9,
};

/** CSV column name -> WheelSegment mapping */
export const WHEEL_COLUMN_MAP: Record<string, WheelSegment> = {
  Sour_wheel: "Sour",
  Umami_wheel: "Umami",
  Oil_wheel: "Oil",
  Crunch_wheel: "Crunch",
  Sweet_wheel: "Sweet",
  Aroma_wheel: "Aroma",
  Fresh_wheel: "Fresh",
  Soft_wheel: "Soft",
  Bitter_wheel: "Bitter",
  Spicy_wheel: "Spicy",
};

/** Dish role -> category mapping */
export const ROLE_CATEGORIES: Record<DishRole, RoleCategory> = {
  Fibres: "Bulk",
  Starch: "Bulk",
  Protein: "Bulk",
  Lightbulks: "Bulk",
  Spices: "Boost",
  Alliums: "Boost",
  Fruittops: "Top",
  Seeds: "Top",
  Nuts: "Top",
  Bread: "Top",
  Cheesetops: "Top",
  Herbs: "Top",
  OtherTops: "Top",
  Oils: "Splash",
  Fats: "Splash",
  LiquidAromas: "Splash",
};

/** All dish role column names from CSV */
export const DISH_ROLES: DishRole[] = [
  "Fibres",
  "Starch",
  "Protein",
  "Lightbulks",
  "Spices",
  "Alliums",
  "Fruittops",
  "Seeds",
  "Nuts",
  "Bread",
  "Cheesetops",
  "Herbs",
  "OtherTops",
  "Oils",
  "Fats",
  "LiquidAromas",
];

/** Pairing engine weight configuration */
export const PAIRING_WEIGHTS = {
  aromaOverlap: 0.35,
  tasteBalance: 0.30,
  regionAffinity: 0.15,
  seasonMatch: 0.05,
  roleDiversity: 0.10,
  commonality: 0.05,
} as const;

/** Number of degrees per segment (360 / 10) */
export const DEGREES_PER_SEGMENT = 36;

/** Warm cream background color */
export const COLORS = {
  cream: "#FAF9F6",
  coral: "#D97757",
  coralLight: "#E8A08A",
  coralDark: "#C4603F",
} as const;
