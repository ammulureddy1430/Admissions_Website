import type { GameMetrics, PackageSorterScores } from "./Types";

export function scorePackageSorter(
  metrics: GameMetrics,
  elapsedSeconds: number,
  durationSeconds: number
): PackageSorterScores {
  const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));

  const roundsPlayed = metrics.roundsPlayed;
  const packagesSorted = metrics.packagesSorted;
  const correctDeliveries = metrics.correctDeliveries;
  const incorrectDeliveries = metrics.incorrectDeliveries;
  
  // Calculate average decision time in milliseconds
  const averageDecisionTime = metrics.decisionTimes.length
    ? metrics.decisionTimes.reduce((sum, t) => sum + t, 0) / metrics.decisionTimes.length
    : 0;

  // Sorting Accuracy
  const sortingAccuracy = packagesSorted ? (correctDeliveries / packagesSorted) * 100 : 0;

  // Completion Percentage
  const completionPercentage = clamp((elapsedSeconds / durationSeconds) * 100);

  // 1. Organization Score: Evaluates sorting accuracy and rounds played completion
  // Weighted: 80% accuracy, 20% rounds completion
  const organizationScore = clamp(sortingAccuracy * 0.8 + (roundsPlayed / 5) * 20);

  // 2. Decision Making Score: Evaluates sorting speed/efficiency and accuracy
  // Quick decision baseline: <= 1200ms is perfect (100).
  // Slow decision baseline: >= 4000ms is minimum (30).
  const decisionSpeedScore = clamp(100 - Math.max(0, averageDecisionTime - 1200) / 15);
  // Weighted: 60% accuracy, 40% speed/efficiency
  const decisionMakingScore = clamp(sortingAccuracy * 0.6 + decisionSpeedScore * 0.4);

  // Overall Score
  const overallScore = clamp((organizationScore + decisionMakingScore) / 2);
  const completionStatus = elapsedSeconds >= durationSeconds - 1 || roundsPlayed >= 5 ? "COMPLETED" : "PARTIAL";

  return {
    roundsPlayed,
    packagesSorted,
    correctDeliveries,
    incorrectDeliveries,
    averageDecisionTime,
    highestDifficulty: metrics.highestDifficulty,
    completionPercentage,
    organizationScore,
    decisionMakingScore,
    overallScore,
    completionStatus,
    elapsedSeconds,
  };
}
