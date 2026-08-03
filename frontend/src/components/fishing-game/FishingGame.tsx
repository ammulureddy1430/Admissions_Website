"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Anchor, ChevronLeft, ChevronRight, Fish, Waves } from "lucide-react";

type FishingOption = { id?: string; optionKey?: string; optionText: string };
type FishingPhase = "aim" | "casting" | "reeling" | "landed" | "miss";
type HookPath = { startX: number; startY: number; length: number; angle: number; endX: number; endY: number };

const fishColors = ["coral", "gold", "mint", "violet"];
const fishDepths = [38, 60, 48, 72];

export function FishingGame({
  options,
  disabled,
  sound,
  questionIndex,
  questionCount,
  onAnswer,
  playSound,
  caughtFish = [],
  onFishCaught,
  initialBoatX = 50,
  onBoatPositionChange,
}: {
  options: FishingOption[];
  disabled: boolean;
  sound: boolean;
  questionIndex: number;
  questionCount: number;
  onAnswer: (answer: string) => unknown | Promise<unknown>;
  playSound: (frequency: number) => void;
  caughtFish?: string[];
  onFishCaught?: (label: string) => void;
  initialBoatX?: number;
  onBoatPositionChange?: (position: number) => void;
}) {
  const [boatX, setBoatX] = useState(initialBoatX);
  const [phase, setPhase] = useState<FishingPhase>("aim");
  const [hookedKey, setHookedKey] = useState("");
  const [caughtKey, setCaughtKey] = useState("");
  const [castLength, setCastLength] = useState<number | null>(null);
  const [hookPath, setHookPath] = useState<HookPath | null>(null);
  const lakeRef = useRef<HTMLDivElement>(null);
  const boatRef = useRef<HTMLDivElement>(null);
  const fishRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const busy = disabled || phase !== "aim";
  const progress = Math.max(4, Math.round((questionIndex / Math.max(questionCount, 1)) * 100));

  const moveBoat = (direction: number) => {
    if (busy) return;
    setBoatX(value => {
      const next = Math.max(12, Math.min(88, value + direction * 10));
      onBoatPositionChange?.(next);
      return next;
    });
    if (sound) playSound(260 + direction * 30);
  };

  const waitForFishAtBoat = (index: number) => new Promise<void>(resolve => {
    const startedAt = performance.now();
    const checkPosition = () => {
      const boat = boatRef.current?.getBoundingClientRect();
      const fish = fishRefs.current[index]?.getBoundingClientRect();
      const timedOut = performance.now() - startedAt > 1800;
      const overlapsBoat = Boolean(
        boat
        && fish
        && fish.right >= boat.left
        && fish.left <= boat.right
        && fish.top <= boat.bottom + 8
        && fish.bottom >= boat.top - 8
      );
      if (overlapsBoat || timedOut) {
        resolve();
        return;
      }
      window.requestAnimationFrame(checkPosition);
    };
    window.requestAnimationFrame(checkPosition);
  });

  const catchFish = async (option: FishingOption, index: number, moveAboveFish = false, exactLength?: number) => {
    if (busy) return;
    const key = option.id || option.optionKey || String(index);
    if (moveAboveFish) {
      const lake = lakeRef.current?.getBoundingClientRect();
      const fish = fishRefs.current[index]?.getBoundingClientRect();
      if (lake && fish) {
        const nextX = Math.max(12, Math.min(88, ((fish.left + fish.width / 2 - lake.left) / lake.width) * 100));
        setBoatX(nextX);
        onBoatPositionChange?.(nextX);
      }
    }
    setCastLength(exactLength ?? null);
    setHookedKey(key);
    setPhase("casting");
    if (sound) playSound(310);
    await new Promise(resolve => window.setTimeout(resolve, 620));
    setCaughtKey(key);
    setPhase("reeling");
    if (sound) playSound(460);
    await waitForFishAtBoat(index);
    if (sound) playSound(620);
    onFishCaught?.(option.optionText);
    setPhase("landed");
    setHookedKey("");
    setCastLength(null);
    // Hold the completed boat view so the learner can clearly see the catch
    // before the assessment advances to the next question.
    await new Promise(resolve => window.setTimeout(resolve, 2200));
    // Reset the interactive round before the parent swaps in the next question.
    // The boatCatch state intentionally remains untouched across rounds.
    setPhase("aim");
    setHookedKey("");
    setCaughtKey("");
    setCastLength(null);
    setHookPath(null);
    await onAnswer(option.optionText);
  };

  const catchClickedFish = async (option: FishingOption, index: number) => {
    if (busy) return;
    const lake = lakeRef.current?.getBoundingClientRect();
    const boat = boatRef.current?.getBoundingClientRect();
    const mouth = fishRefs.current[index]?.querySelector<HTMLElement>(".fish-mouth")?.getBoundingClientRect();
    if (!lake || !boat || !mouth) return;
    const startX = boat.right - lake.left + 2;
    const startY = boat.top + 18 - lake.top;
    const endX = mouth.left + mouth.width / 2 - lake.left;
    const endY = mouth.top + mouth.height / 2 - lake.top;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const length = Math.hypot(deltaX, deltaY);
    setHookPath({
      startX,
      startY,
      endX,
      endY,
      length,
      angle: Math.atan2(-deltaX, deltaY) * (180 / Math.PI),
    });
    await catchFish(option, index, false, Math.max(38, length));
  };

  const castNearest = async () => {
    if (busy || !options.length) return;
    const lake = lakeRef.current?.getBoundingClientRect();
    const boat = boatRef.current?.getBoundingClientRect();
    if (!lake || !boat) return;
    const hookX = boat.right;
    const lineStartY = boat.top + 18;
    const candidates: Array<{ index: number; mouthX: number; mouthY: number; distance: number }> = [];
    fishRefs.current.forEach((element, index) => {
      const bounds = element?.getBoundingClientRect();
      const mouth = element?.querySelector<HTMLElement>(".fish-mouth")?.getBoundingClientRect();
      if (!bounds || !mouth) return;
      const collisionInset = Math.min(20, bounds.width * .14);
      if (hookX < bounds.left + collisionInset || hookX > bounds.right - collisionInset) return;
      const mouthX = mouth.left + mouth.width / 2;
      const mouthY = mouth.top + mouth.height / 2;
      const distance = Math.abs(mouthX - hookX);
      candidates.push({
        index,
        mouthX,
        mouthY,
        distance,
      });
    });
    candidates.sort((a, b) => a.mouthY - b.mouthY || a.distance - b.distance);
    const target = candidates[0];
    if (target) {
      const startX = boat.right - lake.left + 2;
      const startY = lineStartY - lake.top;
      const endX = target.mouthX - lake.left;
      const endY = target.mouthY - lake.top;
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const length = Math.hypot(deltaX, deltaY);
      setHookPath({
        startX,
        startY,
        endX,
        endY,
        length,
        angle: Math.atan2(-deltaX, deltaY) * (180 / Math.PI),
      });
      await catchFish(options[target.index], target.index, false, Math.max(38, length));
      return;
    }
    setCastLength(Math.max(90, lake.height * .55));
    setHookPath(null);
    setCaughtKey("");
    setHookedKey("");
    setPhase("casting");
    if (sound) playSound(280);
    await new Promise(resolve => window.setTimeout(resolve, 520));
    setPhase("miss");
    await new Promise(resolve => window.setTimeout(resolve, 420));
    setCastLength(null);
    setHookPath(null);
    setHookedKey("");
    setPhase("aim");
  };

  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveBoat(-1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveBoat(1);
      }
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        void castNearest();
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  });

  useEffect(() => {
    if (!hookedKey || (phase !== "casting" && phase !== "reeling")) return;
    const hookedIndex = options.findIndex(
      (option, index) => (option.id || option.optionKey || String(index)) === hookedKey,
    );
    if (hookedIndex < 0) return;

    let frame = 0;
    const followFish = () => {
      const lake = lakeRef.current?.getBoundingClientRect();
      const boat = boatRef.current?.getBoundingClientRect();
      const mouth = fishRefs.current[hookedIndex]
        ?.querySelector<HTMLElement>(".fish-mouth")
        ?.getBoundingClientRect();

      if (lake && boat && mouth) {
        const startX = boat.right - lake.left + 2;
        const startY = boat.top + 18 - lake.top;
        const endX = mouth.left + mouth.width / 2 - lake.left;
        const endY = mouth.top + mouth.height / 2 - lake.top;
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        setHookPath({
          startX,
          startY,
          endX,
          endY,
          length: Math.hypot(deltaX, deltaY),
          angle: Math.atan2(-deltaX, deltaY) * (180 / Math.PI),
        });
      }

      frame = window.requestAnimationFrame(followFish);
    };

    frame = window.requestAnimationFrame(followFish);
    return () => window.cancelAnimationFrame(frame);
  }, [hookedKey, phase, options]);

  const caughtIndex = options.findIndex((option, index) => (option.id || option.optionKey || String(index)) === caughtKey);
  const hookDepth = caughtIndex >= 0 ? fishDepths[caughtIndex % fishDepths.length] : 46;
  const hookLength = phase === "aim" ? "2.2rem" : phase === "landed" ? "3.2rem" : castLength ? `${castLength}px` : `${3.4 + hookDepth * .16}rem`;

  return (
    <div className={`fishing-world-game phase-${phase}`} aria-label="Interactive fishing world">
      <div className="fishing-progress">
        <span><Fish /> Catch {questionIndex + 1} of {questionCount}</span>
        <div><i style={{ width: `${progress}%` }} /></div>
        <strong>{phase === "aim" ? "Move the boat and cast" : phase === "casting" ? "Hook in the water…" : phase === "reeling" ? "Reeling in the catch…" : phase === "landed" ? "Catch secured in the boat!" : "Line returning…"}</strong>
      </div>
      <div ref={lakeRef} className="fishing-lake">
        <div className="lake-light-rays" aria-hidden />
        <div className="fishing-bubbles" aria-hidden>{Array.from({ length: 14 }, (_, index) => <i key={index} />)}</div>
        <motion.div
          ref={boatRef}
          className="fishing-boat"
          animate={{ left: `${boatX}%`, y: [0, -3, 0] }}
          transition={{ left: { type: "spring", stiffness: 180, damping: 20 }, y: { duration: 2, repeat: Infinity } }}
        >
          <div className="boat-wake" aria-hidden><i /><i /></div>
          <div className="boat-hull"><Anchor /></div>
          <div className="boat-cabin" aria-hidden><i /><span /></div>
          <div className="boat-seat" />
          <div className="boat-catch" aria-label={`${caughtFish.length} fish caught`}>
            {caughtFish.map((label, index) => (
              <span key={`${label}-${index}`} title={label}>🐟</span>
            ))}
          </div>
          <div className="boat-rod" />
          <motion.div
            className="fishing-line"
            data-hidden={phase !== "aim"}
            animate={{ height: hookLength }}
            transition={{ type: "spring", stiffness: 115, damping: 16 }}
          >
            <span />
          </motion.div>
        </motion.div>
        <AnimatePresence>
          {hookPath && (phase === "casting" || phase === "reeling" || phase === "landed") && (
            <motion.div
              className="precision-hook-line"
              style={{ left: hookPath.startX, top: hookPath.startY, rotate: hookPath.angle }}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: phase === "landed" ? 51 : hookPath.length, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: phase === "casting" ? .18 : phase === "landed" ? .4 : .03, ease: [0.22, .8, .25, 1] }}
            >
              <span className="precision-hook" />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {options.map((option, index) => {
            const key = option.id || option.optionKey || String(index);
            const caught = caughtKey === key;
            const hooked = hookedKey === key;
            return (
              <motion.button
                key={key}
                ref={element => { fishRefs.current[index] = element; }}
                type="button"
                disabled={busy}
                onClick={() => void catchClickedFish(option, index)}
                className={`answer-fish fish-${fishColors[index % fishColors.length]} fish-lane-${index % 4} ${hooked ? "is-hooked" : ""} ${caught ? "is-caught" : ""}`}
                style={{ top: `${fishDepths[index % fishDepths.length]}%`, "--fish-delay": `${index * -.9}s`, "--fish-duration": `${5.8 + index * .7}s` } as React.CSSProperties}
                animate={caught ? { left: `${boatX}%`, x: "-50%", top: "8%", rotate: [0, -15, 10, 0], scale: [.95, 1.08, .58] } : undefined}
                transition={caught ? { duration: 1.25, ease: [0.22, .8, .25, 1] } : undefined}
                aria-label={`Catch fish ${option.optionKey || index + 1}: ${option.optionText}`}
              >
                <span className="fish-tail" aria-hidden />
                <span className="fish-body"><Fish aria-hidden /><b>{option.optionText}</b><i aria-hidden /></span>
                <span className="fish-mouth" aria-hidden />
                <span className="fish-shadow" aria-hidden />
              </motion.button>
            );
          })}
        </AnimatePresence>
        {(phase === "casting" || phase === "miss") && <div className="fishing-splash" style={{ left: `${boatX}%` }} aria-hidden><Waves /><i /><i /><i /></div>}
        <div className="lake-current current-one" aria-hidden /><div className="lake-current current-two" aria-hidden />
      </div>
      <div className="fishing-controls no-cast-button">
        <button type="button" onClick={() => moveBoat(-1)} disabled={busy} aria-label="Move boat left"><ChevronLeft /></button>
        <button type="button" onClick={() => moveBoat(1)} disabled={busy} aria-label="Move boat right"><ChevronRight /></button>
      </div>
      <p className="fishing-key-hint">Tap a moving fish to cast directly to its mouth. Use ← → to steer, or Space to catch a fish below the hook.</p>
    </div>
  );
}
