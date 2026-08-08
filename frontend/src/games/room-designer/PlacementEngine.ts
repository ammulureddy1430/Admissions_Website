import type { Furniture, Point } from "./Types";
export class PlacementEngine {
  distance(a: Point, b: Point) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  isAccurate(item: Furniture, position: Point) {
    return this.distance(item.target, position) <= 14;
  }
}
