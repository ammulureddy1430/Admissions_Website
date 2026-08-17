import { PriorityEngine } from "./PriorityEngine";
import type { DestinationColor, Level, Plane } from "./Types";
const COLORS: DestinationColor[] = ["blue", "green", "red"];
export class PlaneEngine {
  planes: Plane[] = [];
  spawned = 0;
  completed = 0;
  nextSpawn = 0;
  constructor(
    public priority = new PriorityEngine(),
    private random: () => number = Math.random,
  ) {}
  reset(now = 0) {
    this.planes = [];
    this.spawned = 0;
    this.completed = 0;
    this.nextSpawn = now;
  }
  update(dt: number, now: number, level: Level, width: number, height: number) {
    if (now >= this.nextSpawn && this.active() < level.maxPlanes) {
      this.spawn(now, level, width, height);
      this.nextSpawn = now + level.arrivalMs * (0.85 + this.random() * 0.3);
    }
    for (const plane of this.planes) {
      if (plane.state === "arriving") {
        const distance = plane.arrivalX - plane.x;
        const arrivalSpeed = Math.max(level.speed, width * 0.16);
        plane.angle = distance >= 0 ? 0 : Math.PI;
        plane.x +=
          Math.sign(distance) * Math.min(Math.abs(distance), arrivalSpeed * dt);
        plane.y = height * 0.405;
        if (Math.abs(distance) < 3) {
          plane.x = plane.arrivalX;
          plane.state = "waiting";
        }
      } else if (plane.state === "waiting" || plane.state === "holding") {
        const direction = Number(plane.id.replace("plane-", "")) % 2 ? 1 : -1;
        plane.x += Math.sin(now / 650) * direction * 18 * dt;
        plane.y += Math.cos(now / 800) * 7 * dt;
        plane.x = Math.max(55, Math.min(width - 55, plane.x));
      } else if (plane.state === "taxiing") {
        const target = plane.route[plane.routeIndex];
        if (target) {
          const dx = target.x - plane.x,
            dy = target.y - plane.y,
            d = Math.hypot(dx, dy);
          plane.angle = Math.atan2(dy, dx);
          if (d < 4) plane.routeIndex++;
          else {
            const taxiSpeed = Math.max(level.speed * 1.45, width * 0.11);
            plane.x += (dx / d) * taxiSpeed * dt;
            plane.y += (dy / d) * taxiSpeed * dt;
          }
        } else plane.state = plane.validRoute ? "parked" : "holding";
      } else if (plane.state === "departing") {
        plane.angle = -Math.PI / 2;
        plane.y -= level.speed * 2 * dt;
      }
    }
    this.planes = this.planes.filter((plane) => plane.y > -80);
  }
  active() {
    return this.planes.filter((plane) => plane.state !== "departing").length;
  }
  depart(plane: Plane) {
    plane.state = "departing";
    plane.route = [];
    this.completed++;
    this.priority.complete(plane.priority);
  }
  private spawn(now: number, level: Level, width: number, height: number) {
    const fromLeft = this.spawned % 2 === 0;
    this.planes.push({
      id: `plane-${++this.spawned}`,
      x: fromLeft ? -100 : width + 100,
      y: height * 0.405,
      arrivalX: width * (0.27 + this.random() * 0.46),
      angle: fromLeft ? 0 : Math.PI,
      destination:
        COLORS[Math.floor(this.random() * Math.min(level.gateCount, 3))],
      symbol:
        level.memoryComplexity > 1 && this.random() < 0.45 ? "star" : "circle",
      state: "arriving",
      priority: this.priority.create(level.priorityChance),
      route: [],
      routeIndex: 0,
      spawnedAt: now,
      decisionAt: 0,
      indicatorUntil: now + (level.memoryComplexity > 1 ? 3500 : 7000),
    });
  }
}
