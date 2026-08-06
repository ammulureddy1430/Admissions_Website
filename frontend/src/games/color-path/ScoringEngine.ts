import type { ColorPathScores, RawColorPathMetrics } from "./Types";
import { COLOR_PATH_TOTAL_ROUNDS } from "./GameEngine";
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));
export function scoreColorPath(raw: RawColorPathMetrics): ColorPathScores {
  const selections = raw.correctSelections + raw.incorrectSelections;
  const accuracy = clamp(selections ? raw.correctSelections / selections * 100 : 0);
  const averageResponseTime = raw.responseTimes.length ? Math.round(raw.responseTimes.reduce((a, b) => a + b, 0) / raw.responseTimes.length) : 0;
  const difficulty = raw.highestDifficulty / COLOR_PATH_TOTAL_ROUNDS * 100; const completionPercentage = clamp(raw.roundsPlayed / COLOR_PATH_TOTAL_ROUNDS * 100);
  const visualRecognitionScore = clamp(accuracy * .82 + difficulty * .18);
  const observationScore = clamp(accuracy * .72 + difficulty * .18 + completionPercentage * .1);
  return { roundsPlayed: raw.roundsPlayed, correctSelections: raw.correctSelections, incorrectSelections: raw.incorrectSelections, averageResponseTime, observationAccuracy: accuracy, observationScore, visualRecognitionScore, highestDifficulty: raw.highestDifficulty, completionPercentage, overallScore: clamp(visualRecognitionScore * .5 + observationScore * .5), completionStatus: raw.roundsPlayed >= COLOR_PATH_TOTAL_ROUNDS ? "COMPLETED" : "INCOMPLETE", elapsedSeconds: raw.elapsedSeconds, endReason: raw.endReason };
}
