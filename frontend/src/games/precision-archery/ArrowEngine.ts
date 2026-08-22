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
export function launchArrowAt(to: Vec, draw: number, wind: number): Arrow {
  const angle = aimAngle(ARCHER, to);
  const x = ARCHER.x + 92 * Math.cos(angle);
  const y = ARCHER.y + 92 * Math.sin(angle);
  const speed = 360 + draw * 430;
  const distance = Math.hypot(to.x - x, to.y - y);
  const flightTime = Math.max(0.08, distance / speed);
  return {
    x,
    y,
    // Compensate for the current wind and gravity so the arrow arrives at the
    // player's pointer. The visible flight still curves naturally.
    vx: (to.x - x) / flightTime - 0.5 * wind * flightTime,
    vy: (to.y - y) / flightTime - 0.5 * 70 * flightTime,
    angle,
    active: true,
    trail: [],
    aimPoint: { ...to },
  };
}
export function stepArrow(arrow: Arrow, dt: number, wind: number) {
  const previousX = arrow.x;
  arrow.vx += wind * dt;
  // A light sport-archery drop keeps the arrow visibly physical while making
  // the reticle and impact position feel naturally aligned at range distance.
  arrow.vy += 70 * dt;
  arrow.x += arrow.vx * dt;
  arrow.y += arrow.vy * dt;
  if (
    arrow.aimPoint &&
    previousX < arrow.aimPoint.x &&
    arrow.x >= arrow.aimPoint.x
  ) {
    arrow.x = arrow.aimPoint.x;
    arrow.y = arrow.aimPoint.y;
    arrow.aimPoint = undefined;
    arrow.arrived = true;
  }
  arrow.angle = Math.atan2(arrow.vy, arrow.vx);
  arrow.trail.push({ x: arrow.x, y: arrow.y });
  if (arrow.trail.length > 18) arrow.trail.shift();
  return arrow;
}
