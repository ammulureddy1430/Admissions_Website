import { Arrow, Vec } from "./Types";
// World-space position of the archer's bow hand, not the character's feet.
export const ARCHER = { x: 158, y: 285 };
export function pointerToWorld(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): Vec {
  return {
    x: ((clientX - rect.left) * 900) / rect.width,
    y: ((clientY - rect.top) * 560) / rect.height,
  };
}
export function aimAngle(from: Vec, to: Vec) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}
export function drawFromDistance(distance: number) {
  return Math.max(0, Math.min(1, distance / 150));
}
export function launchArrow(angle: number, draw: number): Arrow {
  const speed = 360 + draw * 430;
  return {
    x: ARCHER.x + 92 * Math.cos(angle),
    y: ARCHER.y + 92 * Math.sin(angle),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    active: true,
    trail: [],
  };
}
export function stepArrow(arrow: Arrow, dt: number, wind: number) {
  arrow.vx += wind * dt;
  // A light sport-archery drop keeps the arrow visibly physical while making
  // the reticle and impact position feel naturally aligned at range distance.
  arrow.vy += 70 * dt;
  arrow.x += arrow.vx * dt;
  arrow.y += arrow.vy * dt;
  arrow.angle = Math.atan2(arrow.vy, arrow.vx);
  arrow.trail.push({ x: arrow.x, y: arrow.y });
  if (arrow.trail.length > 18) arrow.trail.shift();
  return arrow;
}
