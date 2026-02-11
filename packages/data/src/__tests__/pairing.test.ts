import { describe, it, expect } from "vitest";
import { jaccard, scorePairing, getPairingSuggestions, applyFilters } from "../pairing";
import {
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
  allTestIngredients,
} from "./fixtures";
import { nameOverlaps } from "../pairing";

// ---------------------------------------------------------------------------
// jaccard
// ---------------------------------------------------------------------------

describe("jaccard", () => {
  it("returns 0 for two empty sets", () => {
    expect(jaccard([], [])).toBe(0);
  });

  it("returns 1 for identical sets", () => {
    expect(jaccard(["a", "b", "c"], ["a", "b", "c"])).toBe(1);
  });

  it("returns 0 for completely disjoint sets", () => {
    expect(jaccard(["a", "b"], ["c", "d"])).toBe(0);
  });

  it("returns correct value for partial overlap", () => {
    // intersection = {b}, union = {a, b, c} → 1/3
    expect(jaccard(["a", "b"], ["b", "c"])).toBeCloseTo(1 / 3);
  });

  it("handles one empty set", () => {
    expect(jaccard(["a"], [])).toBe(0);
    expect(jaccard([], ["a"])).toBe(0);
  });

  it("handles duplicates in input arrays", () => {
    // Sets: {a, b} vs {b, c} → 1/3
    expect(jaccard(["a", "a", "b"], ["b", "c", "c"])).toBeCloseTo(1 / 3);
  });
});

// ---------------------------------------------------------------------------
// applyFilters
// ---------------------------------------------------------------------------

