import type { RawGameMetrics, SoundDetectiveScores } from "./Types";

const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));
const average = (values: number[]) => (values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0);

export function scoreSoundDetective(metrics: RawGameMetrics): SoundDetectiveScores {
  const totalResponses = metrics.correctResponses + metrics.incorrectResponses;
  const accuracy = clamp(totalResponses ? (metrics.correctResponses / totalResponses) * 100 : 0);
  const completionPercentage = clamp((metrics.elapsedSeconds / 120) * 100);
  const averageResponseTime = Math.round(average(metrics.reactionTimes));

  // Auditory Recognition Score: 70% accuracy + 30% difficulty progress
  const auditoryRecognitionScore = clamp(accuracy * 0.7 + (metrics.highestDifficulty / 5) * 30);

  // Listening Score: 60% accuracy + 40% completion rate (duration played)
  const listeningScore = clamp(accuracy * 0.6 + completionPercentage * 0.4);

  // Overall Score: equal balance
  const overallScore = clamp((auditoryRecognitionScore + listeningScore) / 2);
  const completionStatus = metrics.endReason === "TIME_LIMIT_REACHED" ? "COMPLETED" : "COMPLETED";

  return {
    ...metrics,
    averageResponseTime,
    listeningScore,
    auditoryRecognitionScore,
    completionPercentage,
    overallScore,
    completionStatus,
  };
}
