import { ColorPathGenerator } from "./PathGenerator";
import type { ColorPathRound, PathStone, RawColorPathMetrics } from "./Types";
export const COLOR_PATH_DURATION_SECONDS = 60;
export const COLOR_PATH_TOTAL_ROUNDS = 4;
export class ColorPathEngine {
  private roundNumber = 1; private generator = new ColorPathGenerator();
  current(): ColorPathRound { return this.generator.create(this.roundNumber); }
  next(): ColorPathRound { this.roundNumber += 1; return this.generator.create(this.roundNumber); }
  isCorrect(round: ColorPathRound, stone: PathStone) { return stone.color === round.target && !stone.shade && stone.fill === round.targetFill; }
  emptyMetrics(): RawColorPathMetrics { return { roundsPlayed: 0, correctSelections: 0, incorrectSelections: 0, responseTimes: [], highestDifficulty: 1, elapsedSeconds: 0, endReason: "TIME_LIMIT_REACHED" }; }
}
