import type { Package } from "./Types";

export class ConveyorController {
  update(packages: Package[], speed: number): { updated: Package[]; missedPackage: Package | null } {
    let missedPackage: Package | null = null;
    const updated = packages.map((pkg) => {
      const nextProgress = pkg.progress + speed;
      if (nextProgress >= 100 && pkg.progress < 100) {
        missedPackage = pkg;
      }
      return {
        ...pkg,
        progress: Math.min(100, nextProgress),
      };
    });

    return {
      updated,
      missedPackage,
    };
  }
}
