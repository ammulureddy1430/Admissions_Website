export type Vec = { x: number; y: number };
export type MovementPattern =
  "stationary" | "horizontal" | "vertical" | "orbit" | "wave";
export type Target = {
  id: number;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  speed: number;
  pattern: MovementPattern;
  phase: number;
  distance: number;
  hitFlash: number;
};
export type Arrow = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  active: boolean;
  trail: Vec[];
  aimPoint?: Vec;
  arrived?: boolean;
};
export type ShotRecord = {
  aimError: number;
  aimVariance: number;
  drawAmount: number;
  force: number;
  releaseTiming: number;
  hitDistance: number;
  ring: "center" | "outer" | "edge" | "miss";
  correctionTime: number;
};
export type ArcheryMetrics = Record<string, number | string> & {
  completionStatus: string;
};
