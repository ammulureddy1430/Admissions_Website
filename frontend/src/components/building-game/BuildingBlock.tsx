"use client";

import { motion, type PanInfo } from "framer-motion";
import { GripVertical } from "lucide-react";
import { BLOCK_SPRING, blockColor, dragRotation, isInsideDropZone } from "./PhysicsEngine";
import { optionIdentity, type BuildingOption } from "./GameRenderer";

export function BuildingBlock({
  option,
  index,
  selected,
  disabled,
  placing,
  isDragging,
  onDragStart,
  onDragEnd,
  dropBounds,
  onSelect,
  onPlace,
}: {
  option: BuildingOption;
  index: number;
  selected: boolean;
  disabled: boolean;
  placing: boolean;
  isDragging: boolean;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  dropBounds: DOMRect | null;
  onSelect: (option: BuildingOption) => void;
  onPlace: (option: BuildingOption) => void;
}) {
  const identity = optionIdentity(option);
  const finishDrag = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    onDragEnd();
    if (isInsideDropZone(info.point, dropBounds)) onPlace(option);
  };
  return (
    <motion.div
      layoutId={`building-block-${identity}`}
      drag={!disabled}
      dragSnapToOrigin
      dragElastic={0.12}
      dragMomentum={false}
      onTap={() => onSelect(option)}
      onDragStart={() => onDragStart(identity)}
      onDrag={(_event, info) => {
        const target = info.offset.x;
        document.documentElement.style.setProperty("--block-drag-rotation", `${dragRotation(target)}deg`);
      }}
      onDragEnd={finishDrag}
      whileHover={disabled ? undefined : { y: -8, scale: 1.035 }}
      whileTap={disabled ? undefined : { scale: 1.07, rotate: -2 }}
      transition={BLOCK_SPRING}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(option);
        }
      }}
      aria-label={`Construction block ${option.optionKey || index + 1}: ${option.optionText}`}
      aria-pressed={selected}
      className={`real-building-block block-${blockColor(index)} ${selected ? "is-selected" : ""} ${disabled ? "is-disabled" : ""}`}
    >
      <div style={{ visibility: selected && placing ? "hidden" : "visible", width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d" }}>
        <div className="block-top-face" aria-hidden>
          <i /><i /><i /><i />
        </div>
        <div className="block-front-face">
          <GripVertical aria-hidden />
          <span>{option.optionText}</span>
        </div>
        <div className="block-side-face" aria-hidden />
        <div className="block-floor-shadow" aria-hidden />
      </div>
    </motion.div>
  );
}
