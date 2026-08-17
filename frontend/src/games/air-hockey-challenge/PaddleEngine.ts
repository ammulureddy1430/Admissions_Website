import type { PaddleState } from "./Types";
export class PaddleEngine {
  state: PaddleState = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    vx: 0,
    vy: 0,
    radius: 34,
    movementDistance: 0,
    directionChanges: 0,
    lastDirection: 0,
  };
  reset(w: number, h: number) {
    Object.assign(this.state, {
      x: w / 2,
      y: h * 0.82,
      targetX: w / 2,
      targetY: h * 0.82,
      vx: 0,
      vy: 0,
    });
  }
  target(x: number, y: number, w: number, h: number) {
    this.state.targetX = Math.max(48, Math.min(w - 48, x));
    this.state.targetY = Math.max(h / 2 + 45, Math.min(h - 48, y));
  }
  update(dt: number, w: number, h: number) {
    const s = this.state,
      ox = s.x,
      oy = s.y,
      dx = s.targetX - s.x,
      dy = s.targetY - s.y;
    s.vx +=
      (Math.max(-620, Math.min(620, dx * 11)) - s.vx) * Math.min(1, dt * 9);
    s.vy +=
      (Math.max(-620, Math.min(620, dy * 11)) - s.vy) * Math.min(1, dt * 9);
    s.x = Math.max(s.radius, Math.min(w - s.radius, s.x + s.vx * dt));
    s.y = Math.max(h / 2 + s.radius, Math.min(h - s.radius, s.y + s.vy * dt));
    s.movementDistance += Math.hypot(s.x - ox, s.y - oy);
    const d = Math.sign(s.vx);
    if (d && s.lastDirection && d !== s.lastDirection) s.directionChanges++;
    if (d) s.lastDirection = d;
  }
}
