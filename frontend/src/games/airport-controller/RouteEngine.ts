import type { Gate, Plane, Point } from "./Types";
export class RouteEngine {
  conflicts = 0;
  route(plane: Plane, gate: Gate): Point[] {
    const midY = (plane.y + gate.y) * 0.5;
    return [
      { x: plane.x, y: midY },
      { x: gate.x, y: midY },
      { x: gate.x, y: gate.y - 34 },
    ];
  }
  efficiency(plane: Plane, gate: Gate) {
    const direct = Math.hypot(gate.x - plane.x, gate.y - plane.y);
    const route = this.route(plane, gate);
    let total = 0,
      point = { x: plane.x, y: plane.y };
    for (const next of route) {
      total += Math.hypot(next.x - point.x, next.y - point.y);
      point = next;
    }
    return Math.max(0, Math.min(100, (direct / Math.max(1, total)) * 100));
  }
  hasConflict(route: Point[], planes: Plane[]) {
    const busy = planes.some(
      (p) =>
        p.state === "taxiing" &&
        p.route.some((a) =>
          route.some((b) => Math.hypot(a.x - b.x, a.y - b.y) < 45),
        ),
    );
    if (busy) this.conflicts++;
    return busy;
  }
}
