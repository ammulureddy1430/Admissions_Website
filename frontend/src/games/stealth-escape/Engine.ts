export type Vec = { x: number; y: number };
export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind?: "wall" | "cover";
};
export type Player = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  moving: boolean;
};
export type Guard = {
  x: number;
  y: number;
  angle: number;
  route: Vec[];
  routeIndex: number;
  speed: number;
  pause: number;
  awareness: number;
  state: "PATROL" | "TURN" | "SEARCH";
};
export type Event = {
  id: number;
  x: number;
  y: number;
  kind: "SOUND" | "LIGHT" | "SHADOW";
  relevant: boolean;
  life: number;
  active: boolean;
};
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const seedNoise = (n: number) => {
  const v = Math.sin(n * 91.731) * 43758.5453;
  return v - Math.floor(v);
};
export const difficultyFor = (seconds: number) =>
  clamp(1 + Math.floor(seconds / 55), 1, 4);
export const MAP_W = 1000,
  MAP_H = 600;
export const wallsFor = (seed: number): Rect[] => [
  { x: 0, y: 0, w: 1000, h: 28, kind: "wall" },
  { x: 0, y: 572, w: 1000, h: 28, kind: "wall" },
  { x: 0, y: 0, w: 28, h: 600, kind: "wall" },
  { x: 972, y: 0, w: 28, h: 600, kind: "wall" },
  { x: 180, y: 80, w: 38, h: 245, kind: "wall" },
  { x: 180, y: 405, w: 38, h: 167, kind: "wall" },
  { x: 420, y: 28, w: 38, h: 180, kind: "wall" },
  { x: 420, y: 295, w: 38, h: 200, kind: "wall" },
  { x: 690, y: 100, w: 38, h: 250, kind: "wall" },
  { x: 690, y: 430, w: 38, h: 142, kind: "wall" },
  { x: 75 + seedNoise(seed) * 30, y: 205, w: 78, h: 58, kind: "cover" },
  { x: 280, y: 365, w: 96, h: 56, kind: "cover" },
  { x: 510, y: 160, w: 110, h: 52, kind: "cover" },
  { x: 515, y: 430, w: 100, h: 62, kind: "cover" },
  { x: 805, y: 275, w: 92, h: 58, kind: "cover" },
];
export const createPlayer = (): Player => ({
  x: 75,
  y: 520,
  vx: 0,
  vy: 0,
  r: 14,
  moving: false,
});
export function movePlayer(p: Player, input: Vec, dt: number, walls: Rect[]) {
  const mag = Math.hypot(input.x, input.y) || 1,
    target = 150;
  p.vx += ((input.x / mag) * target - p.vx) * Math.min(1, dt * 10);
  p.vy += ((input.y / mag) * target - p.vy) * Math.min(1, dt * 10);
  if (!input.x && !input.y) {
    p.vx *= Math.max(0, 1 - dt * 12);
    p.vy *= Math.max(0, 1 - dt * 12);
  }
  const nx = p.x + p.vx * dt,
    ny = p.y + p.vy * dt;
  if (!hitsWall(nx, p.y, p.r, walls)) p.x = nx;
  else p.vx = 0;
  if (!hitsWall(p.x, ny, p.r, walls)) p.y = ny;
  else p.vy = 0;
  p.moving = Math.hypot(p.vx, p.vy) > 8;
}
export function hitsWall(x: number, y: number, r: number, walls: Rect[]) {
  return walls.some(
    (o) => x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h,
  );
}
export function createGuards(seed: number): Guard[] {
  const shift = seedNoise(seed) * 35;
  return [
    {
      x: 285,
      y: 100 + shift,
      angle: 0,
      route: [
        { x: 285, y: 95 },
        { x: 375, y: 95 },
        { x: 375, y: 310 },
        { x: 285, y: 310 },
      ],
      routeIndex: 1,
      speed: 62,
      pause: 0,
      awareness: 0,
      state: "PATROL",
    },
    {
      x: 555,
      y: 330,
      angle: Math.PI / 2,
      route: [
        { x: 520, y: 330 },
        { x: 650, y: 330 },
        { x: 650, y: 530 },
        { x: 490, y: 530 },
      ],
      routeIndex: 1,
      speed: 56,
      pause: 7,
      awareness: 0,
      state: "PATROL",
    },
    {
      x: 830,
      y: 120,
      angle: Math.PI,
      route: [
        { x: 780, y: 120 },
        { x: 930, y: 120 },
        { x: 930, y: 480 },
        { x: 780, y: 480 },
      ],
      routeIndex: 1,
      speed: 59,
      pause: 55,
      awareness: 0,
      state: "PATROL",
    },
  ];
}
export function stepGuard(g: Guard, dt: number, difficulty: number) {
  if (g.pause > 0) {
    g.pause -= dt;
    g.state = "TURN";
    g.angle += dt * 0.55;
    return;
  }
  g.state = g.awareness > 42 ? "SEARCH" : "PATROL";
  const t = g.route[g.routeIndex],
    dx = t.x - g.x,
    dy = t.y - g.y,
    d = Math.hypot(dx, dy);
  if (d < 6) {
    g.routeIndex = (g.routeIndex + 1) % g.route.length;
    g.pause = 0.6 + (g.routeIndex % 2) * 0.45;
    return;
  }
  const target = Math.atan2(dy, dx),
    delta = Math.atan2(Math.sin(target - g.angle), Math.cos(target - g.angle));
  g.angle += clamp(delta, -dt * 2.5, dt * 2.5);
  const speed = g.speed * (1 + (difficulty - 1) * 0.045);
  g.x += Math.cos(g.angle) * speed * dt;
  g.y += Math.sin(g.angle) * speed * dt;
}
function segmentsIntersect(a: Vec, b: Vec, c: Vec, d: Vec) {
  const cross = (p: Vec, q: Vec, r: Vec) =>
      (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x),
    ab1 = cross(a, b, c),
    ab2 = cross(a, b, d),
    cd1 = cross(c, d, a),
    cd2 = cross(c, d, b);
  return ab1 * ab2 < 0 && cd1 * cd2 < 0;
}
export function lineBlocked(a: Vec, b: Vec, walls: Rect[]) {
  return walls.some((r) => {
    const p = [
      { x: r.x, y: r.y },
      { x: r.x + r.w, y: r.y },
      { x: r.x + r.w, y: r.y + r.h },
      { x: r.x, y: r.y + r.h },
    ];
    return p.some((q, i) => segmentsIntersect(a, b, q, p[(i + 1) % 4]));
  });
}
export function canSee(g: Guard, p: Player, walls: Rect[]) {
  const dx = p.x - g.x,
    dy = p.y - g.y,
    d = Math.hypot(dx, dy),
    range = 205;
  if (d > range) return false;
  const delta = Math.abs(
    Math.atan2(
      Math.sin(Math.atan2(dy, dx) - g.angle),
      Math.cos(Math.atan2(dy, dx) - g.angle),
    ),
  );
  return delta < 0.58 && !lineBlocked(g, p, walls);
}
export function stepDetection(g: Guard, p: Player, walls: Rect[], dt: number) {
  const visible = canSee(g, p, walls),
    before = g.awareness;
  if (visible)
    g.awareness = clamp(g.awareness + dt * (p.moving ? 48 : 27), 0, 100);
  else g.awareness = clamp(g.awareness - dt * 31, 0, 100);
  return {
    visible,
    entered: visible && before === 0,
    near: g.awareness >= 45 && before < 45,
    detected: g.awareness >= 100 && before < 100,
    recovered: g.awareness === 0 && before > 0,
  };
}
export function createEvent(seed: number, index: number): Event {
  const kinds: Event["kind"][] = ["SOUND", "LIGHT", "SHADOW"],
    kind = kinds[Math.floor(seedNoise(seed + index * 4) * 3)];
  return {
    id: index,
    x: 260 + seedNoise(seed * 3 + index) * 650,
    y: 80 + seedNoise(seed * 7 + index) * 430,
    kind,
    relevant: index % 3 === 0,
    life: 2.4,
    active: true,
  };
}
export function stepEvent(e: Event, dt: number) {
  e.life -= dt;
  if (e.life <= 0) e.active = false;
}
export const exitForRound = (round: number): Vec =>
  round === 1 ? { x: 942, y: 60 } : { x: 58, y: 60 };
export const atExit = (p: Player, exit: Vec = exitForRound(1)) =>
  Math.hypot(p.x - exit.x, p.y - exit.y) < 42;
