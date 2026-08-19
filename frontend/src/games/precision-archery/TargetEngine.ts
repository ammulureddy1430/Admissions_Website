import { MovementPattern, Target } from "./Types";
const patterns: MovementPattern[] = ["stationary"];
export function roundForCompletedShots(completedShots: number) {
  return completedShots < 4 ? 1 : 2;
}
export function isArcheryComplete(completedShots: number) {
  return completedShots >= 8;
}
export function createTargets(level: number, seed = 1): Target[] {
  const count = level >= 7 ? 3 : 1;
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: (level === 1 ? 665 : 745) + i * 65,
    y: (level === 1 ? 275 : 235) + i * 65,
    baseX: (level === 1 ? 665 : 745) + i * 65,
    baseY: (level === 1 ? 275 : 235) + i * 65,
    radius: level === 1 ? 58 : 38,
    speed: Math.min(2.35, 0.65 + level * 0.2),
    pattern: patterns[0],
    phase: (seed % 11) * 0.47 + i * 2,
    distance: level === 1 ? 1 : 1.35,
    hitFlash: 0,
  }));
}
export function targetPosition(target: Target, time: number) {
  const t = time * target.speed + target.phase;
  if (target.pattern === "horizontal")
    return { x: target.baseX + Math.sin(t) * 90, y: target.baseY };
  if (target.pattern === "vertical")
    return { x: target.baseX, y: target.baseY + Math.sin(t) * 85 };
  if (target.pattern === "wave")
    return {
      x: target.baseX + Math.sin(t) * 80,
      y: target.baseY + Math.sin(t * 1.7) * 65,
    };
  if (target.pattern === "orbit")
    return {
      x: target.baseX + Math.cos(t) * 70,
      y: target.baseY + Math.sin(t) * 70,
    };
  return { x: target.baseX, y: target.baseY };
}
export function collision(x: number, y: number, target: Target) {
  // Side-view archery: the arrow must first reach the vertical target face.
  // Ring placement is then determined by height on that face, preventing
  // every shot from incorrectly sticking to the circle's left boundary.
  if (x < target.x) {
    return {
      hit: false,
      distance: Number.POSITIVE_INFINITY,
      ring: "miss" as const,
    };
  }
  const distance = Math.abs(y - target.y);
  if (distance <= target.radius * 0.25)
    return { hit: true, distance, ring: "center" as const };
  if (distance <= target.radius * 0.68)
    return { hit: true, distance, ring: "outer" as const };
  if (distance <= target.radius)
    return { hit: true, distance, ring: "edge" as const };
  return { hit: false, distance, ring: "miss" as const };
}
