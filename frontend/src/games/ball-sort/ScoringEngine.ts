import type { BallSortScores, RawBallSortMetrics } from "./Types";

const clamp = (value: number) => Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;

export function scoreBallSort(metrics: RawBallSortMetrics): BallSortScores {
  const sorting_accuracy = clamp(metrics.sorting_accuracy);
  const totalMoves = metrics.total_moves;
  const correctMoves = metrics.correct_moves;
  const incorrectMoves = metrics.incorrect_moves;
  const highestLevel = metrics.highest_level;
  const levelsCompleted = metrics.levels_completed;
  const efficiency = metrics.efficiency;

  const categorizationScore = sorting_accuracy;
  const visualDiscriminationScore = clamp(sorting_accuracy * 0.8 + (totalMoves ? (correctMoves / totalMoves) * 20 : 0));
  const cognitiveFlexibilityScore = clamp((highestLevel / 5) * 50 + (levelsCompleted / 5) * 50);
  const planningScore = clamp(efficiency * 100);
  const problemSolvingScore = clamp((levelsCompleted / 5) * 100);
  const decisionMakingScore = clamp(totalMoves ? (correctMoves / totalMoves) * 100 : 0);
  const attentionScore = clamp(100 - Math.min(50, incorrectMoves * 3));
  const fineMotorCoordinationScore = clamp(100 - Math.min(30, incorrectMoves * 2));

  const overallScore = clamp(
    (categorizationScore +
      visualDiscriminationScore +
      cognitiveFlexibilityScore +
      planningScore +
      problemSolvingScore +
      decisionMakingScore +
      attentionScore +
      fineMotorCoordinationScore) /
      8,
  );

  return {
    ...metrics,
    overallScore,
    completionStatus: metrics.completionStatus || "COMPLETED"
  };
}
