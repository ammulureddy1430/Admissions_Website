import type { BallStackScores } from "./Types";
export type BallStackAnalyticsSink = (metrics: BallStackScores) => void | Promise<void>;
export class BallStackAnalyticsService {
  constructor(private readonly sink: BallStackAnalyticsSink) {}
  async save(metrics: BallStackScores) { await this.sink(metrics); }
}
