"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { BlockToolbox } from "./BlockToolbox";
import { BuildingProgress } from "./BuildingProgress";
import { ConstructionArea } from "./ConstructionArea";
import { optionIdentity, type BuildingOption } from "./GameRenderer";
import { blockColor } from "./PhysicsEngine";

export function BuildingGame({
  options,
  disabled,
  sound,
  questionIndex,
  questionCount,
  onAnswer,
  playSound,
}: {
  options: BuildingOption[];
  disabled: boolean;
  sound: boolean;
  questionIndex: number;
  questionCount: number;
  onAnswer: (answer: string) => unknown | Promise<unknown>;
  playSound: (frequency: number) => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [placing, setPlacing] = useState(false);
  const [shake, setShake] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [placedColors, setPlacedColors] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("building_placed_colors");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [dropBounds, setDropBounds] = useState<DOMRect | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const selected = options.find(option => optionIdentity(option) === selectedId);
  const selectedIndex = Math.max(0, options.findIndex(option => optionIdentity(option) === selectedId));

  useLayoutEffect(() => {
    const measure = () => setDropBounds(dropRef.current?.getBoundingClientRect() || null);
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (questionIndex === 0) {
      setPlacedColors([]);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("building_placed_colors");
      }
    } else {
      if (typeof window !== "undefined") {
        const saved = sessionStorage.getItem("building_placed_colors");
        const colors = saved ? JSON.parse(saved) : [];
        if (colors.length > questionIndex) {
          const sliced = colors.slice(0, questionIndex);
          sessionStorage.setItem("building_placed_colors", JSON.stringify(sliced));
          setPlacedColors(sliced);
        } else {
          setPlacedColors(colors);
        }
      }
    }
  }, [questionIndex]);

  const select = (option: BuildingOption) => {
    if (disabled || placing) return;
    setSelectedId(optionIdentity(option));
    if (sound) playSound(370);
    void place(option);
  };

  const place = async (option = selected) => {
    if (!option || disabled || placing) return;
    setSelectedId(optionIdentity(option));
    setPlacing(true);
    setDraggingId(null);
    if (sound) playSound(480);
    await new Promise(resolve => window.setTimeout(resolve, 940));

    // Capture exact color of user's selected block
    const blockIdx = options.findIndex(opt => optionIdentity(opt) === optionIdentity(option));
    const color = blockColor(Math.max(0, blockIdx));
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("building_placed_colors");
      const colors = saved ? JSON.parse(saved) : [];
      colors[questionIndex] = color;
      sessionStorage.setItem("building_placed_colors", JSON.stringify(colors));
      setPlacedColors(colors);
    } else {
      setPlacedColors(prev => [...prev.slice(0, questionIndex), color]);
    }

    if (sound) playSound(620);
    setShake(true);
    window.setTimeout(() => setShake(false), 450);
    await onAnswer(option.optionText);
  };

  return (
    <div className="real-building-game">
      <BuildingProgress current={questionIndex} total={questionCount} placing={placing} />
      <ConstructionArea
        ref={dropRef}
        completedFloors={questionIndex}
        totalFloors={questionCount}
        selected={selected}
        selectedIndex={selectedIndex}
        placing={placing}
        isDragging={draggingId !== null}
        placedColors={placedColors}
        shake={shake}
      />
      <BlockToolbox
        options={options}
        selectedId={selectedId}
        disabled={disabled || placing}
        placing={placing}
        draggingId={draggingId}
        onDragStart={id => setDraggingId(id)}
        onDragEnd={() => setDraggingId(null)}
        dropBounds={dropBounds}
        onSelect={select}
        onPlace={option => void place(option)}
      />
      <p className="real-building-help">{selected ? "Drag the lifted block into the glowing platform, or tap the platform to place it." : "Pick up one of the toy blocks below to start building."}</p>
    </div>
  );
}
