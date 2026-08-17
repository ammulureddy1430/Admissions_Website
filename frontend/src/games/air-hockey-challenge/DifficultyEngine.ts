import { levelAt } from "./Levels";
export class DifficultyEngine {
  get(ms: number) {
    return levelAt(ms);
  }
}
