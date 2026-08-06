import type { CognitiveScores } from "./Types";

export type AnalyticsSink = (metrics: CognitiveScores) => void | Promise<void>;

export class FollowLightsAnalyticsService {
  constructor(private readonly sink: AnalyticsSink) {}
  async save(metrics: CognitiveScores) { await this.sink(metrics); }
}
