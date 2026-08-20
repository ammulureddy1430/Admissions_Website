export type WaveState = {
  phase: number;
  speed: number;
  amplitude: number;
  secondary: number;
  direction: number;
  difficulty: number;
};
export type RiderState = {
  x: number;
  y: number;
  velocity: number;
  rotation: number;
  angularVelocity: number;
  balanceOffset: number;
  stability: number;
  falling: boolean;
  fallTime: number;
  jumpHeight: number;
  jumpVelocity: number;
  grounded: boolean;
};
export type ObstacleType = "BUOY" | "DRIFTWOOD" | "ROCK";
export type Obstacle = {
  id: number;
  x: number;
  offsetY: number;
  radius: number;
  type: ObstacleType;
  velocity: number;
  active: boolean;
  bob: number;
};
export type Collectible = {
  id: number;
  x: number;
  height: number;
  radius: number;
  velocity: number;
  active: boolean;
  spin: number;
};
export type BalanceStep = {
  waveForce: number;
  stable: boolean;
  critical: boolean;
  overcorrected: boolean;
  fallen: boolean;
};
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const noise = (seed: number) => {
  const x = Math.sin(seed * 71.17) * 43758.5453;
  return x - Math.floor(x);
};
export function difficultyFor(seconds: number) {
  return clamp(1 + Math.floor(seconds / 25), 1, 7);
}
export function createWave(seed = 0): WaveState {
  return {
    phase: seed * 0.73,
    speed: 1.15,
    amplitude: 27,
    secondary: 8,
    direction: 1,
    difficulty: 1,
  };
}
export function waveHeight(w: WaveState, x: number) {
  return (
    Math.sin(x * 0.011 + w.phase) * w.amplitude +
    Math.sin(x * 0.026 - w.phase * 1.37) * w.secondary
  );
}
export function waveSlope(w: WaveState, x: number) {
  return (
    Math.cos(x * 0.011 + w.phase) * w.amplitude * 0.011 +
    Math.cos(x * 0.026 - w.phase * 1.37) * w.secondary * 0.026
  );
}
export function stepWave(w: WaveState, dt: number, elapsed: number) {
  w.difficulty = difficultyFor(elapsed);
  w.speed = 1.08 + w.difficulty * 0.115;
  w.amplitude = 25 + w.difficulty * 3.7 + Math.sin(elapsed * 0.09) * 4;
  w.secondary = 6 + w.difficulty * 1.9;
  w.phase += dt * w.speed;
  w.direction = Math.sign(Math.cos(w.phase * 0.73)) || 1;
}
export function createRider(): RiderState {
  return {
    x: 340,
    y: 0,
    velocity: 0,
    rotation: 0,
    angularVelocity: 0,
    balanceOffset: 0,
    stability: 100,
    falling: false,
    fallTime: 0,
    jumpHeight: 0,
    jumpVelocity: 0,
    grounded: true,
  };
}
export function startJump(r: RiderState) {
  if (!r.grounded || r.falling) return false;
  r.grounded = false;
  r.jumpVelocity = 315;
  return true;
}
export function stepJump(r: RiderState, dt: number) {
  if (r.grounded) return false;
  r.jumpHeight += r.jumpVelocity * dt;
  r.jumpVelocity -= 760 * dt;
  if (r.jumpHeight <= 0) {
    r.jumpHeight = 0;
    r.jumpVelocity = 0;
    r.grounded = true;
    return true;
  }
  return false;
}
export function stepBalance(
  r: RiderState,
  w: WaveState,
  input: number,
  dt: number,
  elapsed: number,
): BalanceStep {
  const slope = waveSlope(w, r.x + elapsed * 42),
    waveForce = slope * (0.82 + w.difficulty * 0.09);
  const previous = r.angularVelocity;
  r.velocity += (input * 155 - r.velocity * 2.4) * dt;
  r.balanceOffset = clamp(r.balanceOffset + r.velocity * dt, -72, 72);
  r.angularVelocity +=
    (waveForce +
      input * 3.55 +
      r.balanceOffset * 0.003 -
      r.angularVelocity * 1.08) *
    dt;
  r.rotation += r.angularVelocity * dt;
  r.rotation = clamp(r.rotation, -1.5, 1.5);
  const strain =
    Math.abs(r.rotation) * 64 +
    Math.abs(r.balanceOffset) * 0.2 +
    Math.abs(r.angularVelocity) * 9;
  r.stability = clamp(100 - strain, 0, 100);
  const overcorrected =
    Math.sign(previous) !== Math.sign(r.angularVelocity) &&
    Math.abs(input) > 0 &&
    Math.abs(previous) > 0.42;
  let fallen = false;
  if (!r.falling && Math.abs(r.rotation) > 1.18) {
    r.falling = true;
    r.fallTime = elapsed;
    fallen = true;
  }
  if (r.falling) {
    r.angularVelocity *= Math.max(0, 1 - dt * 5);
    r.rotation = clamp(r.rotation, -1.22, 1.22);
    r.stability = 0;
  }
  return {
    waveForce,
    stable: r.stability >= 72,
    critical: r.stability < 28,
    overcorrected,
    fallen,
  };
}
export function recoverRider(r: RiderState) {
  r.rotation = 0;
  r.angularVelocity = 0;
  r.balanceOffset = 0;
  r.velocity = 0;
  r.stability = 100;
  r.falling = false;
}
export function generateObstacle(
  seed: number,
  index: number,
  difficulty: number,
): Obstacle {
  const type = (["BUOY", "DRIFTWOOD", "ROCK"] as ObstacleType[])[
    Math.floor(noise(seed * 19 + index) * 3)
  ];
  return {
    id: index,
    x: 940 + index * 310 + noise(seed + index * 7) * 170,
    offsetY: (noise(seed * 3 + index) - 0.5) * 34,
    radius: type === "DRIFTWOOD" ? 28 : type === "ROCK" ? 23 : 18,
    type,
    velocity: 58 + difficulty * 7,
    bob: noise(seed + index * 11) * 6.28,
    active: true,
  };
}
export function stepObstacle(o: Obstacle, dt: number) {
  o.x -= o.velocity * dt;
  o.bob += dt * 2;
}
export function generateCollectible(
  seed: number,
  index: number,
  difficulty: number,
): Collectible {
  return {
    id: index,
    x: 1040 + index * 240 + noise(seed * 13 + index) * 100,
    height: 72 + noise(seed * 5 + index * 17) * 35,
    radius: 14,
    velocity: 58 + difficulty * 7,
    active: true,
    spin: noise(seed + index) * 6.28,
  };
}
export function stepCollectible(c: Collectible, dt: number) {
  c.x -= c.velocity * dt;
  c.spin += dt * 4;
}
export function collectibleCollision(
  r: RiderState,
  c: Collectible,
  surfaceY: number,
) {
  if (!c.active) return false;
  const riderX = r.x + r.balanceOffset * 0.72,
    riderY = surfaceY - r.jumpHeight - 28,
    collectibleY = surfaceY - c.height;
  return Math.hypot(c.x - riderX, collectibleY - riderY) < c.radius + 28;
}
export function obstacleCollision(
  r: RiderState,
  o: Obstacle,
  surfaceY: number,
) {
  if (!o.active) return false;
  const riderX = r.x + r.balanceOffset * 0.72,
    riderY = surfaceY - 18 - r.jumpHeight;
  return (
    Math.hypot(
      o.x - riderX,
      surfaceY + o.offsetY + Math.sin(o.bob) * 5 - riderY,
    ) <
    o.radius + 24
  );
}
export function applyCollision(r: RiderState, o: Obstacle) {
  o.active = false;
  const impact = r.balanceOffset >= 0 ? -1 : 1;
  r.angularVelocity += impact * 0.72;
  r.rotation += impact * 0.1;
  r.stability = Math.max(0, r.stability - 24);
}
