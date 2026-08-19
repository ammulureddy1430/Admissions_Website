import type { Point } from "./Types";
export const ObstacleManager = { blocked: (point: Point, obstacles: Point[]) => obstacles.some(item => item.x === point.x && item.y === point.y) };
