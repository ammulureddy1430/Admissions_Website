import type { Plane } from "./Types";
export class TrafficEngine {
  switches = 0;
  abandoned = 0;
  recovered = 0;
  lastPlane: string | null = null;
  select(plane: Plane) {
    if (this.lastPlane && this.lastPlane !== plane.id) this.switches++;
    if (this.lastPlane === plane.id && plane.state === "holding")
      this.recovered++;
    this.lastPlane = plane.id;
  }
  abandon() {
    this.abandoned++;
  }
}
