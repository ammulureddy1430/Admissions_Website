import type { RedLightGreenLightScores } from "./Types";

export type RedLightGreenLightAnalyticsSink = (metrics: RedLightGreenLightScores) => void | Promise<void>;

export class RedLightGreenLightAnalyticsService {
  constructor(private readonly sink: RedLightGreenLightAnalyticsSink) {}
  async save(metrics: RedLightGreenLightScores) {
    await this.sink(metrics);
  }
}
