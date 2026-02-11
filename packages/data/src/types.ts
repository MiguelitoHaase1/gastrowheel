/** Wheel segment names in display order */
export type WheelSegment =
  | "Sour"
  | "Umami"
  | "Oil"
  | "Crunch"
  | "Sweet"
  | "Aroma"
  | "Fresh"
  | "Soft"
  | "Bitter"
  | "Spicy";

/** Dish component roles */
export type DishRole =
  | "Fibres"
  | "Starch"
  | "Protein"
  | "Lightbulks"
  | "Spices"
  | "Alliums"
  | "Fruittops"
  | "Seeds"
  | "Nuts"
  | "Bread"
  | "Cheesetops"
  | "Herbs"
  | "OtherTops"
  | "Oils"
  | "Fats"
  | "LiquidAromas";

/** Role categories */
export type RoleCategory = "Bulk" | "Boost" | "Top" | "Splash";

/** Dietary flags */
export type DietaryFlag =
  | "Glutenfree"
  | "Vegan"
  | "Vegetarian"
  | "LactoseFree"
  | "Diabetic"
  | "NutFree"
  | "FODMAPS";

/** Taste profile tags */
export type TasteTag =
  | "Umami"
  | "Sweet"
  | "Bitter"
  | "Sour"
  | "Salty"
  | "Spicy"
  | "Crunchy"
  | "AromaBomb";

/** Aroma profile tags */
export type AromaTag =
  | "FRUITY"
  | "GREEN"
  | "FLORAL"
  | "SULFUROUS"
  | "HERBAL"
  | "AROMATIC_SPICY"
  | "WOODY"
  | "NUTTY"
  | "ROASTED"
  | "SMOKEY"
  | "CITRUS"
  | "MEATY"
  | "MARINE"
  | "CREAMY"
  | "CHEESY";

/** Season tags */
export type Season = "Spring" | "Summer" | "Fall" | "Winter";

/** Cuisine region tags */
export type Region =
  | "Mediterranean"
  | "SouthAsian"
  | "EastAsian"
  | "LatinAmerican"
  | "European"
  | "MiddleEastern"
  | "Exotic";

/** Cooking style */
export type CookingStyle = "SlowAndDeep" | "FastAndFresh";

/** Recipe method tags */
export type RecipeTag =
  | "Sofrito"
  | "Taco"
  | "Aromatics"
  | "Boil"
  | "Raw"
  | "Dressing"
  | "Toasting";

/** Supported market/language codes */
export type MarketCode = "en" | "da" | "de" | "es";

/** Supported content languages (superset of market codes) */
export type ContentLanguage = "en" | "da" | "de" | "es" | "lv" | "et" | "lt";

/** Core ingredient record */
export interface Ingredient {
  id: number;
  iconId: number;
  name: string;
  roles: DishRole[];
  roleCategory: RoleCategory;
  dietary: DietaryFlag[];
  tastes: TasteTag[];
  aromas: AromaTag[];
  seasons: Season[];
  regions: Region[];
  cookingStyles: CookingStyle[];
  recipeTags: RecipeTag[];
  wheelSegments: WheelSegment[];
  commonIn: MarketCode[];
  hasIcon: boolean;
}

/** Dish description with multilingual content */
export interface DishDescription {
  dishName: string | null;
  dishPk: number | null;
  descriptions: Partial<Record<ContentLanguage, string>>;
}

/** Dish cooking note */
export interface DishNote {
  dishName: string | null;
  dishPk: number | null;
  notes: Partial<Record<ContentLanguage, string>>;
}

/** Reusable cooking instruction module */
export interface CookingComponent {
  module: string;
  fullTextEn: string | null;
  shortcutEn: string | null;
  shortcutDa?: string | null;
}

/** Composed recipe instruction */
export interface RecipeNote {
  recipeName: string | null;
  fullRecipeEn: string | null;
}

/** Selected ingredient in the dish builder */
export interface DishSelection {
  segment: WheelSegment;
  ingredient: Ingredient;
}

/** Current dish state */
export interface DishState {
  selections: DishSelection[];
  currentSegment: WheelSegment | null;
}

/** Pairing score result */
export interface PairingScore {
  ingredient: Ingredient;
  totalScore: number;
  breakdown: {
    aromaOverlap: number;
    tasteBalance: number;
    regionAffinity: number;
    seasonMatch: number;
    roleDiversity: number;
    commonality: number;
  };
}

/** Filter criteria for ingredient queries */
export interface IngredientFilters {
  dietary?: DietaryFlag[];
  seasons?: Season[];
  regions?: Region[];
  cookingStyles?: CookingStyle[];
  searchQuery?: string;
  commonality?: "all" | "common" | "exotic";
}
