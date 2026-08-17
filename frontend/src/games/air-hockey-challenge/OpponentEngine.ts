import type { OpponentState, PuckState, Level } from "./Types";
export class OpponentEngine {
  state: OpponentState = {
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
    reactionDelay: 350,
    lastReaction: 0,
  };
  reset(w: number, h: number) {
    Object.assign(this.state, {
      x: w / 2,
      y: h * 0.18,
      targetX: w / 2,
      targetY: h * 0.18,
      vx: 0,
      vy: 0,
    });
  }
  update(
    dt: number,
    now: number,
    p: PuckState,
    l: Level,
    w: number,
    h: number,
  ) {
    const s = this.state;
    s.reactionDelay = l.reactionDelay;
    if (now - s.lastReaction > s.reactionDelay) {
      s.lastReaction = now;
      s.targetX =
        p.vy < 0
          ? p.x + p.vx * Math.max(0, (p.y - h * 0.22) / Math.max(80, -p.vy))
          : w / 2;
      s.targetX += Math.sin(now / 700) * w * l.variation;
      s.targetY = h * 0.2;
    }
    const dx = Math.max(
      -l.opponentSpeed,
      Math.min(l.opponentSpeed, (s.targetX - s.x) * 5),
    );
    s.vx += (dx - s.vx) * Math.min(1, dt * 5);
    s.x = Math.max(s.radius, Math.min(w - s.radius, s.x + s.vx * dt));
    s.y = Math.max(s.radius, Math.min(h / 2 - s.radius, s.targetY));
  }
}
