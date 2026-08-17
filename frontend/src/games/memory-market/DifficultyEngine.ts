import { levelAt } from "./Levels";

export class DifficultyEngine {
  get(elapsedMs: number) {
    return levelAt(elapsedMs);
  }
}
