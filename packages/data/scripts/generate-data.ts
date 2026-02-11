/**
 * Generates TypeScript data modules from gastrowheel_unified.csv and excel_parsed.json.
 * Output goes to packages/data/generated/
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { parse } from "csv-parse/sync";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");
const OUT = resolve(__dirname, "../generated");

mkdirSync(OUT, { recursive: true });

// --- Parse CSV ---
const csvPath = resolve(ROOT, "gastrowheel_unified.csv");
const csvContent = readFileSync(csvPath, "utf-8");
const records: Record<string, string>[] = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

console.log(`Parsed ${records.length} ingredients from CSV`);

const DISH_ROLES = [
  "Fibres", "Starch", "Protein", "Lightbulks", "Spices", "Alliums",
  "Fruittops", "Seeds", "Nuts", "Bread", "Cheesetops", "Herbs",
  "OtherTops", "Oils", "Fats", "LiquidAromas",
];

const ROLE_CATEGORIES: Record<string, string> = {
  Fibres: "Bulk", Starch: "Bulk", Protein: "Bulk", Lightbulks: "Bulk",
  Spices: "Boost", Alliums: "Boost",
  Fruittops: "Top", Seeds: "Top", Nuts: "Top", Bread: "Top",
  Cheesetops: "Top", Herbs: "Top", OtherTops: "Top",
  Oils: "Splash", Fats: "Splash", LiquidAromas: "Splash",
};

const DIETARY_FLAGS = [
  "Glutenfree", "Vegan", "Vegetarian", "LactoseFree", "Diabetic", "NutFree", "FODMAPS",
];

const TASTE_TAGS = ["Umami", "Sweet", "Bitter", "Sour", "Salty", "Spicy", "Crunchy", "AromaBomb"];

const AROMA_TAGS = [
  "FRUITY", "GREEN", "FLORAL", "SULFUROUS", "HERBAL", "AROMATIC_SPICY",
  "WOODY", "NUTTY", "ROASTED", "SMOKEY", "CITRUS", "MEATY", "MARINE", "CREAMY", "CHEESY",
];

const SEASONS = ["Spring", "Summer", "Fall", "Winter"];
const REGIONS = ["Mediterranean", "SouthAsian", "EastAsian", "LatinAmerican", "European", "MiddleEastern", "Exotic"];
const COOKING_STYLES = ["SlowAndDeep", "FastAndFresh"];
const RECIPE_TAGS = ["Sofrito", "Taco", "Aromatics", "Boil", "Raw", "Dressing", "Toasting"];

const WHEEL_COLS: Record<string, string> = {
  Sour_wheel: "Sour", Umami_wheel: "Umami", Oil_wheel: "Oil", Crunch_wheel: "Crunch",
  Sweet_wheel: "Sweet", Aroma_wheel: "Aroma", Fresh_wheel: "Fresh",
  Soft_wheel: "Base", Bitter_wheel: "Bitter", Spicy_wheel: "Spicy",
};

const MARKET_COLS = ["common_en", "common_da", "common_de", "common_es"];
const MARKET_MAP: Record<string, string> = {
  common_en: "en", common_da: "da", common_de: "de", common_es: "es",
};

function isX(val: string): boolean {
  return val?.trim().toLowerCase() === "x";
}

interface IngredientData {
  id: number;
  iconId: number;
  name: string;
  roles: string[];
  roleCategory: string;
  dietary: string[];
  tastes: string[];
  aromas: string[];
  seasons: string[];
  regions: string[];
  cookingStyles: string[];
  recipeTags: string[];
  wheelSegments: string[];
  commonIn: string[];
  hasIcon: boolean;
}

const ingredients: IngredientData[] = records.map((row, index) => {
  const roles = DISH_ROLES.filter((r) => isX(row[r]));
  const primaryRole = roles[0] ?? "OtherTops";
  const roleCategory = ROLE_CATEGORIES[primaryRole] ?? "Top";

  return {
    id: index + 1,
    iconId: parseInt(row.id, 10),
    name: row.name,
    roles,
    roleCategory,
    dietary: DIETARY_FLAGS.filter((f) => isX(row[f])),
    tastes: TASTE_TAGS.filter((t) => isX(row[t])),
    aromas: AROMA_TAGS.filter((a) => isX(row[a])),
    seasons: SEASONS.filter((s) => isX(row[s])),
    regions: REGIONS.filter((r) => isX(row[r])),
    cookingStyles: COOKING_STYLES.filter((cs) => isX(row[cs])),
    recipeTags: RECIPE_TAGS.filter((rt) => isX(row[rt])),
    wheelSegments: Object.entries(WHEEL_COLS)
      .filter(([col]) => isX(row[col]))
      .map(([, seg]) => seg),
    commonIn: MARKET_COLS.filter((col) => isX(row[col])).map((col) => MARKET_MAP[col]),
    hasIcon: isX(row.has_icon),
  };
});

// Build lookup maps
const byId = new Map<number, IngredientData>();
const bySegment = new Map<string, number[]>();
for (const ing of ingredients) {
  byId.set(ing.id, ing);
  for (const seg of ing.wheelSegments) {
    if (!bySegment.has(seg)) bySegment.set(seg, []);
    bySegment.get(seg)!.push(ing.id);
  }
}

// --- Parse dish data ---
const excelPath = resolve(ROOT, "scripts/excel_parsed.json");
const excelData = JSON.parse(readFileSync(excelPath, "utf-8"));

const descriptions = excelData.dish_descriptions.descriptions ?? [];
const notes = excelData.dish_descriptions.notes ?? [];
const cookingComponents = excelData.dish_descriptions.cooking_components ?? [];
const recipeNotes = excelData.dish_descriptions.recipe_notes ?? [];

// --- Write output files ---

// ingredients.ts
const ingredientsTs = `// Auto-generated — do not edit. Run "pnpm generate-data" to regenerate.
import type { Ingredient } from "../src/types";

export const ingredients: Ingredient[] = ${JSON.stringify(ingredients, null, 2)} as const satisfies Ingredient[];

export const ingredientById = new Map<number, Ingredient>(
  ingredients.map((i) => [i.id, i])
);

export const ingredientsBySegment: Record<string, number[]> = ${JSON.stringify(
  Object.fromEntries(bySegment),
  null,
  2,
)};
`;

writeFileSync(resolve(OUT, "ingredients.ts"), ingredientsTs);
console.log(`Generated ingredients.ts (${ingredients.length} ingredients)`);

// dishes.ts
const dishesTs = `// Auto-generated — do not edit. Run "pnpm generate-data" to regenerate.
import type { DishDescription, DishNote, CookingComponent, RecipeNote } from "../src/types";

export const dishDescriptions: DishDescription[] = ${JSON.stringify(
  descriptions.map((d: any) => ({
    dishName: d.dish_name,
    dishPk: d.dish_pk,
    descriptions: d.descriptions,
  })),
  null,
  2,
)};

export const dishNotes: DishNote[] = ${JSON.stringify(
  notes.map((n: any) => ({
    dishName: n.dish_name,
    dishPk: n.dish_pk,
    notes: n.notes,
  })),
  null,
  2,
)};

export const cookingComponents: CookingComponent[] = ${JSON.stringify(
  cookingComponents.map((c: any) => ({
    module: c.module,
    fullTextEn: c.full_text_en,
    shortcutEn: c.shortcut_en,
    shortcutDa: c.shortcut_da ?? undefined,
  })),
  null,
  2,
)};

export const recipeNotes: RecipeNote[] = ${JSON.stringify(
  recipeNotes.map((r: any) => ({
    recipeName: r.recipe_name,
    fullRecipeEn: r.full_recipe_en,
  })),
  null,
  2,
)};
`;

writeFileSync(resolve(OUT, "dishes.ts"), dishesTs);
console.log(
  `Generated dishes.ts (${descriptions.length} descriptions, ${notes.length} notes, ${cookingComponents.length} components, ${recipeNotes.length} recipes)`,
);

// Stats
const withWheel = ingredients.filter((i) => i.wheelSegments.length > 0).length;
const multiWheel = ingredients.filter((i) => i.wheelSegments.length > 1).length;
const withIcon = ingredients.filter((i) => i.hasIcon).length;
console.log(`\nStats:`);
console.log(`  With wheel segments: ${withWheel}/${ingredients.length}`);
console.log(`  Multi-segment: ${multiWheel}`);
console.log(`  With icons: ${withIcon}`);
for (const [seg, ids] of bySegment) {
  console.log(`  ${seg}: ${ids.length} ingredients`);
}
