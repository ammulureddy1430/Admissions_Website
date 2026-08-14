import type { BallSortScores } from "./Types";

export type BallSortAnalyticsSink = (metrics: BallSortScores) => void | Promise<void>;

export class BallSortAnalyticsService {
  constructor(private readonly sink: BallSortAnalyticsSink) {}
  async save(metrics: BallSortScores) {
    await this.sink(metrics);
  }
}
