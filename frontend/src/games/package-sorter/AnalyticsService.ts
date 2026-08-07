import type { PackageSorterScores } from "./Types";

export class PackageSorterAnalyticsService {
  constructor(private readonly onComplete: (metrics: PackageSorterScores) => void | Promise<void>) {}

  async save(scores: PackageSorterScores) {
    try {
      await this.onComplete(scores);
    } catch (err) {
      console.error("Failed to submit Package Sorter cognitive analytics:", err);
    }
  }
}
