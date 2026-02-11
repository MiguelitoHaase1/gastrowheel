"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { WheelSegment } from "@gastrowheel/data";
import {
  WHEEL_SEGMENTS,
  SEGMENT_COLORS,
  DEGREES_PER_SEGMENT,
} from "@gastrowheel/data";
import { useDishStore } from "@/store/dish-store";

const SIZE = 400;
const CENTER = SIZE / 2;
const OUTER_R = 170;
const INNER_R = 60;
const LABEL_R = 125;

function polarToXY(angleDeg: number, radius: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CENTER + radius * Math.cos(rad), CENTER + radius * Math.sin(rad)];
}

function arcPath(startAngle: number, endAngle: number, outerR: number, innerR: number): string {
  const [ox1, oy1] = polarToXY(startAngle, outerR);
  const [ox2, oy2] = polarToXY(endAngle, outerR);
  const [ix2, iy2] = polarToXY(endAngle, innerR);
  const [ix1, iy1] = polarToXY(startAngle, innerR);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${ox1} ${oy1}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
    `Z`,
  ].join(" ");
}

interface SegmentProps {
  segment: WheelSegment;
  index: number;
  isActive: boolean;
  isCompleted: boolean;
  isSuggested: boolean;
  selectionCount: number;
  onClick: () => void;
}

function WheelSegmentPath({
  segment,
  index,
  isActive,
  isCompleted,
  isSuggested,
  selectionCount,
  onClick,
}: SegmentProps) {
  const startAngle = index * DEGREES_PER_SEGMENT;
  const endAngle = startAngle + DEGREES_PER_SEGMENT;
  const midAngle = startAngle + DEGREES_PER_SEGMENT / 2;
  const d = arcPath(startAngle, endAngle, OUTER_R, INNER_R);
  const [lx, ly] = polarToXY(midAngle, LABEL_R);
  const colors = SEGMENT_COLORS[segment];

  const fillOpacity = isActive ? 1 : isCompleted ? 0.85 : 0.5;
  const strokeWidth = isActive ? 3 : 1.5;
  const strokeColor = isActive ? colors.accent : isCompleted ? colors.accent : "#d4d4d8";

  return (
    <g
      onClick={onClick}
      className="cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={`${segment} segment${selectionCount > 0 ? `, ${selectionCount} selected` : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <motion.path
        d={d}
        fill={colors.bg}
        fillOpacity={fillOpacity}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        whileHover={{ fillOpacity: 1, scale: 1.02 }}
        transition={{ duration: 0.2 }}
        style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
      />
      {isSuggested && !isActive && (
        <path
          d={d}
          fill={colors.accent}
          fillOpacity={0.15}
          stroke={colors.accent}
          strokeWidth={2}
          strokeDasharray="6 3"
          className="segment-pulse pointer-events-none"
        />
      )}
      <text
        x={lx}
        y={ly}
        textAnchor="middle"
        dominantBaseline="central"
        className="pointer-events-none select-none"
        fill={colors.text}
        fontSize={11}
        fontWeight={isActive ? 700 : 500}
        fontFamily="Inter, system-ui, sans-serif"
      >
        {segment}
      </text>
      {selectionCount > 0 && (
        <g>
          <circle
            cx={lx + 18}
            cy={ly - 8}
            r={8}
            fill={colors.accent}
            className="pointer-events-none"
          />
          <text
            x={lx + 18}
            y={ly - 8}
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize={9}
            fontWeight={700}
            fontFamily="Inter, system-ui, sans-serif"
            className="pointer-events-none"
          >
            {selectionCount}
          </text>
        </g>
      )}
    </g>
  );
}

export function FlavorWheel() {
  const currentSegment = useDishStore((s) => s.currentSegment);
  const completedSegments = useDishStore((s) => s.completedSegments);
  const selections = useDishStore((s) => s.selections);
  const setCurrentSegment = useDishStore((s) => s.setCurrentSegment);
  const suggestedSegment = useDishStore((s) => s.suggestedSegment);

  const suggested = suggestedSegment();

  const handleSegmentClick = (segment: WheelSegment) => {
    setCurrentSegment(segment);
  };

  const selectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const sel of selections) {
      counts[sel.segment] = (counts[sel.segment] ?? 0) + 1;
    }
    return counts;
  }, [selections]);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full max-w-[280px] lg:max-w-[220px]"
        aria-label="Gastrowheel flavor wheel"
      >
        {WHEEL_SEGMENTS.map((segment, i) => (
          <WheelSegmentPath
            key={segment}
            segment={segment}
            index={i}
            isActive={currentSegment === segment}
            isCompleted={completedSegments.has(segment)}
            isSuggested={suggested === segment}
            selectionCount={selectionCounts[segment] ?? 0}
            onClick={() => handleSegmentClick(segment)}
          />
        ))}
        <AnimatePresence>
          {currentSegment && (
            <motion.text
              key={currentSegment}
              x={CENTER}
              y={CENTER}
              textAnchor="middle"
              dominantBaseline="central"
              fill={SEGMENT_COLORS[currentSegment].accent}
              fontSize={18}
              fontWeight={700}
              fontFamily="'Source Serif 4', Georgia, serif"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {currentSegment}
            </motion.text>
          )}
        </AnimatePresence>
        {!currentSegment && (
          <text
            x={CENTER}
            y={CENTER}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#9ca3af"
            fontSize={12}
            fontFamily="Inter, system-ui, sans-serif"
          >
            Pick a segment
          </text>
        )}
      </svg>
    </div>
  );
}
