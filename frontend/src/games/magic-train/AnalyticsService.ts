import type { MagicTrainScores } from "./Types";
export class MagicTrainAnalyticsService { constructor(private sink: (metrics: MagicTrainScores) => void | Promise<void>) {} async save(metrics: MagicTrainScores) { await this.sink(metrics); } }
