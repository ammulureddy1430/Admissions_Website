import type { BallStackScores, RawBallStackMetrics } from "./Types";
const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const clamp = (value: number) => Math.round(Math.max(0, Math.min(100, value)) * 10) / 10;
export function scoreBallStack(metrics: RawBallStackMetrics): BallStackScores {
  const successRate = metrics.totalBallsDropped ? metrics.successfulPlacements / metrics.totalBallsDropped * 100 : 0;
  const averageAlignment = clamp(avg(metrics.alignmentPercentages));
  const averageReactionTime = Math.round(avg(metrics.reactionTimes));
  const towerStabilityScore = clamp(avg(metrics.stabilityPercentages));
  const reactionSpeedScore = clamp(100 - Math.max(0, averageReactionTime - 650) / 22);
  const consistencyScore = clamp(100 - Math.sqrt(avg(metrics.alignmentPercentages.map((value) => (value - averageAlignment) ** 2))) * 1.6);
  const handEyeCoordinationScore = clamp(successRate * .45 + averageAlignment * .35 + reactionSpeedScore * .2);
  const fineMotorScore = clamp(averageAlignment * .52 + towerStabilityScore * .3 + consistencyScore * .18);
  const precisionScore = clamp(averageAlignment * .7 + (metrics.perfectPlacements / Math.max(1, metrics.totalBallsDropped) * 100) * .3);
  const concentrationScore = clamp(successRate * .45 + consistencyScore * .35 + Math.min(100, metrics.highestTowerHeight * 8) * .2);
  const patienceScore = clamp(Math.min(100, averageReactionTime / 18) * .35 + towerStabilityScore * .65);
  const timingAccuracyScore = clamp(reactionSpeedScore * .4 + averageAlignment * .6);
  const overallCognitiveScore = clamp(handEyeCoordinationScore * .23 + fineMotorScore * .2 + precisionScore * .18 + concentrationScore * .14 + patienceScore * .1 + reactionSpeedScore * .08 + consistencyScore * .07);
  return { ...metrics, averageAlignment, averageReactionTime, towerStabilityScore, handEyeCoordinationScore, fineMotorScore, precisionScore, concentrationScore, patienceScore, reactionSpeedScore, consistencyScore, timingAccuracyScore, overallCognitiveScore, completionStatus: metrics.endReason === "TOWER_COLLAPSED" ? "TOWER_COLLAPSED" : "COMPLETED" };
}
