import type { Package, Truck } from "./Types";

// Standard set of distinct trucks (Red, Blue, Green, Yellow)
export const DISTINCT_TRUCKS: Truck[] = [
  { id: 0, color: "red", icon: "🍎", name: "Apple Truck", hex: "#ef4444", bgColor: "bg-red-500/10" },
  { id: 1, color: "blue", icon: "🐠", name: "Fish Truck", hex: "#3b82f6", bgColor: "bg-blue-500/10" },
  { id: 2, color: "green", icon: "🌳", name: "Tree Truck", hex: "#22c55e", bgColor: "bg-green-500/10" },
  { id: 3, color: "yellow", icon: "⭐", name: "Star Truck", hex: "#eab308", bgColor: "bg-yellow-500/10" },
];

export class PackageGenerator {
  generate(round: number, trucks: Truck[]): Package {
    const id = Math.random().toString(36).substring(2, 9);
    const spawnTime = Date.now();

    // Select a target truck to match
    const targetTruckIndex = Math.floor(Math.random() * trucks.length);
    const targetTruck = trucks[targetTruckIndex];

    let color = targetTruck.color;
    let icon = targetTruck.icon;
    let name = targetTruck.name.replace(" Truck", "");

    if (round === 4) {
      // Mixed colors: Randomize package color independently of its icon!
      // This forces matching by icon rather than color, creating a Stroop-like cognitive test.
      const colors = ["red", "blue", "green", "yellow"];
      color = colors[Math.floor(Math.random() * colors.length)];
    }

    return {
      id,
      color,
      icon,
      name,
      progress: 0,
      spawnTime,
      decisionTime: null,
    };
  }

  getConveyorSpeed(round: number): number {
    switch (round) {
      case 1:
        return 0.15; // Slow & gentle
      case 2:
        return 0.23; // Faster
      case 3:
        return 0.20; // Medium (two packages visible)
      case 4:
        return 0.22; // Quick sorting with color/icon mismatch distractor
      default:
        return 0.18;
    }
  }

  getSpawnInterval(round: number): number {
    switch (round) {
      case 1:
        return 5000; // Large spacing
      case 2:
        return 4000;
      case 3:
        return 2800; // Two visible packages
      case 4:
        return 3200; // Fast mixed-color round
      default:
        return 4000;
    }
  }
}
