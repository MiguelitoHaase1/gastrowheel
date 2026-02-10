import type {
  Ingredient,
  WheelSegment,
  PairingScore,
  AromaTag,
  TasteTag,
  IngredientFilters,
  RoleCategory,
} from "./types";
import { PAIRING_WEIGHTS, ROLE_CATEGORIES } from "./constants";

/** Jaccard similarity: |A ∩ B| / |A ∪ B| */
export function jaccard<T>(a: T[], b: T[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Compute combined aroma profile from selected ingredients */
function combinedAromas(selected: Ingredient[]): AromaTag[] {
  const aromas = new Set<AromaTag>();
  for (const ing of selected) {
    for (const a of ing.aromas) aromas.add(a);
  }
  return [...aromas];
}

/** Compute taste frequency from selected ingredients */
function tasteFrequency(selected: Ingredient[]): Map<TasteTag, number> {
  const freq = new Map<TasteTag, number>();
  for (const ing of selected) {
    for (const t of ing.tastes) {
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }
  }
  return freq;
}

/** Compute role category frequency from selected ingredients */
function roleCategoryFrequency(selected: Ingredient[]): Map<RoleCategory, number> {
  const freq = new Map<RoleCategory, number>();
  for (const ing of selected) {
    for (const role of ing.roles) {
      const cat = ROLE_CATEGORIES[role];
      freq.set(cat, (freq.get(cat) ?? 0) + 1);
    }
  }
  return freq;
}

/** Score aroma overlap: higher = more shared aromas with selection */
function scoreAromaOverlap(candidate: Ingredient, selectedAromas: AromaTag[]): number {
  return jaccard(candidate.aromas, selectedAromas);
}

/** Score taste balance: favor tastes not yet represented */
function scoreTasteBalance(candidate: Ingredient, tasteFreq: Map<TasteTag, number>): number {
  if (candidate.tastes.length === 0) return 0.5;
  const maxFreq = Math.max(1, ...tasteFreq.values());
  let score = 0;
  for (const taste of candidate.tastes) {
    const freq = tasteFreq.get(taste) ?? 0;
    score += 1 - freq / maxFreq;
  }
  return score / candidate.tastes.length;
}

/** Score region affinity: same cuisine region = higher */
function scoreRegionAffinity(candidate: Ingredient, selected: Ingredient[]): number {
  if (candidate.regions.length === 0 || selected.length === 0) return 0.5;
  const selectedRegions = new Set(selected.flatMap((s) => s.regions));
  if (selectedRegions.size === 0) return 0.5;
  let matches = 0;
  for (const r of candidate.regions) {
    if (selectedRegions.has(r)) matches++;
  }
  return matches / candidate.regions.length;
}

/** Score season match */
function scoreSeasonMatch(candidate: Ingredient, selected: Ingredient[]): number {
  if (candidate.seasons.length === 0 || selected.length === 0) return 0.5;
  const selectedSeasons = new Set(selected.flatMap((s) => s.seasons));
  if (selectedSeasons.size === 0) return 0.5;
  let matches = 0;
  for (const s of candidate.seasons) {
    if (selectedSeasons.has(s)) matches++;
  }
  return matches / candidate.seasons.length;
}

/** Score role diversity: favor underrepresented role categories */
function scoreRoleDiversity(
  candidate: Ingredient,
  roleCatFreq: Map<RoleCategory, number>,
): number {
  if (candidate.roles.length === 0) return 0.5;
  const maxFreq = Math.max(1, ...roleCatFreq.values());
  let score = 0;
  for (const role of candidate.roles) {
    const cat = ROLE_CATEGORIES[role];
    const freq = roleCatFreq.get(cat) ?? 0;
    score += 1 - freq / maxFreq;
  }
  return score / candidate.roles.length;
}

/** Score commonality: slightly prefer widely available ingredients */
function scoreCommonality(candidate: Ingredient): number {
  return candidate.commonIn.length / 4;
}

/**
 * Score a candidate ingredient against the current dish selections.
 * Returns a value between 0 and 1.
 */
export function scorePairing(candidate: Ingredient, selected: Ingredient[]): PairingScore {
  if (selected.length === 0) {
    return {
      ingredient: candidate,
      totalScore: 0.5 + scoreCommonality(candidate) * 0.1,
      breakdown: {
        aromaOverlap: 0.5,
        tasteBalance: 0.5,
        regionAffinity: 0.5,
        seasonMatch: 0.5,
        roleDiversity: 0.5,
        commonality: scoreCommonality(candidate),
      },
    };
  }

  const aromas = combinedAromas(selected);
  const tasteFreq = tasteFrequency(selected);
  const roleCatFreq = roleCategoryFrequency(selected);

  const breakdown = {
    aromaOverlap: scoreAromaOverlap(candidate, aromas),
    tasteBalance: scoreTasteBalance(candidate, tasteFreq),
    regionAffinity: scoreRegionAffinity(candidate, selected),
    seasonMatch: scoreSeasonMatch(candidate, selected),
    roleDiversity: scoreRoleDiversity(candidate, roleCatFreq),
    commonality: scoreCommonality(candidate),
  };

  const totalScore =
    breakdown.aromaOverlap * PAIRING_WEIGHTS.aromaOverlap +
    breakdown.tasteBalance * PAIRING_WEIGHTS.tasteBalance +
    breakdown.regionAffinity * PAIRING_WEIGHTS.regionAffinity +
    breakdown.seasonMatch * PAIRING_WEIGHTS.seasonMatch +
    breakdown.roleDiversity * PAIRING_WEIGHTS.roleDiversity +
    breakdown.commonality * PAIRING_WEIGHTS.commonality;

  return { ingredient: candidate, totalScore, breakdown };
}

/**
 * Get pairing suggestions: score all candidates for a target segment,
 * filter by criteria, and sort by score descending.
 */
export function getPairingSuggestions(
  allIngredients: Ingredient[],
  selected: Ingredient[],
  targetSegment: WheelSegment,
  filters?: IngredientFilters,
  limit = 20,
): PairingScore[] {
  const selectedIds = new Set(selected.map((s) => s.id));

  let candidates = allIngredients.filter(
    (ing) => ing.wheelSegments.includes(targetSegment) && !selectedIds.has(ing.id),
  );

  if (filters) {
    candidates = applyFilters(candidates, filters);
  }

  const scored = candidates.map((c) => scorePairing(c, selected));
  scored.sort((a, b) => b.totalScore - a.totalScore);

  return scored.slice(0, limit);
}

/** Apply filters to an ingredient list */
export function applyFilters(
  ingredients: Ingredient[],
  filters: IngredientFilters,
): Ingredient[] {
  let result = ingredients;

  if (filters.dietary?.length) {
    result = result.filter((ing) =>
      filters.dietary!.every((d) => ing.dietary.includes(d)),
    );
  }

  if (filters.seasons?.length) {
    result = result.filter((ing) =>
      filters.seasons!.some((s) => ing.seasons.includes(s)),
    );
  }

  if (filters.regions?.length) {
    result = result.filter((ing) =>
      filters.regions!.some((r) => ing.regions.includes(r)),
    );
  }

  if (filters.cookingStyles?.length) {
    result = result.filter((ing) =>
      filters.cookingStyles!.some((cs) => ing.cookingStyles.includes(cs)),
    );
  }

  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    result = result.filter((ing) => ing.name.toLowerCase().includes(q));
  }

  if (filters.commonality === "common") {
    result = result.filter((ing) => ing.commonIn.length > 0);
  } else if (filters.commonality === "exotic") {
    result = result.filter((ing) => ing.commonIn.length === 0);
  }

  return result;
}
