import type { FallingObject, GardenSymbol } from "./Types";
export const SYMBOLS: GardenSymbol[] = ["★", "●", "✿", "◆"];
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
export const chooseTarget = (round: number) => SYMBOLS[round % SYMBOLS.length];
export const difficultyFor = (resolvedTargets: number) =>
  Math.min(5, 1 + Math.floor(resolvedTargets / 3));
export const spawnInterval = (level: number) =>
  Math.max(480, 980 - level * 100);
export const fallSpeed = (level: number, random = Math.random) =>
  120 + level * 24 + random() * 34;
export const objectSize = (level: number) => Math.max(48, 72 - (level - 1) * 5);
export const catcherWidth = (level: number) =>
  Math.max(130, 190 - (level - 1) * 12);
export function spawnObject(
  id: number,
  level: number,
  targetSymbol: GardenSymbol,
  width: number,
  now: number,
  random = Math.random,
): FallingObject {
  const isTarget = random() < Math.max(0.38, 0.5 - level * 0.02);
  const alternatives = SYMBOLS.filter((symbol) => symbol !== targetSymbol);
  const symbol = isTarget
    ? targetSymbol
    : alternatives[Math.floor(random() * alternatives.length)];
  const size = objectSize(level);
  return {
    id,
    symbol,
    target: isTarget,
    x: size / 2 + random() * (width - size),
    y: -size,
    size,
    speed: fallSpeed(level, random),
    spawnedAt: now,
    enteredCatchZoneAt: null,
  };
}
export function moveObject(object: FallingObject, deltaSeconds: number) {
  return { ...object, y: object.y + object.speed * deltaSeconds };
}
export function intersects(
  object: FallingObject,
  catcherX: number,
  catcherY: number,
  catcherW: number,
  catcherH: number,
) {
  const tolerance = 12;
  return (
    object.x + object.size / 2 >= catcherX - tolerance &&
    object.x - object.size / 2 <= catcherX + catcherW + tolerance &&
    object.y + object.size / 2 >= catcherY &&
    object.y - object.size / 2 <= catcherY + catcherH
  );
}
export const moveCatcher = (
  pointerX: number,
  width: number,
  catcherW: number,
) => clamp(pointerX - catcherW / 2, 0, width - catcherW);
export const timedOut = (remainingSeconds?: number) =>
  remainingSeconds !== undefined && remainingSeconds <= 0;
