import { CarriageManager } from "./CarriageManager";
import { DifficultyManager } from "./DifficultyManager";
import { TrainGenerator } from "./TrainGenerator";
import type { Carriage, TrainRound } from "./Types";
export const MAGIC_TRAIN_DURATION_SECONDS = 120;
export const MAGIC_TRAIN_TOTAL_ROUNDS = 3;
export class MagicTrainEngine {
  private difficulty = new DifficultyManager();
  private generator = new TrainGenerator(this.difficulty);
  private manager = new CarriageManager();
  round(): TrainRound {
    return this.generator.next();
  }
  accepts(round: TrainRound, index: number, item: Carriage) {
    return this.manager.matches(round.sequence[index], item);
  }
  advance() {
    this.difficulty.advance();
  }
}
