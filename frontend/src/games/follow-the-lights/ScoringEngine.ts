import type { CognitiveScores, RawGameMetrics } from "./Types";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export function scoreFollowLights(metrics: RawGameMetrics): CognitiveScores {
  const taps = metrics.correctTaps + metrics.wrongTaps;
  const accuracy = clamp(taps ? metrics.correctTaps / taps * 100 : 0);
  const completionPercentage = clamp(metrics.totalSequences ? metrics.completedSequences / metrics.totalSequences * 100 : 0);
  const averageReactionTime = Math.round(average(metrics.reactionTimes));
  const averageTapDelay = Math.round(average(metrics.tapDelays));
  const memoryScore = clamp(metrics.longestSequence / 10 * 100);
  const focusScore = clamp(accuracy * 0.72 + (3 - metrics.mistakes) / 3 * 28);
  const processingSpeed = clamp(100 - Math.max(0, averageReactionTime - 350) / 12);
  const learningPotential = clamp(memoryScore * 0.55 + completionPercentage * 0.45);
  const attention = clamp(focusScore * 0.65 + processingSpeed * 0.35);
  const visualMemory = clamp(memoryScore * 0.8 + accuracy * 0.2);
  const overallScore = clamp(memoryScore * 0.24 + focusScore * 0.18 + processingSpeed * 0.16 + learningPotential * 0.18 + accuracy * 0.12 + attention * 0.12);
  return { ...metrics, averageReactionTime, averageTapDelay, completionPercentage, memoryScore, focusScore, processingSpeed, learningPotential, accuracy, attention, visualMemory, overallScore };
}
