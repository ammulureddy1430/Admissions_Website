import type { Player } from "./Types";
export class PlayerEngine {
  state: Player = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    vx: 0,
    vy: 0,
    movementDistance: 0,
    directionChanges: 0,
    lastDirection: 0,
  };
  reset(w: number, h: number) {
    Object.assign(this.state, {
      x: w / 2,
      y: h * 0.76,
      targetX: w / 2,
      targetY: h * 0.76,
      vx: 0,
      vy: 0,
    });
  }
  target(x: number, y: number, w: number, h: number) {
    this.state.targetX = Math.max(35, Math.min(w - 35, x));
    this.state.targetY = Math.max(h * 0.28, Math.min(h - 40, y));
  }
  update(dt: number) {
    const s = this.state,
      ox = s.x,
      oy = s.y;
    s.vx +=
      (Math.max(-420, Math.min(420, (s.targetX - s.x) * 9)) - s.vx) *
      Math.min(1, dt * 8);
    s.vy +=
      (Math.max(-420, Math.min(420, (s.targetY - s.y) * 9)) - s.vy) *
      Math.min(1, dt * 8);
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.movementDistance += Math.hypot(s.x - ox, s.y - oy);
    const d = Math.sign(s.vx);
    if (d && s.lastDirection && d !== s.lastDirection) s.directionChanges++;
    if (d) s.lastDirection = d;
  }
  near(x: number, y: number, d = 58) {
    return Math.hypot(this.state.x - x, this.state.y - y) <= d;
  }
}
