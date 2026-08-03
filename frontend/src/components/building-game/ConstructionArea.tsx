"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { BLOCK_SPRING, blockColor } from "./PhysicsEngine";
import type { BuildingOption } from "./GameRenderer";
import { Crane } from "./Crane";

export const ConstructionArea = forwardRef<HTMLDivElement, {
  completedFloors: number;
  totalFloors: number;
  selected: BuildingOption | undefined;
  selectedIndex: number;
  placing: boolean;
  isDragging: boolean;
  placedColors: string[];
  shake: boolean;
}>(function ConstructionArea({ completedFloors, totalFloors, selected, selectedIndex, placing, isDragging, placedColors, shake }, ref) {
  const visibleRows = completedFloors + 1;
  const floorsTopToBottom = Array.from(
    { length: visibleRows },
    (_, index) => visibleRows - index - 1,
  );
  return (
    <div ref={ref} className={`real-construction-area ${placing ? "is-building" : ""}`}>
      <div className="construction-grid" aria-hidden />
      <div className="construction-scenery" aria-hidden><i /><i /><i /><i /><i /></div>

      <div className="crane-operator-bubble" aria-hidden>
        <span>👷‍♂️</span>
        <div>{placing ? "Steady... easy does it!" : selected ? "Block secured! Ready to drop!" : "Select a block to lift!"}</div>
      </div>

      {selected && !placing && (
        <div className="real-build-laser-guide" aria-hidden />
      )}

      <Crane
        active={placing}
        selected={selected}
        selectedIndex={selectedIndex}
        completedFloors={completedFloors}
        isDragging={isDragging}
      />
      <div
        className={`real-building-frame ${shake ? "is-shaking" : ""}`}
        style={{
          transform: completedFloors > 4 ? `scale(${Math.max(0.48, 5 / (completedFloors + 1))})` : "scale(1)",
          transformOrigin: "bottom center",
          transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
        aria-label={`${completedFloors} completed building floors`}
      >
        <div className="frame-roof"><Sparkles /></div>
        {floorsTopToBottom.map(floor => {
          let color = "";
          if (floor < completedFloors) {
            color = placedColors[floor] || blockColor(floor);
          } else {
            color = selected ? blockColor(selectedIndex) : blockColor(floor);
          }
          return (
            <motion.div
              key={`${completedFloors}-${floor}`}
              initial={floor === completedFloors - 1 ? { y: -45, opacity: 0, scale: 1.08 } : false}
              animate={{ y: 0, opacity: floor < completedFloors ? 1 : .25, scale: 1 }}
              transition={BLOCK_SPRING}
              className={`built-floor floor-${color} ${floor >= completedFloors ? "is-blueprint" : ""}`}
            >
              <i /><i /><i /><i />
            </motion.div>
          );
        })}
        <b>{completedFloors}/{totalFloors}</b>
      </div>
      <div className="construction-foundation" aria-hidden>
        <span /><span /><span /><span /><span /><span />
      </div>

      {placing && (
        <div className="real-build-impact" aria-hidden>
          <Sparkles />{Array.from({ length: 10 }, (_, index) => <i key={index} />)}
        </div>
      )}
    </div>
  );
});
