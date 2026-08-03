"use client";

import { motion } from "framer-motion";
import { blockColor } from "./PhysicsEngine";
import type { BuildingOption } from "./GameRenderer";

export function Crane({
  active,
  selected,
  selectedIndex,
  completedFloors,
  isDragging,
}: {
  active: boolean;
  selected: BuildingOption | undefined;
  selectedIndex: number;
  completedFloors: number;
  isDragging: boolean;
}) {
  const targetLeft = selected ? `${12 + selectedIndex * 24}%` : "35%";

  let animateCable = {};
  let transitionCable = {};

  if (active && selected) {
    // Lift, swing horizontally, and drop exactly on the tower height
    const landingHeight = Math.max(15, 82 - completedFloors * 14.5);
    animateCable = {
      left: [targetLeft, targetLeft, "117%"],
      height: ["90%", "22%", `${landingHeight}%`],
      rotate: [0, -3, 0],
    };
    transitionCable = {
      duration: 0.9,
      times: [0, 0.35, 1],
      ease: [0.22, 0.8, 0.25, 1],
    };
  } else if (selected) {
    // Slide horizontally to align with selected block, then descend to grab it
    animateCable = {
      left: targetLeft,
      height: "90%",
      rotate: 0,
    };
    transitionCable = {
      type: "spring",
      stiffness: 120,
      damping: 18,
    };
  } else {
    // Idle swinging state
    animateCable = {
      left: "35%",
      height: "35%",
      rotate: [-1, 1],
    };
    transitionCable = {
      left: { type: "spring", stiffness: 85, damping: 15 },
      height: { type: "spring", stiffness: 85, damping: 15 },
      rotate: { duration: 2.5, repeat: Infinity, repeatType: "mirror" as const },
    };
  }

  return (
    <div className={`real-crane ${active ? "is-active" : ""}`} aria-hidden>
      <div className="real-crane-mast" />
      <div className="real-crane-arm" />
      <motion.div
        className="real-crane-cable"
        animate={animateCable}
        transition={transitionCable}
      >
        <span /> {/* The Hook */}
        {selected && !isDragging && (
          <div
            style={{
              position: "absolute",
              bottom: "-4.2rem",
              left: "calc(50% - 3.6rem)",
              width: "7.2rem",
              height: "4.4rem",
              transformStyle: "preserve-3d",
              pointerEvents: "none",
              transform: active ? "scale(0.85)" : "scale(1)",
              transition: "transform 0.3s ease",
            }}
          >
            <div
              className={`real-building-block block-${blockColor(selectedIndex)}`}
              style={{
                width: "100%",
                height: "100%",
                margin: 0,
                cursor: "default",
              }}
            >
              <div className="block-top-face">
                <i /><i /><i /><i />
              </div>
              <div className="block-front-face" style={{ inset: ".5rem .2rem 0 0", padding: ".4rem" }}>
                <span>{selected.optionText}</span>
              </div>
              <div className="block-side-face" style={{ width: ".7rem", top: ".65rem" }} />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
