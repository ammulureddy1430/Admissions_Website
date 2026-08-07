import type { RawTrainMetrics, TrainTrackScores } from "./Types";

const TOTAL_ROUNDS = 4;
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));

export function scoreTrainTrack(raw: RawTrainMetrics): TrainTrackScores {
  const rotations = raw.correctRotations + raw.incorrectRotations;
  const logicalAccuracy = clamp(rotations ? raw.correctRotations / rotations * 100 : 0);
  const routeRate = raw.roundsPlayed ? raw.successfulRoutes / raw.roundsPlayed * 100 : 0;
  const difficulty = raw.highestDifficulty / TOTAL_ROUNDS * 100;
  const completionPercentage = clamp(raw.successfulRoutes / TOTAL_ROUNDS * 100);
  const averageCompletionTime = raw.completionTimes.length
    ? Math.round(raw.completionTimes.reduce((sum, time) => sum + time, 0) / raw.completionTimes.length)
    : 0;
  const logicalThinkingScore = clamp(logicalAccuracy * .55 + routeRate * .3 + difficulty * .15);
  const causeEffectScore = clamp(routeRate * .48 + logicalAccuracy * .32 + completionPercentage * .2);
  return {
    ...raw,
    averageCompletionTime,
    logicalAccuracy,
    logicalThinkingScore,
    causeEffectScore,
    completionPercentage,
    overallScore: clamp((logicalThinkingScore + causeEffectScore) / 2),
    completionStatus: raw.elapsedSeconds >= 119 || raw.successfulRoutes >= TOTAL_ROUNDS ? "COMPLETED" : "PARTIAL",
  };
}
