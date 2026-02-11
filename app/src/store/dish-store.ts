import { create } from "zustand";
import type {
  WheelSegment,
  Ingredient,
  DishSelection,
  DietaryFlag,
  Season,
  Region,
} from "@gastrowheel/data";
import { WALK_ORDER } from "@gastrowheel/data";

type CommonalityFilter = "all" | "common" | "exotic";

interface DishStore {
  selections: DishSelection[];
  currentSegment: WheelSegment | null;
  completedSegments: Set<WheelSegment>;
  walkIndex: number;
  guidedWalkDone: boolean;
  freeMode: boolean;

  // Filters
  dietaryFilters: DietaryFlag[];
  seasonFilters: Season[];
  regionFilters: Region[];
  searchQuery: string;
  commonalityFilter: CommonalityFilter;

  // Actions
  setCurrentSegment: (segment: WheelSegment) => void;
  setFreeMode: (enabled: boolean) => void;
  addIngredient: (segment: WheelSegment, ingredient: Ingredient) => void;
  removeIngredient: (segment: WheelSegment, ingredientId: number) => void;
  reset: () => void;
  suggestedSegment: () => WheelSegment;

  // Filter actions
  toggleDietaryFilter: (flag: DietaryFlag) => void;
  toggleSeasonFilter: (season: Season) => void;
  toggleRegionFilter: (region: Region) => void;
  setSearchQuery: (query: string) => void;
  setCommonalityFilter: (filter: CommonalityFilter) => void;
  clearFilters: () => void;
}

export const useDishStore = create<DishStore>((set, get) => ({
  selections: [],
  currentSegment: WALK_ORDER[0],
  completedSegments: new Set(),
  walkIndex: 0,
  guidedWalkDone: false,
  freeMode: false,

  dietaryFilters: [],
  seasonFilters: [],
  regionFilters: [],
  searchQuery: "",
  commonalityFilter: "common",

  setCurrentSegment: (segment) => set({ currentSegment: segment }),

  setFreeMode: (enabled) => set({ freeMode: enabled }),

  addIngredient: (segment, ingredient) =>
    set((state) => {
      const alreadySelected = state.selections.some(
        (s) => s.segment === segment && s.ingredient.id === ingredient.id,
      );
      if (alreadySelected) return state;

      const newSelections = [...state.selections, { segment, ingredient }];
      const newCompleted = new Set(state.completedSegments);
      newCompleted.add(segment);

      // Auto-advance to next guided segment if still in guided walk
      let nextSegment: WheelSegment | null = state.currentSegment;
      let nextWalkIndex = state.walkIndex;
      let nextGuidedDone = state.guidedWalkDone;

      if (!state.guidedWalkDone) {
        const currentWalkIdx = WALK_ORDER.indexOf(segment);
        if (currentWalkIdx >= 0 && currentWalkIdx >= state.walkIndex) {
          const next = currentWalkIdx + 1;
          if (next < WALK_ORDER.length) {
            nextSegment = WALK_ORDER[next];
            nextWalkIndex = next;
          } else {
            nextGuidedDone = true;
          }
        }
      }

      return {
        selections: newSelections,
        completedSegments: newCompleted,
        currentSegment: nextSegment,
        walkIndex: nextWalkIndex,
        guidedWalkDone: nextGuidedDone,
      };
    }),

  removeIngredient: (segment, ingredientId) =>
    set((state) => {
      const newSelections = state.selections.filter(
        (s) => !(s.segment === segment && s.ingredient.id === ingredientId),
      );
      const segmentStillHasItems = newSelections.some((s) => s.segment === segment);
      const newCompleted = new Set(state.completedSegments);
      if (!segmentStillHasItems) newCompleted.delete(segment);
      return { selections: newSelections, completedSegments: newCompleted };
    }),

  reset: () =>
    set({
      selections: [],
      currentSegment: WALK_ORDER[0],
      completedSegments: new Set(),
      walkIndex: 0,
      guidedWalkDone: false,
      freeMode: false,
      dietaryFilters: [],
      seasonFilters: [],
      regionFilters: [],
      searchQuery: "",
      commonalityFilter: "common",
    }),

  suggestedSegment: () => {
    const state = get();
    if (state.guidedWalkDone) {
      return state.currentSegment ?? WALK_ORDER[0];
    }
    for (let i = state.walkIndex; i < WALK_ORDER.length; i++) {
      if (!state.completedSegments.has(WALK_ORDER[i])) {
        return WALK_ORDER[i];
      }
    }
    return WALK_ORDER[state.walkIndex];
  },

  toggleDietaryFilter: (flag) =>
    set((state) => ({
      dietaryFilters: state.dietaryFilters.includes(flag)
        ? state.dietaryFilters.filter((f) => f !== flag)
        : [...state.dietaryFilters, flag],
    })),

  toggleSeasonFilter: (season) =>
    set((state) => ({
      seasonFilters: state.seasonFilters.includes(season)
        ? state.seasonFilters.filter((s) => s !== season)
        : [...state.seasonFilters, season],
    })),

  toggleRegionFilter: (region) =>
    set((state) => ({
      regionFilters: state.regionFilters.includes(region)
        ? state.regionFilters.filter((r) => r !== region)
        : [...state.regionFilters, region],
    })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setCommonalityFilter: (filter) => set({ commonalityFilter: filter }),

  clearFilters: () =>
    set({
      dietaryFilters: [],
      seasonFilters: [],
      regionFilters: [],
      searchQuery: "",
      commonalityFilter: "common",
    }),
}));
