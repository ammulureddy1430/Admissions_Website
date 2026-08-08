import type { RoomDesignerScores } from "./Types";
export class RoomDesignerAnalyticsService {
  constructor(
    private sink: (metrics: RoomDesignerScores) => void | Promise<void>,
  ) {}
  async save(metrics: RoomDesignerScores) {
    await this.sink(metrics);
  }
}
