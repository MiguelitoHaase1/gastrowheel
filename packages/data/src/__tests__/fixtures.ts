import type { Ingredient } from "../types";

/** Common Mediterranean tomato */
export const tomato: Ingredient = {
  id: 1,
  iconId: 1,
  name: "Tomato",
  roles: ["Lightbulks"],
  roleCategory: "Bulk",
  dietary: ["Glutenfree", "Vegan", "Vegetarian", "LactoseFree", "NutFree"],
  tastes: ["Sour", "Umami"],
  aromas: ["FRUITY", "GREEN"],
  seasons: ["Summer", "Fall"],
  regions: ["Mediterranean", "LatinAmerican"],
  cookingStyles: ["FastAndFresh"],
  recipeTags: ["Sofrito", "Raw"],
  wheelSegments: ["Sour", "Fresh"],
  commonIn: ["en", "da", "de", "es"],
  hasIcon: true,
};

/** Common European onion */
export const onion: Ingredient = {
  id: 2,
  iconId: 2,
  name: "Onion",
  roles: ["Alliums"],
  roleCategory: "Boost",
  dietary: ["Glutenfree", "Vegan", "Vegetarian", "LactoseFree", "NutFree"],
  tastes: ["Sweet", "Umami"],
  aromas: ["SULFUROUS", "AROMATIC_SPICY"],
  seasons: ["Spring", "Summer", "Fall", "Winter"],
  regions: ["Mediterranean", "European"],
  cookingStyles: ["SlowAndDeep", "FastAndFresh"],
  recipeTags: ["Sofrito", "Aromatics"],
  wheelSegments: ["Umami", "Soft"],
  commonIn: ["en", "da", "de", "es"],
  hasIcon: true,
};

/** Common spice — cumin */
export const cumin: Ingredient = {
  id: 3,
  iconId: 3,
  name: "Cumin",
  roles: ["Spices"],
  roleCategory: "Boost",
  dietary: ["Glutenfree", "Vegan", "Vegetarian", "LactoseFree", "NutFree"],
  tastes: ["AromaBomb"],
  aromas: ["AROMATIC_SPICY", "WOODY", "NUTTY"],
  seasons: ["Spring", "Summer", "Fall", "Winter"],
  regions: ["SouthAsian", "MiddleEastern", "LatinAmerican"],
  cookingStyles: ["SlowAndDeep"],
  recipeTags: ["Toasting"],
  wheelSegments: ["Aroma", "Spicy"],
  commonIn: ["en", "de"],
  hasIcon: false,
};

/** Exotic ingredient — galangal */
export const galangal: Ingredient = {
  id: 4,
  iconId: 4,
  name: "Galangal",
  roles: ["Spices"],
  roleCategory: "Boost",
  dietary: ["Glutenfree", "Vegan", "Vegetarian", "LactoseFree", "NutFree"],
  tastes: ["Spicy", "AromaBomb"],
  aromas: ["AROMATIC_SPICY", "CITRUS", "WOODY"],
  seasons: ["Spring", "Summer", "Fall", "Winter"],
  regions: ["EastAsian"],
  cookingStyles: ["FastAndFresh"],
  recipeTags: ["Aromatics"],
  wheelSegments: ["Aroma", "Spicy"],
  commonIn: [],
  hasIcon: false,
};

/** Exotic — saffron */
export const saffron: Ingredient = {
  id: 5,
  iconId: 5,
  name: "Saffron",
  roles: ["Spices"],
  roleCategory: "Boost",
  dietary: ["Glutenfree", "Vegan", "Vegetarian", "LactoseFree", "NutFree"],
  tastes: ["Bitter", "AromaBomb"],
  aromas: ["FLORAL", "HERBAL"],
  seasons: ["Fall"],
  regions: ["MiddleEastern", "Mediterranean"],
  cookingStyles: ["SlowAndDeep"],
  recipeTags: ["Boil"],
  wheelSegments: ["Aroma", "Bitter"],
  commonIn: [],
  hasIcon: true,
};

