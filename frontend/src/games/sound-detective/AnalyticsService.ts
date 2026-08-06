import type { SoundDetectiveScores } from "./Types";

export type AnalyticsSink = (metrics: SoundDetectiveScores) => void | Promise<void>;

export class SoundDetectiveAnalyticsService {
  constructor(private readonly sink: AnalyticsSink) {}
  async save(metrics: SoundDetectiveScores) {
    await this.sink(metrics);
  }
}