describe("applyFilters", () => {
  it("returns all ingredients with no filters", () => {
    const result = applyFilters(allTestIngredients, {});
    expect(result).toHaveLength(allTestIngredients.length);
  });

  it("filters by dietary — Vegan", () => {
    const result = applyFilters(allTestIngredients, { dietary: ["Vegan"] });
    expect(result).toHaveLength(allTestIngredients.length); // all fixtures are vegan
  });

  it("filters by dietary — NutFree excludes walnut", () => {
    const result = applyFilters(allTestIngredients, { dietary: ["NutFree"] });
    expect(result.find((i) => i.id === walnut.id)).toBeUndefined();
    expect(result).toHaveLength(allTestIngredients.length - 1);
  });

  it("filters by season", () => {
    const result = applyFilters(allTestIngredients, { seasons: ["Summer"] });
    // tomato, onion, cumin, galangal, oliveOil, sumac, noodles, riceNoodles, sobaNoodles have Summer
    expect(result.map((i) => i.name).sort()).toEqual(
      ["Cumin", "Galangal", "Olive Oil", "Onion", "Sumac", "Tomato", "noodles", "rice noodles", "soba noodles"],
    );
  });

  it("filters by region", () => {
    const result = applyFilters(allTestIngredients, { regions: ["EastAsian"] });
    // galangal, noodles, riceNoodles, sobaNoodles are EastAsian
    expect(result).toHaveLength(4);
    expect(result.map((i) => i.name).sort()).toEqual(["Galangal", "noodles", "rice noodles", "soba noodles"]);
  });

  it("filters by searchQuery", () => {
    const result = applyFilters(allTestIngredients, { searchQuery: "tom" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Tomato");
  });

  it("search is case-insensitive", () => {
    const result = applyFilters(allTestIngredients, { searchQuery: "WALNUT" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Walnut");
  });

  it("filters by commonality — common (Danish market)", () => {
    const result = applyFilters(allTestIngredients, { commonality: "common" });
    // Only ingredients with "da" in commonIn: tomato, onion, oliveOil, noodles
    const names = result.map((i) => i.name).sort();
    expect(names).toEqual(["Olive Oil", "Onion", "Tomato", "noodles"]);
  });

  it("filters by commonality — exotic (not in Danish market)", () => {
    const result = applyFilters(allTestIngredients, { commonality: "exotic" });
    // Ingredients without "da": cumin, galangal, saffron, walnut, sumac, riceNoodles, sobaNoodles
    const names = result.map((i) => i.name).sort();
    expect(names).toEqual(["Cumin", "Galangal", "Saffron", "Sumac", "Walnut", "rice noodles", "soba noodles"]);
  });

  it("commonality 'all' returns everything", () => {
    const result = applyFilters(allTestIngredients, { commonality: "all" });
    expect(result).toHaveLength(allTestIngredients.length);
  });

  it("combines multiple filters", () => {
    const result = applyFilters(allTestIngredients, {
      dietary: ["NutFree"],
      seasons: ["Fall"],
      commonality: "common",
    });
    // NutFree removes walnut; Fall: tomato, onion, cumin, saffron, oliveOil, noodles, riceNoodles, sobaNoodles
    // After NutFree: all except walnut
    // Common (da): tomato(da), onion(da), oliveOil(da), noodles(da) — cumin/saffron/riceNoodles/sobaNoodles have no "da"
    expect(result.map((i) => i.name).sort()).toEqual(["Olive Oil", "Onion", "Tomato", "noodles"]);
  });
});

// ---------------------------------------------------------------------------
// scorePairing
// ---------------------------------------------------------------------------

describe("scorePairing", () => {
  it("returns a score structure with breakdown", () => {
    const result = scorePairing(cumin, [tomato]);
    expect(result.ingredient).toBe(cumin);
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.totalScore).toBeLessThanOrEqual(1);
    expect(result.breakdown).toHaveProperty("aromaOverlap");
    expect(result.breakdown).toHaveProperty("tasteBalance");
    expect(result.breakdown).toHaveProperty("regionAffinity");
    expect(result.breakdown).toHaveProperty("seasonMatch");
    expect(result.breakdown).toHaveProperty("roleDiversity");
    expect(result.breakdown).toHaveProperty("commonality");
  });

  it("returns baseline score with empty selection", () => {
    const result = scorePairing(tomato, []);
    // New scoring: commonality * 0.7 + tiebreaker * 0.3
    // tomato has commonality 1.0, so score ≥ 0.7
    expect(result.totalScore).toBeGreaterThan(0.7);
    expect(result.totalScore).toBeLessThanOrEqual(1.0);
    expect(result.breakdown.aromaOverlap).toBe(0);
    expect(result.breakdown.tasteBalance).toBe(0);
  });

  it("scores higher for ingredients with shared aromas", () => {
    // oliveOil aromas: GREEN, FRUITY, HERBAL
    // tomato aromas: FRUITY, GREEN → good overlap
    const goodMatch = scorePairing(oliveOil, [tomato]);
    // galangal aromas: AROMATIC_SPICY, CITRUS, WOODY → no overlap with tomato
    const poorMatch = scorePairing(galangal, [tomato]);
    expect(goodMatch.breakdown.aromaOverlap).toBeGreaterThan(poorMatch.breakdown.aromaOverlap);
  });

  it("commonality score scales with number of markets", () => {
    // tomato has 4 markets, galangal has 0
    const common = scorePairing(tomato, []);
    const exotic = scorePairing(galangal, []);
    expect(common.breakdown.commonality).toBe(1); // 4/4
    expect(exotic.breakdown.commonality).toBe(0); // 0/4
  });

  it("all breakdown values are between 0 and 1", () => {
    for (const candidate of allTestIngredients) {
      const result = scorePairing(candidate, [tomato, onion]);
      for (const [, value] of Object.entries(result.breakdown)) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// getPairingSuggestions
// ---------------------------------------------------------------------------

describe("getPairingSuggestions", () => {
  it("filters by target segment", () => {
    const result = getPairingSuggestions(allTestIngredients, [], "Sour");
    // tomato and sumac are in Sour
    expect(result.every((p) => p.ingredient.wheelSegments.includes("Sour"))).toBe(true);
  });

  it("excludes already-selected ingredients", () => {
    const result = getPairingSuggestions(allTestIngredients, [tomato], "Sour");
    expect(result.find((p) => p.ingredient.id === tomato.id)).toBeUndefined();
  });

  it("respects limit parameter", () => {
    const result = getPairingSuggestions(allTestIngredients, [], "Aroma", undefined, 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("sorts by score descending", () => {
    const result = getPairingSuggestions(allTestIngredients, [tomato], "Aroma");
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].totalScore).toBeGreaterThanOrEqual(result[i].totalScore);
    }
  });

  it("applies filters (commonality)", () => {
    const result = getPairingSuggestions(
      allTestIngredients,
      [],
      "Aroma",
      { commonality: "common" },
    );
    // Only Danish-common ingredients returned; cumin has no "da", so only sumac-like exotics filtered out
    expect(result.every((p) => p.ingredient.commonIn.includes("da"))).toBe(true);
  });

  it("applies dietary filter", () => {
    const result = getPairingSuggestions(
      allTestIngredients,
      [],
      "Crunch",
      { dietary: ["NutFree"] },
    );
    // walnut is in Crunch but not NutFree
    expect(result.find((p) => p.ingredient.id === walnut.id)).toBeUndefined();
  });

  it("returns empty array when no candidates match segment", () => {
    const result = getPairingSuggestions(allTestIngredients, [], "Sweet");
    // none of our fixtures are in Sweet segment
    expect(result).toHaveLength(0);
  });

  it("excludes name variants of selected ingredients", () => {
    // Select "noodles" → "rice noodles" and "soba noodles" should NOT appear
    const result = getPairingSuggestions(allTestIngredients, [noodles], "Base");
    const names = result.map((p) => p.ingredient.name);
    expect(names).not.toContain("noodles");
    expect(names).not.toContain("rice noodles");
    expect(names).not.toContain("soba noodles");
  });

  it("excludes base ingredient when variant is selected", () => {
    // Select "rice noodles" → "noodles" and "soba noodles" should NOT appear
    const result = getPairingSuggestions(allTestIngredients, [riceNoodles], "Base");
    const names = result.map((p) => p.ingredient.name);
    expect(names).not.toContain("noodles");
    expect(names).not.toContain("rice noodles");
    expect(names).not.toContain("soba noodles");
  });
});

// ---------------------------------------------------------------------------
// nameOverlaps
// ---------------------------------------------------------------------------

describe("nameOverlaps", () => {
  it("detects base name contained in variant", () => {
    expect(nameOverlaps("noodles", "rice noodles")).toBe(true);
    expect(nameOverlaps("cheese", "cream cheese")).toBe(true);
    expect(nameOverlaps("pepper", "bell pepper")).toBe(true);
  });

  it("detects variant containing base name", () => {
    expect(nameOverlaps("rice noodles", "noodles")).toBe(true);
    expect(nameOverlaps("cream cheese", "cheese")).toBe(true);
  });

  it("does not match unrelated ingredients", () => {
    expect(nameOverlaps("tomato", "onion")).toBe(false);
    expect(nameOverlaps("rice", "licorice root")).toBe(false);
    expect(nameOverlaps("pepper", "peppermint")).toBe(false);
  });

  it("matches exact names", () => {
    expect(nameOverlaps("noodles", "noodles")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(nameOverlaps("Noodles", "rice noodles")).toBe(true);
    expect(nameOverlaps("CHEESE", "cream cheese")).toBe(true);
  });
});
