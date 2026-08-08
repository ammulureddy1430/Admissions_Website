import type { TrafficMetrics } from "./Types";
export class AnalyticsService { constructor(private sink: (metrics: TrafficMetrics) => void | Promise<void>) {} async save(metrics: TrafficMetrics) { await this.sink(metrics); } }
