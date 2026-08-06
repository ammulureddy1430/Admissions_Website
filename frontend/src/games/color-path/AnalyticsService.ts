import type { ColorPathScores } from "./Types";
export class ColorPathAnalyticsService { constructor(private sink: (metrics: ColorPathScores) => void | Promise<void>) {} async save(metrics: ColorPathScores) { await this.sink(metrics); } }
