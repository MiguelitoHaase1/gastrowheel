"use client";

import { WALK_ORDER, SEGMENT_COLORS } from "@gastrowheel/data";
import { useDishStore } from "@/store/dish-store";
import { Check } from "lucide-react";

export function WalkGuide() {
  const completedSegments = useDishStore((s) => s.completedSegments);
  const currentSegment = useDishStore((s) => s.currentSegment);
  const setCurrentSegment = useDishStore((s) => s.setCurrentSegment);
  const stopAutoWalk = useDishStore((s) => s.stopAutoWalk);
  const selections = useDishStore((s) => s.selections);
  const suggestedSegment = useDishStore((s) => s.suggestedSegment);

  const suggested = suggestedSegment();
  const completedCount = completedSegments.size;
  const progress = (completedCount / WALK_ORDER.length) * 100;

  return (
    <div className="py-3 space-y-2.5">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-stone-700">
          {completedCount === 0
            ? "Start building your dish"
            : completedCount === WALK_ORDER.length
              ? "All components filled!"
              : `${completedCount} of ${WALK_ORDER.length} components`}
        </p>
        {selections.length > 0 && (
          <p className="text-xs text-stone-400 tabular-nums">
            {selections.length} ingredient{selections.length !== 1 ? "s" : ""} selected
          </p>
        )}
      </div>

      {/* Progress bar track */}
      <div className="relative h-2 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-coral rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Segment buttons */}
      <div className="flex gap-1">
        {WALK_ORDER.map((seg) => {
          const colors = SEGMENT_COLORS[seg];
          const isComplete = completedSegments.has(seg);
          const isCurrent = currentSegment === seg;
          const isSuggested = suggested === seg && !isCurrent;

          return (
            <button
              key={seg}
              onClick={() => { stopAutoWalk(); setCurrentSegment(seg); }}
              title={seg}
              className={`relative flex-1 h-8 rounded-md text-[10px] font-medium transition-all flex items-center justify-center gap-0.5 border ${
                isCurrent
                  ? "shadow-sm"
                  : isSuggested
                    ? "segment-pulse"
                    : isComplete
                      ? ""
                      : "opacity-50 hover:opacity-75"
              }`}
              style={{
                backgroundColor: isCurrent || isComplete ? colors.bg : "white",
                borderColor: isCurrent ? colors.accent : isComplete ? colors.accent + "60" : "#e7e5e4",
                color: colors.text,
                ...(isCurrent ? { boxShadow: `0 0 0 2px white, 0 0 0 4px ${colors.accent}` } : {}),
              }}
            >
              {isComplete && <Check size={10} strokeWidth={3} />}
              <span className="hidden sm:inline">{seg}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
