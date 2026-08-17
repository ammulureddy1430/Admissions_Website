import type { DestinationColor, Gate, GateId } from "./Types";
const IDS: GateId[] = ["gateA", "gateB", "gateC", "gateD"],
  COLORS: DestinationColor[] = ["blue", "green", "red", "blue"];
export class GateEngine {
  gates: Gate[] = [];
  closures = 0;
  closureAdaptations = 0;
  nextClosure = 0;
  reset(w: number, h: number, count = 2, now = 0) {
    this.gates = IDS.slice(0, count).map((id, i) => ({
      id,
      x: w * (0.18 + (i * 0.64) / Math.max(1, count - 1)),
      y: h * 0.78,
      color: COLORS[i],
      temporarilyClosed: false,
      releaseAt: 0,
    }));
    this.nextClosure = now + 15000;
  }
  configure(w: number, h: number, count: number) {
    if (this.gates.length === count) return;
    const old = new Map(this.gates.map((g) => [g.id, g]));
    this.gates = IDS.slice(0, count).map((id, i) => ({
      ...old.get(id),
      id,
      x: w * (0.18 + (i * 0.64) / Math.max(1, count - 1)),
      y: h * 0.78,
      color: COLORS[i],
      temporarilyClosed: old.get(id)?.temporarilyClosed ?? false,
      releaseAt: old.get(id)?.releaseAt ?? 0,
    }));
  }
  update(
    now: number,
    closureChance: number,
    random: () => number = Math.random,
  ) {
    for (const gate of this.gates) {
      if (gate.occupiedBy && now >= gate.releaseAt) {
        gate.occupiedBy = undefined;
        gate.releaseAt = 0;
      }
      if (gate.temporarilyClosed && now >= gate.releaseAt) {
        gate.temporarilyClosed = false;
        gate.releaseAt = 0;
      }
    }
    if (closureChance && now >= this.nextClosure && random() < closureChance) {
      const options = this.gates.filter(
        (g) => !g.occupiedBy && !g.temporarilyClosed,
      );
      const gate = options[Math.floor(random() * options.length)];
      if (gate) {
        gate.temporarilyClosed = true;
        gate.releaseAt = now + 4000;
        this.closures++;
      }
      this.nextClosure = now + 10000;
    }
  }
  available(g: Gate) {
    return !g.occupiedBy && !g.temporarilyClosed;
  }
  assign(g: Gate, planeId: string, now: number) {
    g.occupiedBy = planeId;
    g.releaseAt = now + 3500;
  }
  byId(id: GateId) {
    return this.gates.find((g) => g.id === id);
  }
  valid(g: Gate, color: DestinationColor) {
    if (g.color === color) return true;
    return this.gates.some((x) => x.color === color && x.temporarilyClosed);
  }
}
