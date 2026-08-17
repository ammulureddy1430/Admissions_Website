import type { Level, PuckState } from "./Types";
import { wallBounce } from "./CollisionEngine";
export class PuckEngine {
  puck: PuckState = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 16,
    speed: 230,
    active: true,
  };
  rallies = 0;
  reset(w: number, h: number, l: Level, direction: 1 | -1 = 1) {
    const a = Math.random() * 0.7 - 0.35;
    Object.assign(this.puck, {
      x: w / 2,
      y: h / 2,
      vx: Math.sin(a) * l.puckSpeed,
      vy: Math.cos(a) * l.puckSpeed * direction,
      speed: l.puckSpeed,
      active: true,
    });
    this.rallies++;
  }
  update(dt: number, w: number) {
    const p = this.puck;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    wallBounce(p, w);
  }
  normalize(speed: number) {
    const p = this.puck,
      n = Math.max(1, Math.hypot(p.vx, p.vy));
    p.vx = (p.vx / n) * speed;
    p.vy = (p.vy / n) * speed;
    p.speed = speed;
  }
}
