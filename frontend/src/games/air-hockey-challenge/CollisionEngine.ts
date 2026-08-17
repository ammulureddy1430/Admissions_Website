import type { PaddleState, PuckState } from "./Types";
export function paddleHit(p: PuckState, d: PaddleState) {
  const dx = p.x - d.x,
    dy = p.y - d.y,
    min = p.radius + d.radius,
    dist = Math.hypot(dx, dy);
  if (dist >= min || dist === 0) return false;
  const nx = dx / dist,
    ny = dy / dist,
    relative = (p.vx - d.vx) * nx + (p.vy - d.vy) * ny;
  if (relative >= 0) return false;
  p.x = d.x + nx * (min + 1);
  p.y = d.y + ny * (min + 1);
  p.vx -= 2 * relative * nx;
  p.vy -= 2 * relative * ny;
  p.vx += d.vx * 0.22;
  p.vy += d.vy * 0.22;
  return true;
}
export function wallBounce(p: PuckState, w: number) {
  if (p.x - p.radius <= 0 && p.vx < 0) {
    p.x = p.radius;
    p.vx *= -1;
    return true;
  }
  if (p.x + p.radius >= w && p.vx > 0) {
    p.x = w - p.radius;
    p.vx *= -1;
    return true;
  }
  return false;
}
export const goalSide = (p: PuckState, w: number, h: number) => {
  const inGoal = p.x > w * 0.32 && p.x < w * 0.68;
  if (!inGoal) return null;
  if (p.y + p.radius < 0) return "opponent";
  if (p.y - p.radius > h) return "child";
  return null;
};
