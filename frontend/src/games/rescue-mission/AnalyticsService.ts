import type { RescueMissionScores } from "./Types";
export class AnalyticsService { constructor(private sink:(metrics:RescueMissionScores)=>void|Promise<void>){} async save(metrics:RescueMissionScores){await this.sink(metrics)} }
