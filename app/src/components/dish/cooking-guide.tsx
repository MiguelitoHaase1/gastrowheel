"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, ChevronDown, Flame, ScrollText } from "lucide-react";
import { useDishStore } from "@/store/dish-store";
import { cookingComponents, recipeNotes } from "@/lib/data";
import { TAG_TO_MODULES } from "@gastrowheel/data";
import type { CookingComponent, RecipeNote, RecipeTag } from "@gastrowheel/data";

/**
 * Heuristic to match recipe notes by checking if any ingredient name
 * or recipe tag relates to a known recipe name.
 */
function findMatchingRecipes(
  ingredientNames: string[],
  recipeTags: RecipeTag[],
): RecipeNote[] {
  const searchTerms = new Set([
    ...ingredientNames.map((n) => n.toLowerCase()),
    ...recipeTags.map((t) => t.toLowerCase()),
  ]);

  return recipeNotes.filter((r) => {
    if (!r.recipeName || !r.fullRecipeEn) return false;
    const name = r.recipeName.toLowerCase();
    // Direct match on recipe name
    for (const term of searchTerms) {
      if (name.includes(term) || term.includes(name)) return true;
    }
    return false;
  });
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-stone-50"
      >
        {icon}
        <span className="flex-1 font-heading text-sm font-semibold text-stone-700">
          {title}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={16} className="text-stone-400" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            <div className="border-t border-stone-100 px-4 py-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CookingGuide() {
  const selections = useDishStore((s) => s.selections);

  // Collect all unique recipe tags and ingredient names from selections
  const { allTags, ingredientNames } = useMemo(() => {
    const tagSet = new Set<RecipeTag>();
    const names: string[] = [];
    for (const sel of selections) {
      names.push(sel.ingredient.name);
      for (const tag of sel.ingredient.recipeTags) {
        tagSet.add(tag);
      }
    }
    return { allTags: Array.from(tagSet), ingredientNames: names };
  }, [selections]);

  // Find matching cooking components based on recipe tags
  const matchedComponents = useMemo(() => {
    if (allTags.length === 0) return [];

    const moduleNames = new Set<string>();
    for (const tag of allTags) {
      const modules = TAG_TO_MODULES[tag];
      if (modules) {
        for (const m of modules) moduleNames.add(m);
      }
    }

    // Also include generic components that always apply when cooking
    moduleNames.add("Add");

    const matched: { component: CookingComponent; fromTags: RecipeTag[] }[] = [];

    for (const comp of cookingComponents) {
      if (moduleNames.has(comp.module)) {
        const fromTags = allTags.filter(
          (t) => TAG_TO_MODULES[t]?.includes(comp.module),
        );
        matched.push({ component: comp, fromTags });
      }
    }

    return matched;
  }, [allTags]);

  // Find matching full recipes
  const matchedRecipes = useMemo(
    () => findMatchingRecipes(ingredientNames, allTags),
    [ingredientNames, allTags],
  );

  // Empty state
  if (selections.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white/60 p-6 text-center">
        <BookOpen className="mx-auto mb-3 text-stone-300" size={32} />
        <h3 className="font-heading text-base font-semibold text-stone-500">
          Cooking Guide
        </h3>
        <p className="mt-1 text-sm text-stone-400">
          As you select ingredients, cooking steps and recipes will appear here.
        </p>
      </div>
    );
  }

  // No matching components or recipes
  if (matchedComponents.length === 0 && matchedRecipes.length === 0) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white/60 p-6 text-center">
        <Flame className="mx-auto mb-3 text-stone-300" size={32} />
        <h3 className="font-heading text-base font-semibold text-stone-500">
          No Cooking Steps Yet
        </h3>
        <p className="mt-1 text-sm text-stone-400">
          Your current ingredients don't match specific cooking techniques.
          Try adding more variety to unlock guided steps.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <BookOpen className="text-coral" size={18} />
        <h2 className="font-heading text-lg font-semibold text-stone-800">
          Cooking Guide
        </h2>
      </div>

      {/* Active recipe tags */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-coral/10 px-2.5 py-0.5 text-[11px] font-medium text-coral-dark"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Cooking steps from matched components */}
      {matchedComponents.length > 0 && (
        <CollapsibleSection
          title={`Cooking Steps (${matchedComponents.length})`}
          icon={<Flame size={16} className="text-coral" />}
          defaultOpen
        >
          <ol className="space-y-3">
            {matchedComponents.map(({ component, fromTags }, i) => (
              <motion.li
                key={component.module}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.15, delay: i * 0.05 }}
                className="flex gap-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-coral/10 text-xs font-semibold text-coral">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-700">
                    {component.module}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-stone-500">
                    {component.fullTextEn ?? component.shortcutEn ?? "No instructions available."}
                  </p>
                  {component.shortcutEn && component.fullTextEn && (
                    <p className="mt-1 text-xs italic text-stone-400">
                      Shortcut: {component.shortcutEn}
                    </p>
                  )}
                  {fromTags.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      {fromTags.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-400"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.li>
            ))}
          </ol>
        </CollapsibleSection>
      )}

      {/* Full recipes */}
      {matchedRecipes.length > 0 &&
        matchedRecipes.map((recipe) => (
          <CollapsibleSection
            key={recipe.recipeName}
            title={`Recipe: ${recipe.recipeName}`}
            icon={<ScrollText size={16} className="text-coral" />}
          >
            <p className="text-sm leading-relaxed text-stone-600">
              {recipe.fullRecipeEn}
            </p>
          </CollapsibleSection>
        ))}
    </div>
  );
}