/** Contains nuts — walnut */
export const walnut: Ingredient = {
  id: 6,
  iconId: 6,
  name: "Walnut",
  roles: ["Nuts"],
  roleCategory: "Top",
  dietary: ["Glutenfree", "Vegan", "Vegetarian", "LactoseFree"],
  tastes: ["Bitter", "Crunchy"],
  aromas: ["NUTTY", "ROASTED", "WOODY"],
  seasons: ["Fall", "Winter"],
  regions: ["European", "MiddleEastern"],
  cookingStyles: ["FastAndFresh"],
  recipeTags: ["Toasting", "Raw"],
  wheelSegments: ["Crunch", "Bitter"],
  commonIn: ["en", "de"],
  hasIcon: true,
};

/** Olive oil — splash category */
export const oliveOil: Ingredient = {
  id: 7,
  iconId: 7,
  name: "Olive Oil",
  roles: ["Oils"],
  roleCategory: "Splash",
  dietary: ["Glutenfree", "Vegan", "Vegetarian", "LactoseFree", "NutFree"],
  tastes: ["Bitter"],
  aromas: ["GREEN", "FRUITY", "HERBAL"],
  seasons: ["Spring", "Summer", "Fall", "Winter"],
  regions: ["Mediterranean"],
  cookingStyles: ["FastAndFresh", "SlowAndDeep"],
  recipeTags: ["Dressing", "Sofrito"],
  wheelSegments: ["Oil"],
  commonIn: ["en", "da", "de", "es"],
  hasIcon: true,
};

/** Exotic — sumac, no common markets */
export const sumac: Ingredient = {
  id: 8,
  iconId: 8,
  name: "Sumac",
  roles: ["Spices"],
  roleCategory: "Boost",
  dietary: ["Glutenfree", "Vegan", "Vegetarian", "LactoseFree", "NutFree"],
  tastes: ["Sour", "AromaBomb"],
  aromas: ["CITRUS", "FRUITY"],
  seasons: ["Spring", "Summer", "Fall", "Winter"],
  regions: ["MiddleEastern"],
  cookingStyles: ["FastAndFresh"],
  recipeTags: ["Raw"],
  wheelSegments: ["Sour", "Aroma"],
  commonIn: [],
  hasIcon: false,
};

/** Plain noodles — Soft segment */
export const noodles: Ingredient = {
  id: 203,
  iconId: 203,
  name: "noodles",
  roles: ["Starch"],
  roleCategory: "Bulk",
  dietary: ["Vegan", "Vegetarian", "LactoseFree", "NutFree"],
  tastes: [],
  aromas: ["NUTTY"],
  seasons: ["Spring", "Summer", "Fall", "Winter"],
  regions: ["EastAsian"],
  cookingStyles: ["FastAndFresh"],
  recipeTags: ["Boil"],
  wheelSegments: ["Soft"],
  commonIn: ["en", "da", "de", "es"],
  hasIcon: false,
};

/** Rice noodles — Soft segment (variant of noodles) */
export const riceNoodles: Ingredient = {
  id: 721,
  iconId: 721,
  name: "rice noodles",
  roles: ["Starch"],
  roleCategory: "Bulk",
  dietary: ["Glutenfree", "Vegan", "Vegetarian", "LactoseFree", "NutFree"],
  tastes: [],
  aromas: [],
  seasons: ["Spring", "Summer", "Fall", "Winter"],
  regions: ["EastAsian"],
  cookingStyles: ["FastAndFresh"],
  recipeTags: ["Boil"],
  wheelSegments: ["Soft"],
  commonIn: [],
  hasIcon: false,
};

/** Soba noodles — Soft segment (variant of noodles) */
export const sobaNoodles: Ingredient = {
  id: 751,
  iconId: 751,
  name: "soba noodles",
  roles: ["Starch"],
  roleCategory: "Bulk",
  dietary: ["Vegan", "Vegetarian", "LactoseFree", "NutFree"],
  tastes: [],
  aromas: [],
  seasons: ["Spring", "Summer", "Fall", "Winter"],
  regions: ["EastAsian"],
  cookingStyles: ["FastAndFresh"],
  recipeTags: ["Boil"],
  wheelSegments: ["Soft"],
  commonIn: [],
  hasIcon: false,
};

/** All test ingredients as an array */
export const allTestIngredients: Ingredient[] = [
  tomato,
  onion,
  cumin,
  galangal,
  saffron,
  walnut,
  oliveOil,
  sumac,
  noodles,
  riceNoodles,
  sobaNoodles,
];
